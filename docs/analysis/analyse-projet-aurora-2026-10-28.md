# Aurora — Analyse technique du projet

> **⚠️ MISE À JOUR 2026-10-28 — décision produit : voie web uniquement.** La voie mobile (Android/Capacitor) est abandonnée. Ce diagnostic reste valide sur l'architecture, la sécurité et la gouvernance, mais **la priorisation change** : voir **`docs/analysis/voie-web-2026-10-28.md`** pour la réévaluation web-only, les 4 blocages réels du build web et le plan d'exécution. En résumé : les points P0 de sécurité (§5.1, §5.2) sont **aggravés** par une exposition web ; le constat §6.4 (release APK) devient sans objet ; les §4.2 (budget APK) et §6.5 (config Capacitor) sont requalifiés.

---

> **Date :** 2026-10-28 · **Branche :** `arena/fa2fed09-aurora` · **HEAD :** `07d70a6` (« Add files via upload »)
> **Méthode :** lecture du tree + exécution réelle des portes qualité (install, typecheck, lint, tests, gates statiques, build). Chaque affirmation est soit **[mesuré]** (commande exécutée, sortie reproductible), soit **[lu]** (fichier:ligne), soit **[déclaré]** (affirmé par une doc, non vérifiable).
> **Règle appliquée :** en cas de divergence, **le tree gagne sur les docs**.
> **Complément :** ce rapport actualise `docs/analysis/analyse-projet-aurora.md` (2026-10-09/10, HEAD `812b88a`), qui reste valable sur l'architecture mais dont 2 constats majeurs ont changé (voir §7).

---

## 1. Synthèse exécutive

**Aurora** est une suite personnelle « productivité + apprentissage + orchestration agentique », Phase 1 **mobile Android** (Ionic React + Capacitor), local-first (PowerSync/SQLite), backend Supabase, IA côté serveur.

**Ce n'est pas un squelette.** Le contenu est réel : **45 fichiers d'écrans**, **38 routes** enregistrées, **~76 800 lignes de code maison**, **682 cas de test** qui s'exécutent (+ 7 suites `data` à assertions), **28 migrations SQL** avec RLS effective, une architecture hexagonale **réellement** respectée dans les packages. Le design technique est d'un niveau nettement supérieur à la moyenne.

**Mais la chaîne de preuve est cassée.** Les portes qualité annoncées comme bloquantes ne permettent pas de garantir l'état du produit :

| Ce que le README/AI_RULES affirme | Ce que la machine dit |
|---|---|
| « `pnpm install` / `typecheck` / `lint` doivent passer depuis un checkout propre » | **`lint` ne démarre pas**, `typecheck` échoue, `tsc -b` échoue sur ~40 erreurs |
| « v0.1.0 RC, waves 0→7 livrées, 236 tests » | **682 tests verts** (+7 suites `data`), mais **l'app ne compile pas** (`vite build` en échec) |
| « `git log` = vérité au commit, tags `wave{N}/agent` » | **1 seul commit, 0 tag, 0 historique** |
| « `release.yml` → APK + notes » | Le step « Build the mobile app (Capacitor APK) » exécute **`tsc --noEmit`** — aucune APK n'est produite |

**Verdict en une phrase :** l'ingénierie *conceptuelle* est excellente et le code produit est substantiel, mais la **gouvernance automatisée est décorative** et **trois portes critiques sont rouges** — dont deux failles de sécurité qui interdiraient une mise en production immédiate.

### Les 6 constats majeurs

