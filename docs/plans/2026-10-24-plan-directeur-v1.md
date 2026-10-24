# Plan directeur v1 — périmètre A–M ratifié

> **Statut :** plan d'exécution. Remplace la séquence proposée par
> `2026-10-24-redefinition-priorites.md` §4 (qui présupposait D1 = « socle »).
> **Owner a tranché D1 = périmètre complet A–M** — donc Design Space Pro (L) est
> dans la v1, pas en Phase 1B conditionnelle.
> **Règle de lecture (`AI_RULES.md` §1) :** le code et la base live gagnent sur
> les docs. Chaque fait ci-dessous porte un fichier, une commande ou une requête.
> **Créé :** 2026-10-24. **Nature :** plan. Le code de cette session est dans
> `c8367fa` (T1a) et `7221f20` (bundling EF).

---

## 0. Ce qui a changé depuis le dernier plan

| Fait | Avant | Maintenant | Preuve |
|---|---|---|---|
| Dispatcher démarre | ❌ 2 imports morts | ✅ `check-ef-imports` OK, 70 symboles | `node scripts/check-ef-imports.mjs` |
| FSRS planifie | ❌ intervalle négatif → 1 min | ✅ 9–10 j réels | `packages/learning/test/jobs.test.ts` |
| EF déployables | ❌ imports `packages/*` bruts | ✅ 8/8 bundlées, 0 `require(` | `node scripts/check-ef-bundles.mjs` |
| `config.toml` | ❌ 5 sections mortes (underscores) | ✅ slugs réels + `entrypoint` | `supabase/config.toml` |
| Dispatcher déployé | ❌ absent | ❌ **absent** | `list_edge_functions` → 5 EF |

**Ce qui n'a pas changé : le dispatcher n'est toujours pas déployé, et surtout
il ne peut toujours pas être réveillé.** C'est le blocage n°1, et il est
structurel (§2).

---

## 1. Diagnostic en une page

Aurora a **64 tables live**, **19 packages**, **3 apps**, **28 migrations**,
**124 politiques RLS** — et un **gate vert**. Ce n'est pas un projet vide.

Mais trois chaînes sont **coupées**, et elles bloquent **6 familles sur 11** :

1. **La chaîne des jobs** — le dispatcher n'a jamais tourné. 34 jobs
   `pending` depuis le **2026-10-08** (16 jours), `job_logs` = **0 ligne**.
2. **La chaîne de déploiement** — le job CI `deploy` est `if: false` depuis
   avant l'écriture de 3 EF. La base et le dépôt ont divergé sans que personne
   ne le voie (3 fonctions live-only, 1 migration non tracée).
3. **La chaîne de réveil** — aucun mécanisme ne peut appeler le dispatcher
   (§2.3). Même déployé, il ne tournerait jamais.

Tout le reste — productivité, learning, knowledge, progress, discovery, agent,
canvas, design system — est `IMPLEMENTED` ou `PARTIALLY IMPLEMENTED` et
**réutilisable tel quel**.

---

## 2. La chaîne de blocage (T1), démontée pièce par pièce

### 2.1 Le dispatcher démarre maintenant — mais ne route que la moitié

`buildLearningHandlers()` (`fn-job-dispatcher/index.ts:236`) construit bien les
2 handlers Learning, avec de **vrais** ports REST (`fetch` vers
`${SUPABASE_URL}/rest/v1/...`), pas des no-op. Vérifié :

```
packages/learning/src/jobs.ts:134  buildFsrsTickHandler    jobKind 'fsrs-tick'
packages/learning/src/jobs.ts:187  buildCourseImportHandler jobKind 'course_import'
```

**Mais `skill_recompute` (17 des 34 jobs) n'a aucun handler enregistré :**

```
packages/progress/src/jobs.ts:114  export const PROGRESS_JOB_HANDLERS: readonly RegisteredHandler[] = [];
```

