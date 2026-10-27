# Spec de module MVP — `productivity.tasks`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : `510b47e`, branche `rebaseline/2026-10-23`.
> **Statut du module** : `IMPLEMENTED` (`status-register.md` §1/§5).
> **Priorité** : **V0** — module du chemin vertical (plan §3.4, §5).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Créer une tâche (titre, description, projet, objectif, échéance, priorité) | ✅ | `createTask` — `packages/productivity/src/tasks.ts:72` |
| Statuts `todo/doing/blocked/done/cancelled` | ✅ | CHECK `0002_productivity.sql:64` |
| Compléter une tâche → événement `TaskCompleted` | ✅ | `completeTask` — `tasks.ts:137` |
| Sous-tâches (`toggleSubTask`) | ✅ | `tasks.ts:193`, table `subtasks` (`0013`) |
| Récurrence **matérialisée** (1 ligne par occurrence) | ✅ | `nextRecurrence` — `tasks.ts:221` ; `parent_recurrence_key` (`0002:73`) |
| Dépendances (OR-Set) | ✅ | `dependencies jsonb` (`0002:76`) |
| Report (`rescheduleTask`) | ✅ | `tasks.ts:177` |
| Tags | ✅ | colonne ajoutée par `0032_fix_phantom_columns.sql:80` |
| **Hors v1** : sous-tâches imbriquées > 1 niveau, pièces jointes de tâche, partage inter-utilisateurs | ❌ | non trouvé dans `packages/productivity/src/` |

**Vocabulaire fermé** : 5 statuts, 4 priorités (1–4), 3 énergies
(`high/medium/low`), 2 contextes de travail — `0002_productivity.sql:63-74`.

---

## §M2 Contrat de données

### Table `tasks` (SSoT = migration, AD-15)

`supabase/migrations/0002_productivity.sql:57` + `0032_fix_phantom_columns.sql:80`.

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid PK` | |
| `user_id` | `uuid NOT NULL` → `auth.users` | isolation RLS |
| `project_id` / `goal_id` | `uuid` (SET NULL) | |
| `subject` | `text NOT NULL` | **le titre s'appelle `subject`** — `createTask` écrit `subject` (`tasks.ts:81`) |
| `status` | `text` CHECK 5 valeurs | défaut `todo` |
| `priority` / `importance` | `int` 1–4 | défaut 3 |
| `due_at` | `timestamptz` | |
| `parent_recurrence_key` | `text` | groupe la série |
| `recurrence_rule` | `text` | **ajoutée par `0032`** |
| `energy` / `work_context` | `text` | |
| `actual_minutes` | `int` | estimé vs réel |
| `dependencies` / `evidence_refs` | `jsonb` OR-Set | |
| `tags` | `jsonb` OR-Set | **ajoutée par `0032`** |
| `crdt_added` / `crdt_removed` | `jsonb` | |
| `local_mutation_id` | `text` | traçabilité G-M4 |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` |

### RLS — vérifiée, pas supposée