| # | Constat | Sévérité |
|---|---|---|
| 1 | `fn-dev-auth` : Edge Function **non authentifiée** exposant `list-users`, `set-password`, `recreate`, `test-signin` sur le projet **de production** (`CORS: *`) | 🔴 **P0** |
| 2 | **Identifiants dev en clair** dans le code et la doc (`dev.aurora@joynasssi.dev` / `<mot-de-passe-en-clair>`) + IDs utilisateurs live — AD-3 violé, non détecté par le gate G2 | 🔴 **P0** |
| 3 | **L'app ne compile pas** : `@capacitor/preferences` importé mais non déclaré ; `@capacitor/core` non déclaré côté `packages/platform` | 🔴 **P0** |
| 4 | **`pnpm lint` ne démarre pas** (`eslint-plugin-storybook` absent du root) → **toutes** les règles de frontière AD-1/AD-6/AD-10 sont inappliquées | 🟠 P1 |
| 5 | Le gate **G2 « secrets en clair »** est **rouge sur faux positifs** (`sk-capacite-portante`, `sk-progress`) et **aveugle** sur les vrais secrets | 🟠 P1 |
| 6 | **Aucune traçabilité** : 1 commit global, 0 tag ; le modèle « 1 story = 1 commit = 1 rollback » est inapplicable | 🟠 P1 |

---

## 2. Ce qu'est le projet

### 2.1 Produit [lu]

Application unique agrégeant :

- **Productivité** — tâches/sous-tâches, Eisenhower, calendrier multi-vues, habitudes (streaks), routines, comptes à rebours, revues (jour/semaine/mois), projets (Kanban/Gantt/Timeline/Liste).
- **Apprentissage** — FSRS (répétition espacée), QCM, récupération active, arbre sémantique, miroir cognitif, import de cours.
- **Objectifs & progression** — Dynamic Goal Engine, preuves de progression, trajectoires ; `packages/progress` est l'unique producteur (F-07).
- **Agent IA** — Agent Kernel (intent → contexte → plan → capacités → exécution → vérification), artefacts, canvas, bibliothèque, connecteurs, skills marketplace.
- **Focus** — Pomodoro/chrono, blocklist, DPC Android.
- **Découverte** — veille multi-sources, analyse d'écarts, vault.

### 2.2 Architecture [lu]

Monorepo pnpm, **19 packages + 3 apps** :

```
packages/domain        SSoT de types (n'importe RIEN)          — 23 fichiers, 3 110 l.
packages/data          PowerSync/SQLite, repos, sync           — 28 f.,  4 994 l.
packages/ui            Design System + 5 renderers AD-10       — 544 f., 146 104 l.
packages/platform      Adapters Capacitor (seule surface native)— 10 f.,   846 l.
packages/agent         Agent Kernel + couche Vercel AI SDK      — 47 f., 10 540 l.
packages/{productivity,learning,goal-engine,progress,
          discovery,focus,ascent,workflows,integrations,
          scientific-engine}   tranches verticales             — ~22 000 l.
packages/engineering-* 4 packages « décomposition »            — 147 l. AU TOTAL
apps/mobile            Ionic + Capacitor + 45 écrans           — 159 f., 35 205 l.
apps/server            6 lignes (stub)
apps/desktop           Electron (Phase 2 annoncée)             — 61 l.
supabase/              28 migrations + 9 Edge Functions
```

Les invariants déclarés (AD-1 vendors confinés, AD-6 split data, AD-10 moteurs viz uniquement dans `ui`, AD-15 SSoT unique) sont **respectés dans les packages** : `G1` (vendor hors adapters) et `G4` (DOM dans agent) passent. C'est vérifié, pas seulement affiché.

---

## 3. Cartographie mesurée [mesuré]

| Métrique | Valeur |
|---|---|
| Fichiers suivis (hors `.git`/`node_modules`) | 3 249 |
| Taille suivie par git | **88,9 Mo** |
| Lignes TS/TSX totales | 222 974 |
| dont **code vendorisé** (`reui` 71 255 + `assistant-ui` 25 945) | **97 200 l. (66 % de `packages/ui`)** |
| dont code maison packages (hors ui) | 41 598 |
| dont `apps/mobile` | 35 205 |
| **Code maison total** | **≈ 76 800 lignes** |
| Tests | 99 fichiers, 17 101 lignes, **682 cas** exécutés (node:test) + 48 (vitest) + 7 suites `data` |
| Documentation | **443 fichiers `.md`, 69 454 lignes** (hors `anthropic-skills/`) |
| Ratio doc / code maison | **≈ 0,9 : 1** |
| Migrations SQL | 28 fichiers + 1 dossier `0021_lots/` (65 fichiers, **12 Mo**) |
| Edge Functions | 9 dossiers (dont `_shared`), 3 634 lignes |
| Historique git | **1 commit, 0 tag, 2 branches** |