Or `buildSkillRecomputeHandler` **existe** (ligne 47) et est **testé**
(`progress.test.ts:265`). Il n'est simplement **jamais appelé** — il manque la
fabrique qui injecte ses `RecomputeContext` (comme `buildLearningHandlers` le
fait pour Learning). Le dispatcher le `skip` silencieusement
(`index.ts:632`, `handler === null → skipped += 1`), donc les jobs restent
`pending` pour toujours.

### 2.2 Le payload du cron est incompatible avec le handler

Même une fois le handler câblé, il ne consommerait pas les jobs du cron. Le
cron `aurora_skill_recompute` insère `payload = '{}'::jsonb` (vérifié dans
`cron.job`), et le handler exige un `skillId` non vide :

```
packages/progress/src/jobs.ts:57  if (typeof skillId !== 'string' || skillId === '')
packages/progress/src/jobs.ts:58    return { ok: false, error: 'progress/missing_skill_id' }
```

Les 17 jobs `skill_recompute` passeraient donc `pending` → `failed` avec
`missing_skill_id`. **C'est un défaut de conception du cron, pas du handler.**
Le cron ne sait pas quel skill recalculer ; il faudrait soit un payload
`{skillId}` par skill due, soit un handler « recompute all for user ».

### 2.3 Le réveil est structurellement impossible

C'est le point le plus grave, et il n'est **pas** résolu par le déploiement.

```
cron.job #3  schedule '*/5 * * * *'
             command  SELECT pg_notify('aurora_job_dispatcher', 'cron-sweep')
```

Un Edge Function HTTP **ne peut pas** tenir un `LISTEN` : `pg_notify` n'a aucun
consommateur possible. Et le réveil par la base est fermé :

```
pg_available_extensions → pg_net  0.20.4  (installed_version: null)
pg_extension            → pg_cron, pgcrypto, vector, supabase_vault, ...
```

`pg_net` est **disponible mais non installé** — donc la voie de correction
existe (`net.http_post` depuis un cron). Alternatives : un cron GitHub Actions
(motif déjà en place : `sync-health.yml`, `cron: '0 3 * * *'`) ou un appel HTTP
externe. **À trancher** (§7).

### 2.4 Le déploiement ne part pas

`.github/workflows/release.yml:164` — le job `deploy` est `if: false` (gate
OQ-03). Les 5 EF live ont été déployées **à la main** entre le 2026-09-30 et le
2026-10-07. Les 3 manquantes (`fn-canvas` 2026-10-06, `fn-integrations`
2026-10-03, `fn-job-dispatcher` 2026-09-23) sont postérieures ou jamais
redéployées.

**Correction d'une erreur de ma part :** j'ai d'abord écrit que ces 3 EF ne
pouvaient pas se déployer parce qu'elles importent `packages/*`. C'est faux en
partie — `fn-canvas` importe **0** package workspace et manque quand même, et le
CLI moderne documente que les fichiers monorepo hors workdir *peuvent* être
déployés (`apps/cli/src/shared/functions/deploy.ts:2244`). La cause première est
que **le déploiement s'est arrêté**. Le bundling reste la bonne durcissement,
mais ce n'est pas le diagnostic.

---

## 3. Ce qui est fait et vérifié (cette session)

| Lot | Livrable | Preuve |
|---|---|---|
| T1a | Dispatcher démarre (2 imports morts retirés) | `check-ef-imports` OK |
| T1a | **Bug FSRS réel corrigé** : intervalle négatif → 1 min, la répétition espacée était inerte | formule canonique + `FSRS_DECAY`, test non-régression |
| T1a | `packages/learning/src/jobs.ts` (2 handlers) + tests | `learning` 31/31 |
| T1b | `scripts/build-ef.mjs` — 8/8 EF bundlées, dispatcher 1329→202 KB | `check-ef-bundles` OK |
| T1b | `scripts/check-ef-bundles.mjs` + câblage CI | détecte 3 défauts, accepte 2 cas sains |
| T1b | `config.toml` : slugs corrigés + `entrypoint` | 7 sections ↔ 7 dossiers |
| T1b | `release.yml` : bundle avant deploy | `if: false` conservé (OQ-03) |

