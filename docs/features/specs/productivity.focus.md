# Spec de module MVP — `productivity.focus`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `IMPLEMENTED` (domaine sessions + Pomodoro + blocklist
> testés) — mais il écrit **deux colonnes fantômes** (voir §M2).
> **Priorité** : **V2** (Productivity restant, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Ouvrir une session de focus (`pomodoro`/`timer`/`open`) | ✅ | `startFocusSession` — `packages/productivity/src/focus.ts:49` ; modes `focus.ts:18` |
| Fermer une session + écrire le bilan (prévu vs réel) | ✅ | `endFocusSession` — `focus.ts:82` (`session_bilan` `focus.ts:99`) |
| Machine à états **Pomodoro** (focus → pause courte/longue, cycle) | ✅ | `tickPomodoro` — `focus.ts:120` ; défauts `POMODORO` `focus.ts:21` |
| Affichage (minutes restantes + libellé de phase) | ✅ | `pomodoroDisplay` — `focus.ts:158` |
| **Blocklist** (règles `block`/`limit` par app dans la session) | ✅ | `toggleBlockRule` — `focus.ts:181` ; contrat `FocusBlockRule` `focus.ts:173` |
| Blocage **système** des apps (DPC) | ⚠️ **PLATFORM_DEPENDENT** | couche HYPATIYAS `FocusControllerPort` — hors de ce package (`focus.ts:6-7`) |
| **Hors v1** : politique d'appels (`call_policy`), notifications propres à la session | ❌ | `call.policy` = `NOT_AGENT_ENABLED (V1)` (matrix L31) |

**Vocabulaire fermé** : 3 modes `pomodoro/timer/open` (`focus.ts:18`) ; 2 actions
de règle `block/limit` (`focus.ts:175`).

---

## §M2 Contrat de données

### Table propriétaire `focus_sessions` (SSoT = migration, AD-15)

`supabase/migrations/0002_productivity.sql:113` (`focus_sessions`).

| Colonne | Type | Note |
|---|---|---|
| `id` / `user_id` | `uuid` | `user_id NOT NULL` → `auth.users` — `0002:115` |
| `task_id` | `uuid` → `tasks` (SET NULL) | **lien tâche unique** — `0002:116` |
| `started_at` / `ended_at` | `timestamptz` | `0002:117-118` |
| `planned_minutes` / `actual_minutes` | `int` | `0002:119-120` |
| `status` | `text` CHECK `active/paused/ended/abandoned` | `0002:121-122` |
| `notification_policy` | `jsonb NOT NULL DEFAULT '{}'` | `0002:124` |
| `call_policy` | `jsonb NOT NULL DEFAULT '{}'` | `0002:125` |
| `focus_app_rules` | `jsonb NOT NULL DEFAULT '{}'` | `0002:126` |
| `session_bilan` | `jsonb NOT NULL DEFAULT '{}'` | G-H1 — `0002:127` |
| `crdt_added` / `crdt_removed` / `local_mutation_id` | `jsonb` / `text` | `0002:128-130` |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` — `0002:131-132` |

**Table additionnelle `focus_profiles`** (`supabase/migrations/0027_focus_profiles.sql:33`) :
profils Focus (méthode `pomodoro/chrono/tours`, `base_minutes`, `rest_minutes`,
`rounds`, `task_id`, `display_on_focus_page`) — RLS `ENABLE`+`FORCE` +
policy `user_isolation_focus_profiles` (`0027:58-59`, `:66`).

### RLS — héritée, pas ajoutée

`focus_sessions` est dans la boucle générique `0002_productivity.sql:174-202`
(liste `:179`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`focus_sessions_user_isolation` + `_service_role`. `focus_profiles` porte sa
propre policy (`0027:66`). Le module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

`startFocusSession`, `endFocusSession`, `toggleBlockRule` retournent un
`ProductivityCommand` **partiel** sur `focus_sessions`. Une mutation = une
commande = une table. Le DPC (blocage système) est invoqué **séparément** via
`FocusControllerPort` — jamais par ce module (`focus.ts:6-7`, `:46-47`).

### Synchronisation

`focus_sessions` (`sync-config.yaml:53`) et `focus_profiles` (`:54`) sont dans le
stream PowerSync → **disponibles hors-ligne**. Schéma client :
`packages/data/src/powersync-schema.ts` (`focus_sessions` `:155`), `focus_profiles`
(`:554`).

### ⚠ Deux colonnes fantômes (écrites par un writer, absentes de tout schéma)

| Colonne écrite | Par | Absente de | Preuve |
|---|---|---|---|
| `focus_sessions.mode` | `startFocusSession` | `0002_productivity.sql`, `powersync-schema.ts`, `sqlite-schema.ts` | `focus.ts:64` ; `grep -nE "^\s+mode\s+" 0002_productivity.sql` → **aucune colonne `mode`** (§M6) |
| `focus_sessions.linked_task_ids` | `startFocusSession` | idem | `focus.ts:70` ; `grep -rn "linked_task_ids"` → **ABSENT** |

Même famille que D3 (`tasks.tags`, corrigé par `0032`) : la mutation est acceptée
**localement** (`EngineLocalStoreBridge`, une Map), affichée, puis **perdue à
l'upsync** — un PATCH vers une colonne inexistante. Le writer audit de
`domain-schema-drift.test.ts` (`:403-406`) n'appelle **pas** `startFocusSession` →
**aucune garde** ne voit ces deux colonnes.

> **Note de conception** : la table porte `task_id` (singulier, `0002:116`) mais le
> writer écrit un **OR-Set** `linked_task_ids` (`focus.ts:70`) — la modélisation
> « plusieurs tâches liées » n'a pas de colonne. C'est le fond du drift, pas
> seulement le nom. Décision AD-15 requise (colonne additive ou re-modélisation) —
> **correction interdite** ici.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:14-15`.

| Capacité | Matrice | Registre | Confirmation | Niveau |
|---|---|---|---|---|
| `focus.start` | L14 | `capability.ts:87` (outil `startFocus`, `tools.ts:104`) | **oui** (matrice L14 + `capability.ts:93`) | `FULL` |
| `focus.block` | L15 | `capability.ts:97` (outil `blockApps`, `tools.ts:120`) | **oui** | `PLATFORM_DEPENDENT` (android + device owner, OQ-17) |
| `call.policy` | L31 | — | opt-in explicite | `NOT_AGENT_ENABLED (V1)` |

**Émissions** : `startFocus` → `focus.start` (`tools.ts:115`) ; `blockApps` →
`focus.blocklist` (`tools.ts:127`) ; `pomodoroSchedule` → `productivity.pomodoro_plan`
(`tools.ts:1278`). Capacité `focus.pomodoro` enregistrée (`capability.ts:662`).

> **Écart constaté (documenté, non corrigé)** : `blockApps` émet
> `focus.blocklist` (`tools.ts:127`) tandis que la capacité s'appelle
> `focus.block` (`capability.ts:97`). Nom de commande ≠ id de capacité. Classe :
> doc-lag de nommage. Décision AD-15 requise.

> **Chemin non abouti** : `focus.start`, `focus.blocklist`,
> `productivity.pomodoro_plan` ne sont appliqués par **aucun** consommateur
> serveur (`grep` sur `supabase/functions/` → aucune branche). L'exécution d'une
> session reste **device-side** (le DPC est local) — cohérent avec AD-3, mais le
> chemin agent **serveur** est `NOT_READY`.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:100` +
`docs/frontend/module-ownership-matrix.md`.

| Écran | Route | Statut spec |
|---|---|---|
| `focus-mode` (7 états + blocklist + DPC) | `/focus` | `SPÉCIFIABLE` — `_inventory.md:100` |

**Route réelle** : `/focus` (`apps/mobile/src/router.tsx:118`), gardée par
`FeatureGate feature="focus"`, page `FocusProfilesRoute`
(`router.tsx:43`). L'écran est `offline-capable (device)` ; le blocage d'apps est
`PLATFORM_DEPENDENT v1.8 DPC (OQ-17)` (`_inventory.md:100`).

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) : à
exercer par l'écran (aucune preuve d'exécution dans ce document).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Ouvrir / fermer une session | ✅ (file locale) | `ProductivityCommand` (AD-2/AD-7) |
| Machine à états Pomodoro | ✅ | pur, sans I/O (`focus.ts:120`) |
| Blocklist (règles locales) | ✅ | `toggleBlockRule` (`focus.ts:181`) |
| Blocage système (DPC) | ✅ **device-side** | `FocusControllerPort` local (HYPATIYAS) — jamais le réseau |
| Demander à l'agent de lancer un focus | ❌ **réseau requis** | `fn-agent-run` + job — voir `agent.kernel` §M5 |

**Classe offline** : `offline-capable (device)` (`master-feature-catalog.md` ;
`_inventory.md:100`).

> **Réserve** : `mode` et `linked_task_ids` sont acceptés **localement** mais
> **perdus à l'upsync** (§M2). Ne pas lire ce tableau comme une garantie de
> durabilité tant que le drift n'est pas tranché.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/productivity test        # tests du module — 16/16 vert
grep -nE "^\s+mode\s+" supabase/migrations/0002_productivity.sql   # → aucune colonne `mode`
grep -rn "linked_task_ids" supabase/migrations/0002_productivity.sql packages/data/src/powersync-schema.ts packages/data/src/sqlite-schema.ts  # → ABSENT
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests** au total
(commande ci-dessus : `tests 16 / pass 16 / fail 0`), dont pour ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `focus: session start/end + pomodoro state machine` | 199 | `startFocusSession` écrit `focus_sessions` ; `endFocusSession` passe le statut à `ended` et calcule `actual_duration_sec` (30 min) ; `tickPomodoro` bascule focus → pause courte et signale `transitioned` |

### Seuils

Référence : `docs/testing/matrix.md`. Le domaine est couvert (1 test exécuté) ;
les **deux colonnes fantômes** (`mode`, `linked_task_ids`) ne sont gardées par
**aucun** test → `NOT_READY` sur ce point précis. La **surface** et le **chemin
agent serveur** ne sont pas prouvés → §M3/§M4.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **MF-1** | `focus_sessions.mode` : colonne à créer (migration additive) ou dériver le mode ailleurs ? | **ouverte** — AD-15 ; **correction interdite** ici |
| **MF-2** | `focus_sessions.linked_task_ids` : la table a `task_id` (singulier) — ajouter une colonne OR-Set ou revenir à 1 tâche ? | **ouverte** — AD-15 ; **correction interdite** ici |
| **MF-3** | Étendre le writer audit à `startFocusSession`/`createRoutine`/`recordHabitCompletion` (les 3 writers non couverts) ? | **ouverte** — c'est la garde qui aurait vu ces drifts |
| **MF-4** | `focus.blocklist` (commande) vs `focus.block` (capacité) : aligner ? | **ouverte** — décision AD-15 |
| **MF-5** | Qui applique `focus.start` côté serveur ? | **ouverte** — aucune route ; le DPC reste device-side |