Deux déséquilibres structurent la dette :

1. **Le ratio documentation / code est proche de 1:1.** Sur un projet dont la doc se veut « prescriptive », c'est le signe d'une production documentaire qui a dépassé la capacité à la maintenir synchronisée — et de fait, elle ne l'est pas (§7).
2. **Deux tiers de `packages/ui` sont du code importé** (registre `reui` + `assistant-ui`), pas du design system maîtrisé. Le « design system Aurora » possède donc une surface de maintenance externe non tracée (aucun fichier d'upgrade/CHANGELOG de vendor).

---

## 4. État réel des portes qualité [mesuré]

Toutes les commandes ont été exécutées sur ce checkout, Node v22.22.3, pnpm 10.28.0, 1 527 paquets installés.

| Gate annoncé | Commande | Résultat réel |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | ⚠️ **OK mais** `electron` postinstall échoue (TLS) → il faut `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. `WARN` : **dépendances cycliques** `engineering-adapters ↔ scientific-engine` |
| Typecheck | `pnpm typecheck` | ❌ **52 erreurs** dans `packages/ascent` (TS7006 ×31, TS6305 ×8, TS18048 ×7, TS2304 ×6) — le run récursif s'arrête là |
| Typecheck racine | `npx tsc -b` | ❌ **~40 erreurs** : lib DOM/Node absente, TS5096 (`allowImportingTsExtensions` + emit), TS5056 (doublons de sortie), + **8 projets non référencés** |
| Lint | `pnpm lint` | ❌ **ne démarre pas** — `Cannot find package 'eslint-plugin-storybook'` |
| Tests | `pnpm test` | ⚠️ **682 pass / 2 fail** — `platform` (0/1) et `focus` (12/1), même cause : `@capacitor/core` |
| Build app | `pnpm --filter @aurora/mobile build:web` | ❌ `Rollup failed to resolve import "@capacitor/preferences"` (puis OOM sandbox, §4.2) |
| Boundaries G1–G4 | `sh scripts/check-boundaries.sh` | ❌ **exit 1** — G2 faux positifs |
| RLS statique | `sh scripts/check-rls.sh` | ✅ 28 migrations, ENABLE RLS + FORCE RLS + 0 policy permissive |
| View-joins | `node scripts/check-view-joins.ts` | ✅ 88 `.sql`, 0 JOIN inter-module |
| Release APK | `.github/workflows/release.yml` | ❌ **aucune APK produite** (§6.4) |

**Trois gates sur quatre sont rouges** ; celui qui passe (RLS) est le seul à ne pas dépendre du code applicatif.

### 4.1 Détail du typecheck

```
packages/ascent/src/adapter.ts(103,18): error TS2304: Cannot find name 'structuredClone'.
packages/ascent/src/path-builder.ts(94,69): error TS18048: 'budget' is possibly 'undefined'.
packages/ascent/src/adapter.ts(18,8): error TS6305: Output file '.../domain/dist/index.d.ts'
                                       has not been built from source file ...
```

Quatre causes distinctes, toutes corrigeables en < 1 jour :

1. `lib: ["ES2022"]` seul → `structuredClone` (ES2022 runtime, mais typé via DOM/Node) introuvable ;
2. `noUncheckedIndexedAccess: true` + lecture de `budget` sans garde ;
3. **références de projet non construites** : `tsc --noEmit` par package ne peut pas résoudre `packages/domain` sans `tsc -b` préalable — c'est exactement ce que `TS6305` dit. Le `typecheck` par package et le `tsc -b` racine sont **incompatibles** ;
4. le `tsconfig.json` racine **n'inclut que 14 des 22 projets** : `ascent`, `discovery`, `focus`, `learning`, `productivity`, `progress`, `workflows`, `apps/desktop` ne sont dans aucune référence. Le README annonce « `tsc -b` across all 19 packages + 2 apps » — **faux**.

### 4.2 Détail du build

Après ajout **temporaire** des deux dépendances manquantes (test effectué puis reverté, `git status` propre) :

```
✓ 17050 modules transformed.
Killed            (exit 137 — OOM)
```

Le sandbox dispose de 3,8 Go de RAM / 2 vCPU : l'échec mémoire est **imputable à l'environnement**, pas nécessairement au projet. Mais **17 050 modules transformés** pour une app mobile-first est un signal de bundle lourd (Ionic + AG Grid + FullCalendar + AntV + React Flow + KaTeX + assistant-ui), à confronter au budget annoncé de **300 Ko gz** — budget **invérifiable ici** faute de build abouti. À rejouer sur un runner ≥ 7 Go.

---

## 5. Sécurité

### 5.1 🔴 `fn-dev-auth` — backdoor admin non authentifiée

`supabase/functions/fn-dev-auth/index.ts` (160 lignes) :

```ts
const corsHeaders = { "Access-Control-Allow-Origin": "*", ... };   // ligne 20
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");    // ligne 25

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const body = await req.json();            // aucune vérification d'identité
  const action = String(body["action"]);
  switch (action) {
    case "list-users":   // GET /auth/v1/admin/users → renvoie TOUS les emails (l. 46-77)
    case "recreate":     // POST /auth/v1/admin/users (email_confirm: true) (l. 79-115)
    case "set-password": // PATCH /auth/v1/admin/users/{id} ⚠️ (l. 117+)
    case "test-signin":  // POST /auth/v1/token?grant_type=password (l. 117-160)
  }
});
```

- **Aucun contrôle d'accès** : pas de JWT, pas de secret partagé, pas de vérification d'origine.
- **CORS `*`** : n'importe quel site web peut l'appeler depuis un navigateur.
- **`verify_jwt=false`** est mentionné en commentaire (l. 14) et **n'est déclaré nulle part** dans `supabase/config.toml`.
- Les actions utilisent la **service role key** : `list-users` divulgue tous les emails, `set-password` permet de **réinitialiser le mot de passe de n'importe quel utilisateur** → prise de contrôle de compte.

Aggravant : l'URL de production de cette fonction est **codée en dur dans l'app cliente** :

```ts
// apps/mobile/src/pages/login/index.tsx:51
const DEV_EF_URL = 'https://opagfyspdbhxthlxvlrk.supabase.co/functions/v1/fn-dev-auth';
```

L'app distribuée documente donc elle-même l'endpoint à attaquer.

### 5.2 🔴 Identifiants en clair dans le tree

```ts
// apps/mobile/src/pages/login/index.tsx:52-55
const DEV_ACCOUNTS: Record<string, string> = {
  'dev.aurora@joynagassi.dev': '<mot-de-passe-en-clair>',
  'dev.aurora2@joynagassi.dev': '<mot-de-passe-en-clair>',
};
```

Présents aussi en clair dans `docs/plans/finalisation-v1.md:56`, avec les **UUID utilisateurs live** (`ecc9106d…`, `6b1beaf1…`). Le garde-fou `import.meta.env.DEV` protège l'*affichage* du bouton (l. 346), **pas** le contenu du fichier ni les constantes.

### 5.3 🟠 Le gate de secrets est à la fois aveugle et bruyant

`scripts/check-boundaries.sh` (G2) cherche `sk-[A-Za-z0-9]{8,}`, `gsk_`, `cfut_`, `Bearer …`, `API_KEY=…` :

- **Faux positifs** qui rendent le gate rouge en permanence :
  `sk-capacite-portante` (fixtures de test), `sk-progress` / `sk-dashboard-header` (classes CSS) → **[gate ignoré par l'équipe, donc inutile]** ;
- **Faux négatifs** : ne détecte **ni** les mots de passe littéraux (§5.2), **ni** une URL Supabase de production, **ni** les UUID utilisateurs.

Un gate toujours rouge cesse d'être lu : il ne protège plus rien.

### 5.4 Ce qui est solide

- ✅ **Aucune `service_role` côté client** (`apps/mobile`, `packages/*`) ; aucune clé JWT en dur.
- ✅ **RLS** : `ENABLE ROW LEVEL SECURITY` sur toutes les tables, `FORCE RLS` sur `service_role`, **0 policy permissive** — vérifié sur 28 migrations.
- ✅ **Vues PowerSync** : 88 `.sql` scannés, **0 JOIN inter-module** (F-03 tenu).
- ✅ Canal interne `fn-canvas` correctement protégé (`x-aurora-internal` + `INTERNAL_FN_SECRET` + JWT user).
- ⚠️ **Dépendances** : `pnpm audit --prod` → **23 vulnérabilités high, 33 moderate, 9 low, 0 critical** (zod, d3-color, source-map-js, extract-zip, @tiptap/core, react-router, undici).

---

## 6. Constats détaillés (hors sécurité)

### 6.1 🟠 Le lint ne s'exécute pas → toutes les frontières sont décoratives

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'eslint-plugin-storybook'
imported from /home/user/aurora/eslint.config.js
```

Cause : le plugin est déclaré **uniquement dans `packages/ui/package.json:157`**, alors que `eslint.config.js` est à la racine et l'importe à sa ligne 2. La résolution ESM se fait depuis le fichier de config → `node_modules/` racine → absent.

**Conséquence en cascade** : `pnpm lint` échoue sur le premier package, et **aucune** des règles `no-restricted-imports` (AD-1 vendors, AD-10 moteurs, AD-15 SSoT) n'est évaluée. L'architecture est donc protégée **par discipline humaine**, pas par la CI.

### 6.2 🟠 Le trou `.tsx` est toujours ouvert et massif

`eslint.config.js` ne définit ses règles que sur des motifs `**/*.ts` :

```js
files: ['packages/domain/**/*.ts'],           // l. 92
files: ['packages/ui/**/*.ts'],               // l. 132
files: ['packages/{domain,ui}/**/*.ts', 'apps/mobile/**/*.ts'],  // l. 170
files: ['packages/agent/**/*.ts'],            // l. 219
```

**565 fichiers `.tsx`** (495 dans `packages/ui`, 70 dans `apps/mobile`) échappent à AD-1 / AD-6 / AD-10 — c'est-à-dire **quasiment toute l'UI**. Le constat de l'analyse du 2026-10-09 est **toujours valide** à HEAD.

### 6.3 🟠 Faux packages et doc qui les décrit comme livrés

| Élément | Réalité | Ce que dit `AI_RULES.md` §3 |
|---|---|---|
| `packages/engineering-core` | `export {};` — **5 lignes** | « Problem IR, 6 registries, deterministic solvers » |
| `packages/engineering-solvers` | `export {};` — **5 lignes** | idem |
| `packages/engineering-registry` | `export {};` — **5 lignes** | idem |
| `apps/server` | `export {};` — **6 lignes** | « server-side kernel/AI/jobs bundle entry » |

`packages/engineering-adapters` (132 lignes) est le seul des quatre à contenir du code — et il est **en dépendance cyclique** avec `scientific-engine`. Par ailleurs, **312 marqueurs** `skeleton`/`TODO`/`not implemented` parsèment `packages/` et `apps/`.

### 6.4 🟠 Le workflow de release ne produit pas de release

```yaml
# .github/workflows/release.yml:116-123
- name: Build the mobile app (Capacitor APK, docs/release/README S2.3)
  run: pnpm -r exec tsc --noEmit
  # TODO(wave7/OQ-03): wire the Capacitor build (npx cap build android)
  # + the signed APK artifact when the keystore secret ... is provisioned.