**Gate complet :** TYPECHECK 0 · LINT 0 · TEST 0 (675 node + 48 vitest) ·
BUILD 0 · EF-IMPORTS 0 · EF-BUNDLES 0 · BOUNDARIES 0 · RLS-STATIC 0 ·
VIEW-JOINS 0 · SPINE 0.

---

## 4. Nouveaux défauts trouvés cette session (non corrigés)

| # | Défaut | Impact | Preuve |
|---|---|---|---|
| N1 | `PROGRESS_JOB_HANDLERS` vide alors que `buildSkillRecomputeHandler` existe et est testé | 17 jobs `skill_recompute` jamais routés | `progress/src/jobs.ts:114` |
| N2 | Le cron `skill_recompute` envoie `payload={}`, le handler exige `skillId` | échoueraient même routés | `cron.job` + `jobs.ts:57` |
| N3 | `pg_net` non installé ; le cron fait `pg_notify` sans consommateur possible | **aucun réveil** | `pg_extension`, `cron.job` |
| N4 | `fn-canvas` absente alors qu'elle n'importe aucun package | déployer ≠ suffisant | `list_edge_functions` |
| N5 | 3 fonctions live-only, `SECURITY DEFINER` exécutables par `anon` | reset base = perte ; surface d'attaque | advisors (WARN ×3) |
| N6 | Protection mots de passe compromis désactivée | sécurité auth | advisors (WARN) |
| N7 | `vector` dans `public` ; 2 fonctions `search_path` mutable ; `keep_alive` RLS sans politique | hygiène | advisors (WARN/INFO) |

N1–N4 bloquent T1. N5–N7 sont de l'hygiène à traiter en tranche 4.

---

## 5. Le plan — 6 tranches, dans cet ordre

> Principe : **une tranche se termine** (gate vert + livrable écrit + poussé)
> avant d'ouvrir la suivante. Aucune exception.

### Tranche 1 — Rendre la chaîne de jobs réelle *(T1, le blocage n°1)*

