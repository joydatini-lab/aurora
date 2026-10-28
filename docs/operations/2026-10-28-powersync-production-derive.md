# PowerSync Production — dérive de config résorbée + incident de connexion (2026-10-27/28)

**Instance** : Production `6ab1612e8453e7cf8338ef9a` (org `6ab1609e88083500079d0b68`,
projet `6ab1612d6860dd00071fcc98`)

**Statut final mesuré** : `connected: true`, `errors: []`,
`initial_replication_done: true`, **33 tables servies**, `replication_lag_bytes: 0`.

> **Avertissement de méthode.** Une première version de ce document attribuait la panne à un
> « mauvais rôle / mauvais mot de passe » et proposait de basculer sur `postgres`. **C'était
> faux** : la mesure l'a contredit (voir §3.3). Le document conserve la trace de l'erreur
> d'analyse, pas seulement sa correction — une conclusion réfutée reste une donnée utile.

---

## 1. Résultat obtenu

| | Avant | Après |
|---|---|---|
| Config active prod | 31 tables ; `focus_profiles` et `discovery_vault` **absents** | **33 tables**, les deux flux présents |
| Écart config locale ↔ prod | 2 flux manquants | **diff vide** (hors commentaires) |
| Connexion | `connected: false`, `errors[0].level = "fatal"` | `connected: true`, `errors: []` |
| Réplication initiale | `initial_replication_done: false`, toutes les tables en erreur | `true`, **0** table en erreur |
| Slot | `_caf1` : `restart_lsn = null` (jamais utilisé) | `_b547` : actif, consomme du WAL, lag 0 |

Preuve du déploiement :

```
Target instance: Production id: 6ab1612e8453e7cf8338ef9a
✓ Validate Sync Config
All validation tests passed.
Deployment operation completed successfully!
```

Vérification post-déploiement
(`powersync fetch config --instance-id 6ab1612e8453e7cf8338ef9a --output=json`) :
`focus_profiles: True`, `discovery_vault: True`, 33 tables, `diff` vide contre
`powersync/sync-config.yaml`.

## 2. Chronologie mesurée (heures UTC, 2026-10-27 → 28)

| Heure | Événement | Mesure |
|---|---|---|
| 23:57 | Production **MORTE** | `connected: false`, `"postgres query failed"` ; slot `_b547` **tout juste créé** ; `initial_replication_done: false` ; toutes les tables en `"connection failed"` |
| ~00:05 | `powersync deploy` **sans `--instance-id`** (CLI 0.9.0) | A visé le **lien local = Development**. Development : `is_provisioned: false → true`, 11 flux. **Production : aucun changement** (vérifié : 6 119 octets, 12 `auto_subscribe`) |
| ~00:08 | `deploy sync-config --instance-id <prod>` (CLI 0.9.0) | Échec `PSYNC_S2001 / "postgres query failed"` |
| 00:12 | `powersync pull instance` (CLI 0.10.3) | Écrit `service-fetched.yaml` (`name: Production`) + `sync-fetched.yaml`, **sans écraser** le local |
| 00:14 | Slot Production `_b547` observé **ACTIF** | `active: true`, `restart_lsn = 4E/F4000068` |
| ~00:16 | `deploy sync-config --instance-id <prod>` (CLI 0.10.3) | **SUCCÈS** — 33 tables servies |

## 3. Cause racine : ce qui est établi, ce qui ne l'est pas

### 3.1 Établi

Production est passée de morte (23:57) à saine (00:14) **sans intervention de ma part sur sa
configuration**. Je n'ai jamais déployé de `service-config` vers Production. Le déploiement
que j'ai posé (`deploy sync-config`) est arrivé **après** le rétablissement — il a résorbé la
dérive de flux, il n'a pas réparé la connexion.

### 3.2 Hypothèse la plus cohérente (non prouvée)

À 23:57, Production était **en cours de redéploiement**. L'apparition d'un **nouveau** slot
(`_b547`, distinct de `_caf1`) à cet instant est la signature d'un cycle de provisionnement.
`"postgres query failed"` était donc l'état **transitoire** de ce cycle, pas une
configuration durablement fausse. `_caf1` (`restart_lsn = null`, jamais utilisé) est le slot
**abandonné** de l'instance précédente.

La cause exacte du déclenchement de ce cycle reste **inconnue** : redémarrage côté PowerSync
Cloud, rotation du mot de passe du rôle de réplication, ou provisionnement initial inachevé
depuis la création de l'instance. Aucune de ces trois pistes n'a été testée.

### 3.3 Réfuté par la mesure — à ne pas réécrire comme un fait