```

Le job s'appelle « Build the mobile app (APK) » mais **ne construit rien** : pas de `vite build`, pas de `npx cap sync`, pas de Gradle, pas d'artefact. Le job suivant crée une GitHub Release avec **`RELEASE_NOTES.md` uniquement** — l'`files:` liste l'APK en commentaire. Autrement dit : **à ce jour, taguer `v0.1.0` produirait une release sans application**. De plus le `tsc --noEmit` qu'il exécute est déjà rouge (§4.1).

### 6.5 🟠 Drift de configuration Supabase

`supabase/config.toml` déclare :

```toml
[pg_cron]
fsrs-tick-daily = "0 6 * * *"        # ❌ [pg_cron] n'existe pas dans le schéma Supabase
                                      #    (les crons se créent en SQL → migration 0014)
[functions.fn_job_dispatcher]         # ❌ dossier réel = fn-job-dispatcher (tirets)
[functions.fn_import_course]          # ❌ fn-import-course
[functions.fn_notifications]          # ❌ fn-notifications
[functions.fn_agent_run]              # ❌ fn-agent-run
[functions.fn_canvas]                 # ❌ fn-canvas
```

- **Underscores vs tirets** : les 5 blocs ne correspondent à aucun dossier → réglages inopérants ;
- **5 blocs pour 9 fonctions** : `fn-dev-auth`, `fn-integrations`, `fn-skills` ne sont pas déclarées ;
- **`verify_jwt` jamais défini** → la sécurité des fonctions dépend de réglages faits « à la main » dans le dashboard, donc **hors du dépôt et non reproductible**.

### 6.6 🟠 Traçabilité nulle

```
$ git log --all --oneline | wc -l
1
$ git tag | wc -l
0
$ git branch -a
* arena/fa2fed09-aurora
  main