Politiques posées par la boucle générique `0002_productivity.sql:176-203` :
`ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy `<table>_user_isolation`
(`USING`/`WITH CHECK` sur `user_id = auth.uid()`), policy `service_role` en
`SELECT` borné par `user_id`.

**Commande de vérification** (statique) : `sh scripts/check-rls.sh` → inclut
`0002`. **Vérification positive** : `sh scripts/rls-live-check.sh` (2 utilisateurs
réels, 0 pénétration — `status-register.md` §6 C3).

### Écriture — single-writer (AD-7 / F-03)

Le module **ne touche jamais** la base directement : chaque cas d'usage retourne
un `ProductivityCommand` partiel (`tasks.ts:31-45`), appliqué par
`LocalCommandRepository.apply('productivity', …)`. Une mutation = une commande =
une table ; un écrit multi-table est un constat bloquant (`02 §11`).

### Synchronisation

`tasks` et `subtasks` sont dans le stream PowerSync
(`powersync/sync-config.yaml:41-42`), donc **disponibles hors-ligne** en lecture
et en écriture locale.

Le schéma **client** (`packages/data/src/powersync-schema.ts:32`) porte bien les
colonnes qui comptent, **y compris celles ajoutées par `0032`** : `subject`,
`tags`, `recurrence_rule`. C'est ce qui garantit qu'un tag ne disparaît pas à la
synchro (la classe « divergence silencieuse » décrite par `0032`).

**Garde automatique** : `tests/db/domain-schema-drift.test.ts` compare les
colonnes écrites par les writers aux colonnes déclarées — **8/8 vert**, exécuté
ci-dessous en §M6.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:10`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `task.create / task.update` | matrix L10 |
| Énoncé type | « add a task… » | matrix L10 |
| Scopes | `productivity:read` / `productivity:write` | matrix L10 |
| Confirmation | **non** (sauf opération en masse) | matrix L10 |
| Destructif | non (la suppression l'est) | matrix L10 |
| Dégradation AD-1 | saisie manuelle | matrix L10 |
| Niveau | **FULL** | matrix L10 |

**Implémentation** : l'outil `taskUpdate` (`packages/agent/src/tools.ts:643`)
couvre `create/update/complete/archive` via `action`. L'entrée du registre de
capacités porte l'id **`task.update`** (`packages/agent/src/capability.ts:294`).

> **Écart constaté (documenté, non corrigé)** : la matrice nomme la capacité
> « `task.create` / `task.update` », mais le registre n'enregistre que
> `task.update` (vérifié : `grep -c "id: 'task.create'" capability.ts` → 0).
> La fonctionnalité est **couverte** (`action: 'create'`), le **nom** diverge.
> Classe : doc-lag de nommage, pas un défaut de comportement. Décision AD-15
> (propriétaire) requise pour aligner le nom — pas de correctif unilatéral.

---

## §M4 Contrat de surface

SSoT : `docs/frontend/module-ownership-matrix.md` (Productivity) +
`docs/design-system/screens/_inventory.md`.

| Écran | Route | Statut spec |
|---|---|---|
| `taches-liste` | `/tasks` | ✅ **au cadre v1** (§15–§19) — la seule réutilisable telle quelle |
| `taches-detail` | `/tasks/:id` | à compléter (§15–§19) |
| `eisenhower` | vue sous `/tasks` | additif (G-L5) |

**Dans la coquille web** (`apps/web-app`) : l'onglet primaire **« S'organiser »**
(`organiser`) porte le préfixe `/tasks`
(`apps/web-app/src/lib/navigation.ts`), et `sectionForPath('/tasks/42')` retourne
`organiser` (préfixe le plus long).

**Les 5 états UX** (exigés par le plan §5) : chargement · vide · erreur ·
hors-ligne · partiel. Ils s'appuient sur `UxStates` (`packages/ui`) — piège
connu : la branche `empty` **ne rend pas** `children`.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire ses tâches | ✅ | stream PowerSync `tasks` (`sync-config.yaml:41`) |
| Créer / modifier / compléter | ✅ (file d'attente locale) | `ProductivityCommand` + `LocalCommandRepository` (AD-2) |
| Voir la synchro | ✅ (état local) | PowerSync |
| Demander à l'agent de créer une tâche | ❌ **réseau requis** | `fn-agent-run` (EF) + job `agent_run` — voir `agent.kernel` §M5 |

**Classe offline** : `offline-capable` (catalogue, colonne offline ;
`master-feature-catalog.md` L19).

> **Ne pas confondre** : la base locale est hors-ligne, l'exécution de l'agent ne
> l'est pas. « Mes tâches sont locales » ≠ « l'agent fonctionne hors-ligne ».

---

## §M6 Preuve

### Commandes

```sh
pnpm -F @aurora/productivity test        # tests du module
pnpm -r typecheck                        # contrat de types
sh scripts/check-rls.sh                  # RLS statique (0002 inclus)
sh scripts/rls-live-check.sh             # RLS positif, 2 utilisateurs réels
node --experimental-strip-types scripts/check-view-joins.ts
node --experimental-strip-types --no-warnings --test tests/db/domain-schema-drift.test.ts
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests**, dont :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `completeTask emits TaskCompleted + materializes next occurrence` | 54 | l'événement + la récurrence matérialisée |
| `status done without recurrence = single command` | 63 | une mutation = une commande (AD-7) |
| `recurrence math (daily/weekly/monthly + interval)` | 69 | `nextRecurrence` |
| `reschedule + subtask toggle write owned tables only` | 77 | tables propriétaires seulement |
| `recurrence createTask groups series by parent key` | 224 | `parent_recurrence_key` |

### Critères de « fait » pour L5 (le chemin vertical)

1. une tâche créée dans la coquille est **relue après redémarrage** ;
2. elle **apparaît en base** après synchro (round-trip réel) ;
3. `user A` ne lit pas la tâche de `user B` (**RLS positif**) ;
4. les **5 états UX** sont exercés ;
5. `task.update` crée une tâche via l'agent (chemin complet, `agent.kernel`).

### Seuils

Référence : `docs/testing/matrix.md`. Un test qui ne peut pas échouer n'est pas
une preuve — chaque garde de ce module doit être vérifiée par mutation.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **MT-1** | Aligner le nom `task.create` (matrice) vs `task.update` (registre) ? | **ouverte** — nommage agent, décision AD-15 |
| **MT-2** | `tasks.tags` / `recurrence_rule` sont-elles dans le schéma **client** ? | ✅ **résolue** — présentes (`powersync-schema.ts:32`), gardées par `domain-schema-drift.test.ts` (8/8) |
| **MT-3** | Drift `title`/`subject` sur `tasks` ? | ✅ **résolue** — le schéma client porte `subject` (`powersync-schema.ts:37`), conforme au writer (`tasks.ts:81`). Le drift `name`/`title` concerne `habits`/`routines`, pas `tasks`. |