- ❌ **« Production se connecte en `postgres` »** — faux. La config réelle de Production
  utilise un rôle dédié : `username: powersync_e56673171470a907b5579e90`,
  `secret_ref: supabase_6ae13ca8b82cab873076ccd7_password`. C'est **Development** qui se
  connecte en `postgres` avec `secret_ref: default_password`. (Mon premier relevé lisait
  `fetch config --instance-id <prod>` **sans** `--project-id` avec le CLI 0.9.0, qui a
  silencieusement retombé sur le lien local — d'où la confusion.)
- ❌ **« Le rôle dédié n'existe pas »** — faux.
  `powersync_e56673171470a907b5579e90` existe : `rolcanlogin = true`,
  `rolreplication = true`, `rolbypassrls = true`.
- ❌ **« Le hostname direct est IPv6-only, donc injoignable »** — **non concluant**. Le DNS
  est bien IPv6-only (`db.opagfyspdbhxthlxvlrk.supabase.co` : aucun enregistrement `A`, un
  `AAAA` = `2a05:d018:175d:b600:cf05:4291:53eb:9c78` ; le pooler a des `A`), mais Production
  **se connecte** à ce même host. L'hypothèse n'est ni démontrée ni testée.

## 4. Deux vrais défauts, indépendants et **toujours ouverts**

### 4a. `REPLICA IDENTITY FULL` absent sur les 33 tables

Mesure : `select relreplident from pg_class` sur les 33 tables des flux → **0** en `'f'`.

Le dépôt connaît déjà l'exigence — `supabase/migrations/0018_keep_alive_heartbeat.sql:113-115`
écrit : *« Postgres exige `REPLICA IDENTITY FULL` pour DELETE sur une table publiée »* — mais
ne l'a appliquée qu'à `keep_alive`. Le skill
(`.agents/skills/powersync/references/supabase-auth.md:24`) l'exige pour **chaque** table :
*« Set `REPLICA IDENTITY FULL` on each table so that DELETE operations include the full row
(required for PowerSync to sync deletes to clients). »*

**Impact** : les suppressions ne peuvent pas être synchronisées vers les clients.
**Correctif** : migration `0033` (WS-A).

### 4b. Le fichier d'env du client est absent — bloquant

`apps/mobile/src/main.tsx:63-67` lit `import.meta.env.VITE_POWERSYNC_URL ?? ''` (idem
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

**Où Vite cherche ces variables** : `apps/mobile/vite.config.ts:68` pose `root: here`
(`here` = `apps/mobile`) et **aucun `envDir`** n'est défini. Vite lit donc
`apps/mobile/.env*` — **jamais** le `.env.local` de la racine du dépôt.

État mesuré :

- `apps/mobile/.env.local` : **absent**.
- `.env.local` (racine) : contient **uniquement** `POWERSYNC_TOKEN`.
- `grep -rn "POWERSYNC_TOKEN"` sur tout le code (`.ts`, `.tsx`, `.mjs`, `.sh`) : **aucun
  lecteur**. C'est une variable orpheline — elle ne configure rien.

La doc du dépôt le confirmait déjà : `docs/plans/finalisation-v1.md` (ligne 23, G10) décrit
exactement ce symptôme — *« `apps/mobile/.env.local` absent →
`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_POWERSYNC_URL` vides →
`createClient('')` = « supabaseUrl is required » »* — et le marque **RESOLVED le 2026-10-07**
par la création de `apps/mobile/.env.local`. Ce fichier a donc **disparu depuis** (il est
git-ignored : `.gitignore:18`, donc non versionné, donc non recréé par un `git clone`).

**Correctif** — créer `apps/mobile/.env.local` (git-ignored, AD-3 : publishable only) :

```
VITE_SUPABASE_URL=https://opagfyspdbhxthlxvlrk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publishable du projet>
VITE_POWERSYNC_URL=https://6ab1612e8453e7cf8338ef9a.powersync.journeyapps.com
```

**Précision sur l'authentification** : le client ne se sert **pas** de `POWERSYNC_TOKEN`. Il
envoie le **JWT de session Supabase** (`packages/data/src/supabase-connector.ts:81-88` →
`session.access_token`), ce qui est cohérent avec `client_auth: { supabase: true }`. Un
`POWERSYNC_TOKEN` invalide n'empêcherait donc rien de toute façon : ce chemin de code ne le
lit pas.

**Vérifié et conforme** : `packages/data/src/powersync-schema.ts` déclare bien les **33**
tables, `focus_profiles` et `discovery_vault` inclus. Le schéma client n'a **pas** de retard —
contrairement à ce que laissait craindre la dérive de config.

## 5. Dérive de gouvernance — le vrai enseignement durable

Trois pièges qui ont rendu la panne difficile à lire :

1. **Aucune config Production n'est versionnée.** `find . -name service.yaml` → un seul
   fichier, dont le `name` est `Development`. La config de Production ne vit que dans le
   Cloud : sa dérive est **invisible** en revue de code.
   Correctif : porte `scripts/check-powersync-config.mjs` (WS-C).
2. **`powersync/service.yaml:4` cite un mauvais ID d'instance.** Le commentaire dit
   `Development (6ab1612e8453e7cf8338ef9a)` — or `6ab1612e…` est **Production**.
   Development est `6ab1612f02481fb31b986822`.
3. **`powersync/cli.yaml` pointe Development.** Un `powersync deploy` **sans**
   `--instance-id` vise donc Development. C'est exactement ce qui s'est produit ici.

**Règle à retenir** : sur ce dépôt, **toujours** passer `--instance-id` explicitement à
`powersync deploy`. Ni le lien local ni les commentaires de `service.yaml` ne sont fiables.

## 6. Actions restantes

| # | Action | Qui |
|---|---|---|
| 1 | Créer `apps/mobile/.env.local` avec les 3 `VITE_*` (§4b) — **pas** à la racine | opérateur |
| 2 | Appliquer la migration `0033` (`REPLICA IDENTITY FULL`) via le pipeline | opérateur |
| 3 | Corriger `powersync/service.yaml:4` (mauvais ID d'instance) et y documenter le rôle réel de Production | à faire |
| 4 | Versionner une config Production (ou rendre la dérive visible en CI) | à faire |
| 5 | Ouvrir un ticket PowerSync Cloud si la connexion retombe, en joignant le `trace_id` | opérateur |
