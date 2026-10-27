# Spec de module MVP — `productivity.goals`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `IMPLEMENTED` — domaine + producteur d'événement
> `GoalUpdated` testés ; deux drifts d'énumération **non gardés** (voir §M2/§M6).
> **Priorité** : **V2** (Productivity restant, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Créer un objectif (titre, horizon, échéance, description) | ✅ | `createGoal` — `packages/productivity/src/goals-projects.ts:36` |
| Mettre à jour un champ, avec **liste exacte des champs changés** | ✅ | `updateGoal` — `goals-projects.ts:67` (no-op si rien ne change, `:82-86`) |
| Marquer atteint | ✅ | `achieveGoal` — `goals-projects.ts:105` |
| Renommer (patch `title` seul, G12) | ✅ | `renameGoal` — `goals-projects.ts:126` |
| Émettre `GoalUpdated` (producteur unique, AD-9) | ✅ | `buildGoalUpdated` — `packages/productivity/src/events.ts:67` ; `events.ts:85` (`PRODUCTIVITY_PRODUCED_EVENTS`) |
| Créer un projet (nom, objectif, échéance, description, vue) | ✅ | `createProject` — `goals-projects.ts:150` |
| Mettre à jour un projet | ✅ | `updateProject` — `goals-projects.ts:173` |
| Créer / atteindre un jalon | ✅ | `createMilestone` `:200`, `reachMilestone` `:228` |
| Projections de vues (Gantt, Kanban, calendrier) | ✅ | `ganttProjection` `:255`, `kanbanColumns` `:280`, `toUiCalendarEvents` `:310` |
| **Hors v1** : suppression d'un objectif (jamais — additif AD-15, `goal_abandon`), templates de projet, partage | ❌ | pas de `deleteGoal` ; `capability.ts:543-544` (« JAMAIS de goal.delete ») ; templates non trouvés dans `goals-projects.ts` |

**Vocabulaire** : horizons `short/mid/long` (`0002_productivity.sql:32`).

---

## §M2 Contrat de données

### Trois tables propriétaires (SSoT = migration, AD-15)

`supabase/migrations/0002_productivity.sql` : `projects` (`:10`), `goals`
(`:26`), `milestones` (`:42`).

**`goals`** (`0002:26-40`) :

| Colonne | Type | Note |
|---|---|---|
| `id` / `user_id` | `uuid` | `user_id NOT NULL` → `auth.users` — `0002:28` |
| `title` | `text NOT NULL` | `0002:29` |
| `description` | `text` | `0002:30` |
| `horizon` | `text` CHECK `short/mid/long` | **`mid`, pas `medium`** — `0002:32` |
| `status` | `text` CHECK `active/completed/archived` | `0002:33` |
| `target_date` | `date` | `0002:34` |
| `crdt_added` / `crdt_removed` / `local_mutation_id` | `jsonb` / `text` | `0002:35-37` |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` — `0002:38-39` |

**`projects`** (`0002:10-24`) : `goal_id uuid` (`:13`), `name text NOT NULL`
(`:14` — **le titre projet s'appelle `name`**), `status` CHECK
`active/archived/completed` (`:16`), `start_date`/`end_date` (`:17-18`).

**`milestones`** (`0002:42-55`) : `project_id` (CASCADE), `goal_id` (SET NULL),
`title`, `due_date date` (`:49`), `status` CHECK `open/reached/skipped` (`:50`).

### RLS — héritée, pas ajoutée

Les trois tables sont dans la boucle générique `0002_productivity.sql:174-202`
(liste `:177-180`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`<table>_user_isolation` (`user_id = auth.uid()`) + policy `_service_role`
`SELECT` bornée. Le module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

Chaque cas d'usage retourne un `ProductivityCommand` **partiel** sur une table
propriétaire (`goals`/`projects`/`milestones`) ; `createGoal`/`updateGoal` y
joignent un `event: GoalUpdated` (`goals-projects.ts:56-61`, `:95-100`). Une
mutation = une commande = une table.

### Synchronisation

`projects` (`sync-config.yaml:43`), `goals` (`:44`), `milestones` (`:50`) sont
dans le stream PowerSync → **disponibles hors-ligne**. Schéma client :
`packages/data/src/powersync-schema.ts:90` (`projects`), `:108` (`goals`), `:74`
(`milestones`) ; `horizon` présent `:113`.

> **Drift de vocabulaire (documenté, non corrigé)** — deux écarts entre le
> domaine (`packages/domain/src/entities-productivity.ts:89-101`) et la migration
> `0002`, **non couverts** par `domain-schema-drift.test.ts` :
>
> 1. **`horizon`** : le domaine déclare `'short' | 'medium' | 'long'`
>    (`entities-productivity.ts:94`) ; la migration déclare
>    `CHECK (horizon IN ('short','mid','long'))` (`0002:32`). Écrire
>    `horizon:'medium'` **échoue en Postgres**. Le test de dérive (D2) ne couvre
>    **que** `Artifact.kind` (exécuté : `domain-schema-drift.test.ts:364` +
>    `:511`) — ce couple n'est pas gardé.
> 2. **`status`** : le domaine déclare `'active' | 'achieved' | 'abandoned'`
>    (`entities-productivity.ts:96`) ; la migration déclare
>    `CHECK (status IN ('active','completed','archived'))` (`0002:33`). Les deux
>    vocabulaires sont **disjoints** hors `active` ; `achieveGoal` écrit
>    `'achieved'` (`goals-projects.ts:106`) — rejeté en base.
>
> Classe : drift domaine↔base silencieux (même famille que D2), **sans garde**.
> Correction interdite ici (voir §M7) — la demande est documentée.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:12`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `goal.create` / `project.create` | matrix L12 |
| Énoncé type | « create a goal… » | matrix L12 |
| Scopes | `productivity:read` / `productivity:write` | matrix L12 |
| Confirmation | **oui** (décomposition en masse) | matrix L12 (`CONFIRMATION_REQUIRED`) |
| Destructif | non | matrix L12 |
| Dégradation AD-1 | édition manuelle | matrix L12 |
| Niveau | `CONFIRMATION_REQUIRED` | matrix L12 |

**Registre** : 7 capacités `goal.*` (`capability.ts:157` `goal.create`, `:166`
`goal.status`, `:175` `goal.recompose`, `:184` `goal.pause`, `:193`
`goal.complete`, `:202` `goal.abandon`, `:211` `goal.feature.add`, `:220`
`goal.feature.remove`). Outil `goalCreate` (`tools.ts:210`) émet
`goal.create` (`tools.ts:222`) ; `goalRename` (`tools.ts:1058`) émet
`progress.goal_rename` (`tools.ts:1067`).

> **Écart constaté (documenté, non corrigé)** :
> 1. la matrice nomme « `goal.create` / `project.create` » (L12) mais le registre
>    **n'a aucune entrée `project.create`** (vérifié : `grep -n "project.create"
>    packages/agent/src/capability.ts` → **aucun résultat**). La création de
>    projet existe côté module (`createProject`), pas côté registre.
> 2. la matrice donne le scope `productivity:write` (L12) alors que
>    `goal.create` porte `writeScopes: ['progress:write']` (`capability.ts:160`).
>
> Classe : doc-lag de nommage/scope, pas un défaut de comportement. Décision
> AD-15 requise.

> **Chemin non abouti** : `goalCreate` émet `goal.create` (`tools.ts:222`) et
> `goalRename` émet `progress.goal_rename` (`tools.ts:1067`) ; aucun
> consommateur serveur n'applique ces commandes (`grep` sur
> `supabase/functions/` → seule lecture de la vue `user_goals_public`,
> `_shared/fn-agent-bootstrap.ts:248`). Le module `productivity` n'est donc pas
> branché côté serveur pour les goals — cohérent avec `goal.create` adressant le
> module **Progress** (`user_goals`, migration `0017`), hors du périmètre de ce
> document.

---

## §M4 Contrat de surface

SSoT : `docs/frontend/module-ownership-matrix.md` +
`docs/design-system/screens/_inventory.md`.

| Écran | Route | Statut spec |
|---|---|---|
| `objectifs-liste` | `/goals` | listé — `_inventory.md:40` |
| `objectifs-detail` (goal dashboard, 5 layouts) | `/goals/:id` | listé — `_inventory.md:40` ; `computeGoalDashboardLayout` (`apps/mobile/src/pages/goals/dashboard.tsx`) |
| `goal-feature-detail` | `/goals/:id/features/:fid` | listé — `_inventory.md:40` |
| `projets-liste` + `projets-detail` (4 vues : Liste/Kanban/Timeline/Gantt) | `/projects/:id?` | listé — `_inventory.md:19,39` |

**Routes réelles** : `/goals`, `/goals/:id`, `/goals/:id/features/:fid`
(`apps/mobile/src/router.tsx:108-110`), `/projects` (ownership matrix L26).
`GoalsPage`/`GoalDashboardPage`/`GoalFeatureDetailPage` importés
(`router.tsx:36`).

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) : à
exercer par les écrans (aucune preuve d'exécution dans ce document).

> **Note** : `toUiCalendarEvents`/`ganttProjection`/`kanbanColumns` produisent
> les données de rendu (AG Grid / FullCalendar adaptés par `@aurora/ui`) — le
> package reste **vendor-free** (AD-1, `goals-projects.ts:6-8`).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire objectifs / projets / jalons | ✅ | streams PowerSync (`sync-config.yaml:43,44,50`) |
| Créer / modifier / atteindre | ✅ (file locale) | `ProductivityCommand` (AD-2/AD-7) |
| Projections de vues | ✅ | pur, sans I/O (`goals-projects.ts:255-330`) |
| Émettre `GoalUpdated` | ✅ (événement local) | `buildGoalUpdated` (`events.ts:67`) |
| Demander à l'agent de créer un objectif | ❌ **réseau requis** | `fn-agent-run` + job — voir `agent.kernel` §M5 |

**Classe offline** : `offline-capable` (`master-feature-catalog.md:22-23`).

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/productivity test        # tests du module — 16/16 vert
node --experimental-strip-types --no-warnings --test tests/db/domain-schema-drift.test.ts  # 8/8 vert
grep -n "project.create" packages/agent/src/capability.ts  # → aucun résultat
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests** au total
(commande ci-dessus : `tests 16 / pass 16 / fail 0`), dont pour ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `goals: create emits GoalUpdated; update lists changed fields` | 171 | `createGoal` émet `GoalUpdated` ; `updateGoal` ne liste que les champs réellement changés (`fields='status'`) |
| `G12 (wave 3): renameGoal patche title + émet GoalUpdated (fields: ["title"])` | 238 | `renameGoal` délègue à `updateGoal` (patch `title`) |
| `G12 (wave 3): renameGoal no-op (title inchangé) → pas de GoalUpdated` | 259 | le no-op guard n'émet **pas** d'événement |

`tests/db/domain-schema-drift.test.ts` — **8/8 vert** (exécuté) : la garde couvre
`projects`/`goals` (`:155,157`) mais **pas** les couples `enum` `goals.horizon`
ni `goals.status` (elle n'exerce `domainUnionValues` que pour `Artifact.kind`,
`:364`).

### Seuils

Référence : `docs/testing/matrix.md`. Le domaine est couvert (3 tests exécutés) ;
les deux drifts d'énumération de §M2 **ne sont pas gardés** par un test → ils
restent un risque runtime. La **surface** et le **chemin agent** ne sont pas
prouvés → §M3/§M4.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **MG-1** | Aligner l'énumération `goals.horizon` (`medium` domaine vs `mid` SQL) ? | **ouverte** — décision AD-15 ; **correction interdite** ici (migration + domaine hors périmètre) |
| **MG-2** | Aligner `goals.status` (`achieved/abandoned` domaine vs `completed/archived` SQL) ? | **ouverte** — décision AD-15 ; `achieveGoal` écrit un statut rejeté par le CHECK |
| **MG-3** | Étendre la garde D2 (`domain-schema-drift.test.ts`) aux énumérations `goals.*` ? | **ouverte** — couverture de preuve |
| **MG-4** | Créer l'entrée `project.create` au registre (nommée par la matrice L12, absente) ? | **ouverte** — décision AD-15 |