```

`AI_RULES.md` §1 ordonne : « **git log** — commit-level truth (each wave is tagged `wave{N}/{agent}: …`) » et `docs/ci/gate.md` impose « **1 story = 1 commit = 1 rollback** ». Le dépôt contient **un commit unique « Add files via upload »**, sans tag ni branche de vague. Toute la gouvernance de rollback et d'audit est donc **inapplicable** : on ne peut ni bisecter, ni réverter une story, ni dater une livraison.

### 6.7 🟠 Une doc qui se déclare SSoT de l'état… et qui dérive

Divergences vérifiées entre `AI_RULES.md`/README et le tree :

| Affirmation | Réalité mesurée |
|---|---|
| « 24 migrations (`0001…0023`) » | **28 migrations** `0001…0027` + `0200_…` |
| « 6 Edge Functions » | **9 dossiers** (dont `_shared`) |
| « 236 unit tests pass / 0 fail » | **682 cas verts**, mais **2 suites en échec** |
| « `pnpm typecheck` = `tsc -b` sur 19 packages + 2 apps » | `tsc --noEmit` par package ; `tsc -b` **n'inclut que 14 projets** |
| « the working tree has delivered waves 0 → 7 » | **1 commit**, aucune trace d'itération |
| `app/server` = « server kernel/AI/jobs bundle entry » | **6 lignes, `export {}`** |
| « 19 packages » | 19 déclarés, dont **4 ne contiennent aucun code** |

Le paradoxe : `AI_RULES.md` contient une section « **⚠️ Doc-lag warning** » qui accuse *les autres* documents d'être en retard — alors que ce fichier est lui-même en retard sur au moins **7 points** vérifiables. Un document qui se proclame source de vérité sans mécanisme de vérification automatique dérive nécessairement.

### 6.8 🟡 Hygiène de dépôt

- **12 Mo / 65 fichiers** de « lots » SQL versionnés dans `supabase/migrations/0021_lots/` (dont `_all.sql` de 6 Mo) : ce sont des artefacts de génération, pas des migrations.
- **Collision de préfixe** : `0021_lots/` (dossier) **et** `0021_marketplace_skills.sql` → ordre d'application ambigu pour un outil qui trie par nom.
- **`0200_aurora_wave0_schema_applied.sql`** hors séquence : intentionnel ? documenté nulle part.
- **Assets dupliqués** : `images/` (18 Mo / 193 fichiers) ≈ `.stitch/images/` ≈ `apps/mobile/public/themes/`, tous suivis.
- **`anthropic-skills/`** (12 Mo, 992 fichiers) : snapshot de curation sans code applicatif, versionné tel quel.
- **`pack/`** (11 Mo dont 128 captures) : matière produit, pas du logiciel livré.

Sur 88,9 Mo suivis, **≈ 45 Mo sont des images et des artefacts**, ce qui pèsera sur chaque clone et sur la CI.

### 6.9 🟡 Dettes ciblées

| Dette | Mesure |
|---|---|
| `apps/mobile/src/styles/data.css` | **4 442 lignes / 132 Ko** de CSS manuel/581 sélecteurs — en contradiction avec « tout passe par les tokens » |
| `packages/discovery/src/vault.ts:323` | `await import('node:crypto')` dans un module **embarqué dans le bundle navigateur** → Vite l'externalise ; `computeVaultHash()` jetterait à l'exécution sur device |
| Root `pnpm build` | ignore `apps/mobile` : le package **n'a pas de script `build`** (seulement `build:web`) → `pnpm -r build` réussit sans jamais construire l'app |
| `console.log` en code de prod | 66 occurrences |
| `catch {}` vides | 3 |
| `any` / `@ts-ignore` | **22** / **1** — excellent pour ~77 000 lignes |
| `vitest.config.ts` racine | absent → le step CI « Tests (vitest) » est **skippé** par `if: hashFiles(...)` |

---

## 7. Ce qui est réellement solide

Il faut le dire nettement, car le reste du rapport est sévère :

1. **L'hexagone est vrai.** `packages/domain` n'importe rien et ne déclare aucun vendor ; `G1` (vendors hors adapters) et `G4` (DOM dans l'agent) passent sur le code réel, pas sur des placeholders.
2. **Les tests sont substantiels, pas cosmétiques.** 17 101 lignes : invariants single-writer, server-wins, CRDT OR-Set, round-trip PowerSync, scénarios DPC, budgets perf, 19 suites de « wiring » côté mobile. Ce sont des tests de comportement avec fixtures, non des `expect(true).toBe(true)`.
3. **La sécurité de la donnée est bien conçue** : `FORCE ROW LEVEL SECURITY` sur `service_role`, zéro policy permissive, zéro JOIN inter-module dans 88 vues PowerSync. C'est rare et c'est vérifié.
4. **Le produit existe.** 45 écrans, 38 routes (Home, Tasks, Goals, Learn, Progress, Agent ×3, Canvas, Knowledge, Inbox, Calendar, Projects, Habits, Routines, Reviews, Retro, Countdown, Discovery ×3, Skills, Integrations, Login, Onboarding, Settings…), 6 états UX + état « killed », empty-states avec CTA, offline-first.
5. **Discipline de typage** : `strict` + `noUncheckedIndexedAccess`, 22 `any` sur ~77 000 lignes, 1 `@ts-ignore`.
6. **La qualité de commentaire est exceptionnelle** : chaque fichier cite sa décision (AD-x), sa source doc (§, OQ), et son invariant. C'est la meilleure partie du dépôt — et c'est aussi ce qui rend le décalage doc/code si dommageable.

**Conclusion honnête :** ce projet n'a pas un problème de conception, il a un problème de **preuve**. Le code mérite mieux que la CI qui le surveille.

---

## 8. Plan d'action priorisé

### Sprint 0 — Sécurité (1 jour, bloquant toute mise en ligne)

1. **Neutraliser `fn-dev-auth`** : supprimer la fonction, ou la conditionner à `ALLOW_DEV_AUTH=true` + secret `INTERNAL_FN_SECRET` + allowlist d'emails, et **interdire le refus silencieux** : si l'env var manque, renvoyer 404.
2. **Purger les identifiants** : retirer `DEV_ACCOUNTS` de `apps/mobile/src/pages/login/index.tsx`, l'URL de production codée en dur, et la ligne de `docs/plans/finalisation-v1.md`. **Rotationner** les 2 comptes dev (ils sont compromis par construction).
3. **Restaurer un gate de secrets utile** : exclure `*.test.ts`, `*.stories.tsx`, `styles/*.css` ; ajouter la détection de `password: '...'`, d'URL `*.supabase.co` et d'UUID en clair. Un gate doit être vert quand le code est propre.

### Sprint 1 — Rendre les portes vertes (2-3 jours)

4. `pnpm add -D eslint-plugin-storybook` **à la racine** → `pnpm lint` démarre enfin.
5. Étendre tous les blocs `files:` de `eslint.config.js` à `**/*.{ts,tsx}` — puis traiter le passif (mesurer d'abord, corriger ensuite).
6. Corriger `packages/ascent` : `lib` avec `DOM`/`ES2023`, garder `budget` (`noUncheckedIndexedAccess`), et surtout **choisir une seule stratégie** : `tsc -b` (et retirer `noEmit` des projets référencés) **ou** `tsc --noEmit` par package (et supprimer les `references`).
7. Ajouter les **8 projets manquants** au `tsconfig.json` racine (`ascent`, `discovery`, `focus`, `learning`, `productivity`, `progress`, `workflows`, `apps/desktop`).
8. `@capacitor/core` → `packages/platform` ; `@capacitor/preferences` → `apps/mobile` ; ajouter un script `"build": "vite build"` à `apps/mobile` pour que `pnpm -r build` construise réellement l'app.
9. Aligner `supabase/config.toml` : noms en tirets, `verify_jwt` explicite par fonction, suppression du bloc `[pg_cron]` décoratif (les crons vivent dans `0014`).
10. `release.yml` : soit brancher le vrai `npx cap sync && ./gradlew assembleRelease` + `upload-artifact`, soit **renommer le step** pour ne plus mentir. Sans APK, il n'y a pas de « Phase 1 release candidate ».

### Sprint 2 — Dette structurelle (1-2 semaines)

11. **Trancher sur les 4 packages vides** : les supprimer (et corriger `AI_RULES`) ou les implémenter. Un package de 5 lignes est un mensonge coûteux.
12. Casser le **cycle** `engineering-adapters ↔ scientific-engine`.
13. Sortir les **12 Mo de `0021_lots/`** du versionnement (générateur + `.gitignore` + stockage externe) et résoudre la **collision `0021_*`**.
14. **Reconstituer un historique git réel** (imports incrémentaux par lot fonctionnel) : sans cela, ni bisect, ni revert, ni release notes crédibles.
15. Remplacer la « doc = SSoT » par une **doc générée/vérifiée** : un script CI qui recompte migrations, Edge Functions, tests et projets `tsc`, et échoue si `AI_RULES` diverge. C'est la seule façon d'éviter la dérive constatée au §6.7.
16. **Vulnérabilités** : traiter les 5 high les plus exposées (`zod`, `d3-color`, `source-map-js`, `extract-zip`, `undici`) ; geler les autres avec justification.
17. Sortir `node:crypto` du graphe client (`vault.ts`) — hacher côté Edge Function.
18. Alléger le dépôt : LFS ou stockage externe pour `images/`, `pack/.images`, `.stitch/images`, `anthropic-skills/` (≈ 45 Mo évitables).
19. Rejouer le build mobile sur un runner ≥ 7 Go pour **valider ou invalider** le budget 300 Ko gz.

---

## 9. Annexe — reproduction

```bash
# Environnement
node -v            # v22.22.3
npm i -g pnpm@10.28.0

# 1. Install (le postinstall electron échoue en sandbox réseau)
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile

# 2. Gates
pnpm typecheck                       # ❌ 52 erreurs (packages/ascent)
npx tsc -b                           # ❌ ~40 erreurs
pnpm lint                            # ❌ eslint-plugin-storybook introuvable
pnpm -r --continue test              # ⚠️ 682 pass / 2 fail
sh scripts/check-boundaries.sh       # ❌ exit 1 (G2 faux positifs)
sh scripts/check-rls.sh              # ✅
node --experimental-strip-types scripts/check-view-joins.ts   # ✅

# 3. Build de l'app
pnpm --filter @aurora/mobile build:web   # ❌ @capacitor/preferences non résolu

# 4. Audit dépendances
pnpm audit --prod                    # 23 high / 33 moderate / 9 low

# 5. Traçabilité
git log --all --oneline | wc -l      # 1
git tag | wc -l                      # 0
```

**Limites de cette analyse :** pas d'accès au projet Supabase live (état déployé, policies réelles, crons actifs) ni au dépôt GitHub distant (historique, PR, checks CI). Les constats portent donc sur le tree et sur ce qu'il permet de rejouer localement.