| Lot | Contenu | Preuve de fin |
|---|---|---|
| 1.1 | Câbler `skill_recompute` : fabrique `RecomputeContext` REST (miroir de `buildLearningHandlers`) + l'ajouter à `PROGRESS_JOB_HANDLERS` | handler routé ; test d'intégration |
| 1.2 | Trancher N2 : payload par skill due **ou** handler « all for user » | décision écrite + implémentée |
| 1.3 | Trancher N3 et implémenter le réveil (`pg_net` + `net.http_post`, **ou** cron GH Actions) | un dispatch réel produit `job_logs > 0` |
| 1.4 | Déployer les 8 EF (bundle d'abord) | `list_edge_functions` → 8, ACTIVE |
| 1.5 | Purger/requeue les 34 jobs morts et **prouver** le traitement | `job_queue pending → 0` ; `job_logs` renseigné |

**Porte T1 :** un job produit par cron est consommé de bout en bout, et
`job_logs` n'est plus vide. **Débloque :** B.1, B.3, E.1, F, H, I.4, K.

### Tranche 2 — Aligner base ↔ dépôt *(la cause racine de la dérive)*

| Lot | Contenu |
|---|---|
| 2.1 | Versionner les 3 fonctions live-only (N5) dans une migration |
| 2.2 | Trancher le sort de `auto_confirm_*` : intentionnel (décision owner 10-07) mais à révoquer ou passer en `INVOKER` |
| 2.3 | Migration 28 non tracée → réconcilier `schema_migrations` |
| 2.4 | Réactiver le job `deploy` (OQ-03) ou le remplacer par un déploiement vérifié |

**Porte T2 :** `git` et la base racontent la même histoire ; un reset serait
rejouable.

### Tranche 3 — Les propriétaires de tables manquants

| Lot | Contenu | Débloque |
|---|---|---|
| 3.1 | `packages/knowledge` — propriétaire des 10 tables existantes, **0 table neuve** | C.1, C.2 |
| 3.2 | `packages/artifact` — propriétaire des 2 tables existantes | H, puis L |

**Porte T3 :** chaque table a un module propriétaire ; `OWNER_MODULE_BY_ENTITY`
(`packages/data/src/commands.ts:180`) ne nomme plus de module absent.

### Tranche 4 — Hygiène et ponctuelles

N6 (mots de passe compromis) · N7 (`vector` schema, `search_path`,
`keep_alive`) · A.7 `name`/`title` (AD-15) · A.9 bilan périodique · C.3 OCR ·
H prévisualisation · B.6 valider Mirror · round-trip PowerSync (`BLOCKED` relay).

### Tranche 5 — Design Space Pro (L, 11 capacités)

Dépend de T3.2 (Artifact) et du Canvas. Ordre §10.4 : brief → Brand DNA →
logo → charte → affiche → éditeur → validateur → documents → export.
**0 package, 0 table, 0 route aujourd'hui** — c'est un chantier neuf, à ne pas
sous-estimer.

### Tranche 6 — Plateformes

`apps/web-app` (React pur, `OQ-1` a écarté Ionic du web) → Electron → Capacitor
(`apps/mobile` conservé, cible Phase 4). Décision D2 non tranchée (§7).

---

## 6. Ce qu'on ne fait pas

| Non-objectif | Motif |
|---|---|
| Un chat tiers (LibreChat / open-webui / LobeHub) | L'histoire « intégration LibreChat » est **réfutée** (branche 404, `docs/integration/` inexistant, 15 commits cités inexistants). LobeHub = référence de conception seulement. |
| Un nouveau design system | `packages/ui` conservé, 272 briques inventoriées |
| Réécrire les 26 pages mobile | Le web les **réutilise** via les contrats |
| Réinitialiser la base live | 4 utilisateurs réels + 3 fonctions non versionnées ; irrattrapable |
| Câbler `@assistant-ui/react` en v1 | Réserve de briques dormante (D-018.2) |

---

## 7. Décisions restantes (bloquantes pour la tranche 1)

| # | Question | Options |
|---|---|---|
| **T1-N3** | Le réveil des jobs ? | (a) installer `pg_net` + `net.http_post` depuis `pg_cron` · (b) cron GitHub Actions qui POST le dispatcher · (c) service externe |
| **T1-N2** | `skill_recompute` ? | (a) payload `{skillId}` par skill due (le cron change) · (b) handler « recompute all for user » (le handler change) |
| **T2-OQ03** | Réactiver le job `deploy` ? | (a) oui, avec les secrets · (b) déploiement manuel vérifié documenté |
| **D2** | Coquille web ? | (a) créer `apps/web-app` maintenant · (b) rendre `apps/mobile` responsive d'abord |

**Recommandation :** T1-N3 (a) — `pg_net` est déjà disponible (0.20.4), c'est le
chemin le plus court et il rend le réveil *observable* (`net._http_response`) ·
T1-N2 (a) — le cron sait quels skills sont dus, le handler n'a pas à deviner ·
T2-OQ03 (a) · D2 (a).

---

## 8. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| FS sandbox éphémère | Critique (déjà arrivé) | Pousser après **chaque** lot |
| Supabase free tier auto-pause (7 j) | Élevé | Réveiller avant chaque lot live |
| Design Space sous-estimé | Élevé | POC outils avant engagement (item 9) |
| Dérive reprise (base ↔ dépôt) | Élevé | T2 est dédié ; `check-ef-imports` + `rls-live-check.sh` en garde-fous |
| `main` reste en arrière (39 commits) | Moyen | Ouvrir une PR (seul déclencheur de `ci-gate`) |
