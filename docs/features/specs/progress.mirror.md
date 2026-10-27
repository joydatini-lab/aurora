# Spec de module MVP — `progress.mirror`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `wsb/specs-modules-7-11`.
> **Statut du module** : `PARTIAL` — le modèle d'évidence (F-07), le recompute
> idempotent, les dashboards G2 et les trajectoires sont écrits et testés
> (20/20 `@aurora/progress` + 10/10 `apps/mobile` progress-wiring), mais le
> **miroir local** lit des colonnes (`proficiency`/`updated_evidence`/`value`/
> `snapshot_at`) qui **n'existent dans aucune table** — le miroir est vide en
> production. Voir §M2 drifts et §M6.
> **Priorité** : **V4** (Discovery + Progress + Artifact, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Modèle d'évidence (9 types, échelle 8 niveaux) | ✅ | `EVIDENCE_TYPES` — `packages/progress/src/evidence.ts:39` ; `levelIndex` `:33` |
| Qualification `TaskCompleted` → preuve | ✅ | `evidenceFromTaskCompleted` — `evidence.ts:56` |
| Qualification `FlashcardReviewed` → preuve | ✅ | `evidenceFromFlashcardReviewed` — `evidence.ts:77` |
| Qualification validation Miroir → preuve (M-63, F-07) | ✅ | `evidenceFromMirrorValidation` — `evidence.ts:118` |
| Fabrique unique de preuve (single-writer AD-7) | ✅ | `buildEvidence` — `evidence.ts:166` |
| Recompute de `SkillState` (idempotent AD-8) | ✅ | `recomputeSkill` — `packages/progress/src/recompute.ts:64` |
| Fraîcheur (`fresh`/`stale`/`forgotten`) | ✅ | `computeFreshness` — `recompute.ts:36` |
| Émission `SkillStateChanged` (AD-9) | ✅ | `buildSkillStateChanged` — `recompute.ts:157` |
| Émission `ProgressEvidenceCreated` (AD-9) | ✅ | `buildProgressEvidenceCreated` — `recompute.ts:198` |
| Handler `skill_recompute` (balayage par user, AD-8) | ✅ | `buildSkillRecomputeHandler` — `packages/progress/src/jobs.ts:68` |
| Dashboards G2 (today/week/trajectory, ChartSpec) | ✅ | `dashboard` — `packages/progress/src/dashboard.ts:136` |
| Trajectoires conditionnelles (« planning aids, not predictions ») | ✅ | `projectTrajectory` — `packages/progress/src/trajectories.ts:78` |
| Analyse causale (corrélation ≠ causation) | ✅ | `causalAnalysis` — `trajectories.ts:159` |
| **Hors v1** : miroir local exploitable | ❌ | colonnes inexistantes (DP-1) — voir §M2 |
| **Hors v1** : application de `progress.evidence_create` | ❌ | seam `invokeTool` no-op (DP-2) — `fn-agent-bootstrap.ts:659` |
| **Hors v1** : écriture `progress_evidences` depuis le kernel | ❌ (par conception) | AD-7/F-07 : le module écrit, le kernel émet (`evidence.ts:162`) |

**Vocabulaire fermé** : 9 types d'évidence (`evidence.ts:39`), 8 niveaux
(`evidence.ts:22`), 3 buckets de fraîcheur (`recompute.ts:30`).

---

## §M2 Contrat de données

### Tables propriétaires (SSoT = migration, AD-15)

`supabase/migrations/0005_progress.sql` — 8 tables :

| Table | Ligne | Miroir local | Note |
|---|---|---|---|
| `progress_snapshots` | `0005:9` | ✅ | `taken_at`, `payload` |
| `progress_evidences` | `0005:21` | ❌ **server-only** | commentaire `:22` ; `type`/`level`/`date`/`freshness`/`context`/`confidence`/`source_event_id` |
| `skill_states` | `0005:38` | ✅ | `level`/`freshness`/`confidence`/`last_evidence_at` (`:43-46`) |
| `progress_trends` | `0005:54` | ❌ server-only | PK `(user_id, period, dimension)` (`:61`) |
| `progress_events` | `0005:64` | ❌ server-only | Event History (AD-6/F-10) |
| `trajectory_scenarios` | `0005:74` | ❌ server-only | `hypotheses`/`actions`/`expected` jsonb |

**`progress_evidences`/`progress_snapshots`/`skill_states`** sont la propriété de
Progress : `OWNER_MODULE_BY_ENTITY` (`packages/data/src/commands.ts:202-203`)
les mappe à `progress` ; `packages/workflows/src/validate.ts:69-72` les mappe à
`'Progress'`. Le module ne les déclare pas toutes : `progress_evidences` est
**server-only** (aucun chemin de commande device, commentaire `commands.ts:18`).

**`gaps` — propriété CONTRADICTOIRE (voir DP-5)** : la table est créée dans
`0005:86` avec le commentaire « Rows owned by PROGRESS » (`0005:87`), et
`sync-config.yaml:82` dit « owned par le module Progress » ; mais
`OWNER_MODULE_BY_ENTITY` (`commands.ts:205`) et `validate.ts:68` disent
`'Discovery'`. Le module **Discovery** ne fait que **détecter** (`packages/discovery/src/gaps.ts:73`),
**aucun** module n'écrit de ligne `gaps` (`grep -rn "gaps" packages/progress/src/` → aucun writer).

### RLS — héritée, pas ajoutée

`progress_snapshots`/`progress_evidences`/`skill_states`/`trajectory_scenarios`/`gaps`
sont dans la boucle générique `0005:105-123` : `ENABLE` + **`FORCE`** ROW LEVEL
SECURITY, policy `<table>_user_isolation` (`user_id = auth.uid()`) +
`<table>_service_role` en `SELECT`. `progress_trends` (`:127-132`) et
`progress_events` (`:134-141`) ont des policies dédiées. Le module ne pose
**aucune** policy.

### Écriture — single-writer (AD-7 / F-07)

Progress est le **seul** producteur de `progress_evidences` + de l'événement
`ProgressEvidenceCreated` (`evidence.ts:4-8`) ; `buildEvidence` (`:166`) est la
fabrique unique. `recomputeSkill` (`recompute.ts:64`) est la seule mise à jour de
`skill_states`. Le module **ne produit que 2 événements** du vocabulaire fermé :
`PROGRESS_PRODUCED_EVENTS` (`recompute.ts:179`) = `ProgressEvidenceCreated`,
`SkillStateChanged` ; il **consomme** 4 événements (`PROGRESS_CONSUMED_EVENTS`,
`recompute.ts:188`).

### Synchronisation

Le stream `progress` (`powersync/sync-config.yaml:84-89`) expose
`skill_states`, `progress_snapshots` et `gaps`. **Exclus du miroir** (server-only,
`sync-config.yaml:22-23`) : `progress_evidences`, `progress_events`,
`progress_trends`. La vue relay est `v_progress_scope`
(`0015_powersync_relay_views.sql:61-68`).

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DP-1** | **Le miroir local lit des colonnes qui n'existent nulle part.** `apps/mobile/src/lib/progress-repo.ts` mappe `skill_states` avec `proficiency` (`:78`) + `updated_evidence` (`:86`) et `progress_snapshots` avec `value` (`:102`) + `snapshot_at` (`:106`). Or la migration `0005` **et** le schéma miroir `packages/data/src/powersync-schema.ts:398-424` portent `level`/`freshness`/`confidence`/`last_evidence_at` et `taken_at`/`payload`. Vérifié : `grep -rn "proficiency\|updated_evidence\|snapshot_at" supabase/migrations/*.sql powersync/ packages/data/src/` → **aucun résultat** (hors texte de doc `0021_marketplace_skills.sql`). En production, `proficiency` est toujours `undefined` → `proficiencyToLevel` (`:66`) renvoie `'discovered'` et `freshness`/`confidence` = `undefined`. **Le dashboard lit un miroir vide.** |
| **DP-2** | **`progress.evidence_create` n'est pas appliqué côté serveur.** Le seam `invokeTool` (`supabase/functions/_shared/fn-agent-bootstrap.ts:632`) ne route **que** `canvas.*` (`:645`) ; toute autre commande (dont `progress.evidence_create`) tombe sur le no-op documenté `executed: false` (`:659`). L'applyer `buildMirrorEvidence` (`recompute.ts:116`) n'a **aucun appelant** : `grep -rn "buildMirrorEvidence" packages/ supabase/ apps/` (hors tests) → **un seul résultat**, sa définition. La commande M-63 est émise par le kernel mais jamais appliquée. |
| **DP-3** | **`evidenceRefs` + `history` non round-trippés.** `skill_states` (`0005:38-52`) n'a **aucune** colonne OR-Set ni historique ; le handler REST le reconnaît explicitement (`fn-job-dispatcher/index.ts:428-430` : « `evidenceRefs` + `history` have NO column … an empty set is the honest value »). `recomputeSkill` calcule pourtant `evidenceRefs`/`history` (`recompute.ts:90-97`) — le résultat est **perdu** au `saveSkillState`. |
| **DP-4** | **`PROGRESS_JOB_HANDLERS` est un piège no-op documenté.** La table (`jobs.ts:158`) est bâtie sur des ports vides (`listSkillIds: async () => []`, `saveSkillState: async () => {}`, `jobs.ts:159-165`) ; le commentaire (`jobs.ts:144-157`) avertit que l'enregistrer dans le dispatcher ombragerait le handler REST (FIRST-wins). Le dispatcher appelle bien son propre `buildProgressHandlers()` (`fn-job-dispatcher/index.ts:349`). Correct, mais la table statique **ment** si un futur câblage la prend pour argent comptant. |
| **DP-5** | **Propriété de `gaps` contradictoire.** La table est créée dans `0005:86` (« Rows owned by PROGRESS », `:87`) et `sync-config.yaml:82` dit « owned par le module Progress » ; mais `OWNER_MODULE_BY_ENTITY` (`commands.ts:205`) et `validate.ts:68` disent `'Discovery'`. Aucun writer réel (`grep -rn "gaps" packages/progress/src/` → aucun). La spec `discovery.veille` §M2 traite `gaps` comme owned Progress : les deux SSoT se contredisent. |

> **Documentation, pas correction** (consigne) : DP-1/DP-3 exigent une décision
> AD-15 (aligner le repo sur le miroir, ou ajouter les colonnes) ;
> `packages/domain/src/**`, `supabase/migrations/*` et `powersync/*` sont
> **interdits** ici.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:19`.

| Capacité | Outil | Scopes | Confirmation | Classe offline | Preuve |
|---|---|---|---|---|---|
| `progress.analyze` | `progress_analyze` | write `progress:write` / read `progress:read,knowledge:read` | non | `hybrid` | matrix L19 ; `capability.ts:392` ; `tools.ts:783` |
| `progress.trajectories` | `progress_trajectories` | read `progress:read` | non | `offline-capable` | `capability.ts:403` ; `tools.ts:799` |
| `progress.cause` | `progress_cause` | write `progress:write` / read `progress:read,knowledge:read` | non | `online-required` | `capability.ts:413` ; `tools.ts:811` |
| `progress.evidence_create` | `progress_evidence_create` | write `progress:write` / read `progress:read,learning:read` | **OUI** | `offline-capable` | `capability.ts:423` ; `tools.ts:838` |

**Niveau** : `progress.analyze` = **FULL** (matrix L19). `progress.analyze`
route en job `skill_recompute` si `deep: true`, sinon commande
`progress.analyze` (`tools.ts:792-795`).

> **Écart constaté (documenté, non corrigé)** : `progress.evidence_create`
> exige une confirmation (`capability.ts:432`, ADR §5) mais sa commande n'a pas
> d'applyer serveur (DP-2) → `NOT_READY`. `progress.trajectories` émet
> `progress.trajectories_read` (`tools.ts:806`) sur une table
> `progress_trajectories` qui **n'existe pas** dans `0005` (les tables sont
> `progress_trends`) — nom d'outil vs table à trancher.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:120` (+ `:105`).

| Écran | Route | Statut spec |
|---|---|---|
| `progress-dashboard` (today/week/month/trajectory) | `/progress` (+`/progress/:id`) | **GAP (OQ-43)** — `_inventory.md:120` |
| `analytics` (vue) | `/progress?` (vue, 05 §4.5.2) | **SPÉCIFIABLE** — `_inventory.md:105` |

**Routes réelles** : `/progress` et `/progress/:id` (`_inventory.md:215-216`).

**Implémentation présente** : `apps/mobile/src/lib/progress-repo.ts` (lecture du
miroir local, `readProgress` `:136`, `createProgressRepo` `:177`) alimente les
dashboards G2 (`dashboard.ts:136`).

> **Écart constaté (documenté, non corrigé)** : `progress-dashboard` est **GAP**
> (OQ-43) — `docs/progress/overview.md` §18.6 « claimé, NON détaillé »
> (`_inventory.md:188`). La surface n'est donc **pas ratifiée** au v1.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire `skill_states` / `progress_snapshots` / `gaps` | ✅ | stream `progress` (`sync-config.yaml:87-89`) |
| Lire les dashboards (purs) | ✅ | `dashboard`/`todayBoard`/`trendBoard` (`dashboard.ts:136,88,110`) |
| Recompute (pur) | ✅ | `recomputeSkill` (`recompute.ts:64`, idempotent AD-8) |
| Trajectoires / causal (purs) | ✅ | `projectTrajectory`/`causalAnalysis` (`trajectories.ts:78,159`) |
| Lire `progress_evidences` (server-only) | ❌ **réseau requis** | exclu du miroir (`sync-config.yaml:22-23`) |
| Recompute « deep » (`skill_recompute`) | ❌ **réseau + dispatcher** | handler REST (`fn-job-dispatcher/index.ts:349`) |
| Écrire une preuve (`progress.evidence_create`) | ❌ **non branché** | DP-2 |

**Classe offline** : `offline-capable (mirrors skill_states/progress_snapshots)`
(`_inventory.md:120`) ; `progress.analyze` = `hybrid` (`capability.ts:401`).

> **Ne pas confondre** : les **dashboards** et le recompute pur sont hors-ligne ;
> la **lecture des preuves** et l'**écriture** d'une preuve ne le sont pas — et
> le miroir local lu par le dashboard est vide (DP-1).

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/progress test        # tests du module — 20/20 vert
pnpm -F @aurora/mobile exec node --experimental-strip-types --no-warnings \
  --import ./test/register-resolve-hook.mjs --test test/progress-wiring.test.ts   # 10/10 vert
grep -rn "proficiency\|updated_evidence\|snapshot_at" supabase/migrations/*.sql powersync/ packages/data/src/   # → aucun résultat (DP-1)
grep -rn "buildMirrorEvidence" packages/ supabase/ apps/   # → la seule occurrence hors test = sa définition (DP-2)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/progress test` → **20 tests, 20 pass, 0 fail** (exécuté).
Répartition : `progress.test.ts` 13 · `m63-mirror-evidence.test.ts` 7.
`apps/mobile` progress-wiring → **10 tests, 10 pass, 0 fail** (exécuté).

Tests de ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `M-63 F-07: payload sans le flag validated=true → zéro preuve (pas de row)` | `m63-mirror-evidence.test.ts:52` | invariant F-07 (pas de preuve non validée) |
| `M-63 F-07: le type du payload miroir est personal-explanation` | `m63-mirror-evidence.test.ts:69` | type SSoT M-61 |
| `M-63 F-07: validated=true → une ProgressEvidence personal-explanation est produite` | `m63-mirror-evidence.test.ts:86` | happy-path M-63 |
| `M-63 AD-11: le sourceNode du payload est qualifié dans sourceEventId + context` | `m63-mirror-evidence.test.ts:118` | provenance AD-11 |
| `M-63 AD-11: l'événement ProgressEvidenceCreated (AD-9) porte la provenance` | `m63-mirror-evidence.test.ts:137` | événement + provenance |
| `jobs: skill_recompute sweeps every skill the user has evidence for` | `progress.test.ts` | balayage du handler |
| `jobs: the static PROGRESS_JOB_HANDLERS table carries both kinds` | `progress.test.ts` | table de handlers |
| `jobs: research scenario op returns deterministic scenario` | `progress.test.ts` | scénario déterministe |
| `A1 readProgress: snake→camel mapping — proficiency → level (échelle S18.2)` | `progress-wiring.test.ts:80` | mapping du miroir (sur **fixture**, voir note) |
| `A1 computeRecomputeSkill: idempotent (AD-8) — running twice = same state` | `progress-wiring.test.ts:176` | idempotence AD-8 |

> **Note critique** : le test `A1 readProgress` **passe** parce qu'il injecte une
> fixture portant `proficiency`/`updated_evidence` (`progress-wiring.test.ts:46`)
> dans un `InMemoryLocalStore` — jamais la vraie table. Le test **valide le
> mapping**, pas la **présence** des colonnes. C'est exactement pourquoi DP-1 est
> invisible en test et visible en production.

### Seuils

Référence : `docs/testing/matrix.md`. Le modèle d'évidence, le recompute et les
dashboards sont **couverts** (30 tests exécutés). Mais les drifts **DP-1 → DP-4**
ne sont gardés par **aucun** test (les fixtures masquent DP-1) → `NOT_READY` sur
le miroir. La **surface** (OQ-43 = GAP) n'est pas prouvée → `NOT_READY`.

> **Note de statut doc** : `docs/progress/overview.md` §18.6 est « claimé, NON
> détaillé » (`_inventory.md:188`). Mesure : la logique pure **est** implémentée
> et testée ; le miroir local, l'applyer et la surface manquent. Doc-lag partiel.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **QP-1** | Le repo doit-il lire `level`/`confidence`/`last_evidence_at` (colonnes réelles) au lieu de `proficiency`/`updated_evidence` (DP-1) ? | **ouverte** — AD-15 ; code app, pas migration |
| **QP-2** | Qui applique `progress.evidence_create` côté serveur (DP-2) — un seam `invokeTool` dédié ? | **ouverte** — AD-7/OQ-03 |
| **QP-3** | `evidenceRefs`/`history` doivent-ils avoir des colonnes (DP-3) ou rester server-only ? | **ouverte** — AD-15 |
| **QP-4** | `PROGRESS_JOB_HANDLERS` (no-op) doit-il être supprimé pour éviter le piège ? | **ouverte** — AD-8 |
| **QP-5** | `gaps` appartient-il à Progress (`0005:87`) ou à Discovery (`commands.ts:205`) ? Le commentaire du code et la table de routage se contredisent. | **ouverte** — AD-15 |
| **QP-6** | `progress.trajectories` lit-il `progress_trends` (réelle) ou une table `progress_trajectories` à créer ? | **ouverte** — nom à trancher |
| **QP-7** | `progress-dashboard` est-il ratifié (OQ-43 = GAP) ? | **ouverte** — `_inventory.md:120` |
