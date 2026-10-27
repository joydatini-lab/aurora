# Spec de module MVP — `productivity.habits`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `IMPLEMENTED` (domaine + streaks + heatmap testés) —
> mais il porte **trois drifts de colonnes** documentés ci-dessous (non corrigés).
> **Priorité** : **V2** (Productivity restant, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Créer une habitude (titre, cadence daily/weekly/custom, jours, règle) | ✅ | `createHabit` — `packages/productivity/src/habits.ts:30` |
| Marquer fait pour un jour (ISO `YYYY-MM-DD`) | ✅ | `recordHabitCompletion` — `habits.ts:59` |
| Calcul de **série** (`current` / `best`) selon la cadence | ✅ | `habitStreak` — `habits.ts:79` |
| **Heatmap** d'adhérence (N semaines de cellules jour) | ✅ | `habitHeatmap` — `habits.ts:157` ; contrat `HeatmapCell` `habits.ts:150` |
| Créer une **routine** (ancres temporelles + steps + habits attachés) | ✅ | `createRoutine` — `habits.ts:197` |
| **Hors v1** : notifications de rappel propres à l'habitude, cadence « tous les 2 jours » native (passée via `recurrenceRule` custom), partage | ❌ | non trouvé dans `packages/productivity/src/habits.ts` |

**Vocabulaire fermé** : 3 cadences `daily/weekly/custom` (`habits.ts:17`) ; 4
types de routine `morning/evening/study/custom` (`habits.ts:190`).

---

## §M2 Contrat de données

### Deux tables propriétaires (SSoT = migration, AD-15)

`supabase/migrations/0002_productivity.sql` : `habits` (`:84`), `routines` (`:99`).

**`habits`** (`0002:84-97`) :

| Colonne | Type | Note |
|---|---|---|
| `id` / `user_id` | `uuid` | `user_id NOT NULL` → `auth.users` — `0002:86` |
| `name` | `text NOT NULL` | **la colonne s'appelle `name`** — `0002:87` |
| `frequency` | `jsonb NOT NULL DEFAULT '{}'` | spec d'ancre temporelle — `0002:88` |
| `target` | `text` | `0002:89` |
| `status` | `text` CHECK `active/paused/dropped` | `0002:90` |
| `streak` | `int NOT NULL DEFAULT 0` | `0002:91` |
| `crdt_added` / `crdt_removed` / `local_mutation_id` | `jsonb` / `text` | `0002:92-94` |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` — `0002:95-96` |

**`routines`** (`0002:99-112`) : `name text NOT NULL` (`:102`), `anchor jsonb`
(`:103`), `steps jsonb` (`:104`), `status` CHECK `active/paused/archived` (`:105`).

### RLS — héritée, pas ajoutée

`habits` et `routines` sont dans la boucle générique `0002_productivity.sql:174-202`
(liste `:178`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`<table>_user_isolation` (`user_id = auth.uid()`) + policy `_service_role`
`SELECT` bornée. Le module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

Chaque cas d'usage retourne un `ProductivityCommand` **partiel** sur une table
propriétaire (`habits`/`routines`) ; `recordHabitCompletion` retourne un patch
`completions_add` (`habits.ts:71`). Une mutation = une commande = une table.

### Synchronisation

`habits` (`sync-config.yaml:51`) et `routines` (`:52`) sont dans le stream
PowerSync → **disponibles hors-ligne**. Schéma client :
`packages/data/src/powersync-schema.ts:124` (`habits`), `:140` (`routines`) ;
la colonne client s'appelle bien `name` (`:127`), `frequency` (`:128`).

---

### ⚠ Drift de colonne `name`/`title` (documenté, **non corrigé**)

C'est le drift demandé explicitement. Il est **réel, mesuré, et à trois étages** :

| Étage | Ce qu'il déclare | Preuve |
|---|---|---|
| **Base (SSoT)** | `habits.name` / `routines.name` | `0002_productivity.sql:87`, `:102` |
| **Schéma client PowerSync** | `name` (correct depuis le fix) | `powersync-schema.ts:127` (`habits`), `:143` (`routines`) |
| **Domaine** | `Habit.title` / `Routine.title` | `packages/domain/src/entities-productivity.ts:105`, `:120` |
| **Writer module** | écrit `name` (traduit depuis `input.title`) | `habits.ts:39`, `:210` |
| **Lecteur device** | lit `name`, avec repli `title` | `apps/mobile/src/lib/productivity-repo.ts:203`, `:225` |

**Le drift historique et sa trace.** Le commentaire d'en-tête de la garde
`tests/db/client-schema-drift.test.ts:10-23` documente le défaut d'origine :

> « `habits` declared `title`/`description`/`active` while the table has
> `name`/`target`/`status`/`streak`. […] So `habits.name` arrives from the relay
> and is stored, but NO application code can read it; and `habits.title` is
> declared, so reads return undefined without error. The `/habits` page renders
> empty titles, silently. »

Le lecteur device porte la trace du correctif
(`productivity-repo.ts:198-203`) :

> « `habits` has NO `title` column — it is `name` (0002). Reading `row.title`
> first always yielded `''`, so every habit rendered with an empty title while
> the real value sat unread in the mirror […] `title` is kept as a fallback only
> for a hypothetical renamed mirror. »

**État actuel** : le schéma client (`powersync-schema.ts:127`) et le lecteur
(`productivity-repo.ts:203`) sont **alignés sur `name`**. La garde
`client-schema-drift.test.ts` est **verte** (exécutée en §M6, 5/5). Le drift
`name`/`title` n'est donc **plus actif côté schéma**, mais il **reste un drift
d'interface domaine** : le domaine expose `Habit.title` (`entities-productivity.ts:105`)
là où la base a `name`. C'est un **renommage délibéré, non enregistré** dans
`domain-schema-drift.test.ts` : `Habit` **ne figure pas** dans `PAIRS`
(`tests/db/domain-schema-drift.test.ts:154-160` ne liste que
`Project/Task/Goal/Artifact/CanvasSession`) → le couple `Habit.title → habits.name`
n'est **gardé par aucun test**.

### ⚠ Deux colonnes fantômes (écrites par un writer, absentes de tout schéma)

| Colonne écrite | Par | Absente de | Preuve |
|---|---|---|---|
| `habits.completions_add` | `recordHabitCompletion` | `0002_productivity.sql`, `powersync-schema.ts`, `sqlite-schema.ts` | `habits.ts:71` ; `grep -rn "completions_add"` → **ABSENT** (§M6) |
| `routines.attached_habit_ids` | `createRoutine` | idem | `habits.ts:214` ; `grep` → **ABSENT** |

Même famille que D3 (`tasks.tags`/`recurrence_rule`, corrigés par `0032`) : la
mutation est **acceptée localement** (`EngineLocalStoreBridge`, une Map), affichée,
puis **perdue à l'upsync** — un PATCH vers une colonne inexistante. Le writer
audit de `domain-schema-drift.test.ts` (`:460-499`) n'inspecte **pas** ces deux
fonctions (il n'appelle que `createTask`, `createProject`, `updateProject`,
`createArtifact` — `:403-406`), donc **aucune garde ne les voit**.

> **Documentation, pas correction** (consigne) : ces deux colonnes exigent une
> décision AD-15 (migration additive `completions` ou re-modélisation
> `routines.attached_habit_ids`) — hors périmètre de ce document.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:13`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `habit.checkin` | matrix L13 ; `capability.ts:303` |
| Outil | `habit_checkin` | `capability.ts:304`, `tools.ts:664` |
| Énoncé type | « I did X » | matrix L13 |
| Scopes | `productivity:read` / `productivity:write` | matrix L13 |
| Confirmation | **non** | matrix L13 |
| Destructif | non | matrix L13 |
| Dégradation AD-1 | coche manuelle | matrix L13 |
| Niveau | `FULL` | matrix L13 |

**Capacités enregistrées au-delà de la matrice** : `habit.create`
(`capability.ts:312`, outil `habitCreate` `tools.ts:677` émet
`productivity.habit_create` `tools.ts:690`), `routine.create`
(`capability.ts:321`, outil `routineCreate` `tools.ts:694` émet
`productivity.routine_create` `tools.ts:705`), `habit.rename`
(`capability.ts:577`, outil `habitRename` `tools.ts:1127` émet
`productivity.habit_update` `tools.ts:1138`).

> **Écart constaté (documenté, non corrigé)** : `habitCheckin` émet
> `productivity.habit_checkin` (`tools.ts:672`) et `habitRename` émet
> `productivity.habit_update` (`tools.ts:1138`) ; **aucun consommateur serveur**
> ne les applique (vérifié : `grep` sur `supabase/functions/` → aucune branche).
> Chemin agent **enregistré mais non abouti** → `NOT_READY` pour l'application
> serveur de ces commandes.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md` +
`docs/frontend/module-ownership-matrix.md`.

| Écran | Route | Statut spec |
|---|---|---|
| `habitudes` | `/habits` | `SPÉCIFIABLE` — `_inventory.md:95` |
| `routines` | `/routines` | `SPÉCIFIABLE` — `_inventory.md:96` |

**Routes réelles** : `/habits` (`apps/mobile/src/router.tsx:127`) et `/routines`
(`router.tsx:128`), **non gatées** (`router.tsx:124-127` : « Ungated » — entité
de domaine locale). Pages : `HabitsPage` (`router.tsx:54`), `RoutinesPage`
(`router.tsx:55`).

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) : la page
habitudes rend un état vide explicite (`apps/mobile/src/pages/habits/index.tsx:170`,
`data-state="empty"`).

> **Note** : la heatmap `HabitStreak` est rendue par AntV G2 dans `@aurora/ui`
> (`habits.ts:6-7`) — le package reste **vendor-free** (AD-1).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire habitudes / routines | ✅ | streams PowerSync (`sync-config.yaml:51,52`) |
| Créer / cocher | ✅ (file locale) | `ProductivityCommand` (AD-2/AD-7) |
| Calcul de série + heatmap | ✅ | pur, sans I/O (`habits.ts:79,157`) |
| Demander à l'agent de cocher | ❌ **réseau requis** | `fn-agent-run` + job — voir `agent.kernel` §M5 |

**Classe offline** : `offline-capable` (`master-feature-catalog.md:24`).

> **Réserve** : une coche écrite via `completions_add` (`habits.ts:71`) est
> acceptée **localement** mais **perdue à l'upsync** (colonne inexistante, §M2).
> En apparence « hors-ligne OK » ; en réalité, **non persistée**. Ne pas lire ce
> tableau comme une garantie de durabilité tant que le drift n'est pas tranché.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/productivity test        # tests du module — 16/16 vert
node --experimental-strip-types --no-warnings --test tests/db/client-schema-drift.test.ts  # 5/5 vert
grep -rn "completions_add" supabase/migrations/0002_productivity.sql packages/data/src/powersync-schema.ts packages/data/src/sqlite-schema.ts  # → ABSENT
grep -rn "attached_habit_ids" supabase/migrations/0002_productivity.sql packages/data/src/powersync-schema.ts packages/data/src/sqlite-schema.ts  # → ABSENT
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests** au total
(commande ci-dessus : `tests 16 / pass 16 / fail 0`), dont pour ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `habits: streak + heatmap` | 183 | `habitStreak` (série 3 maintenue, série rompue sur jour requis manqué) + `habitHeatmap` (28 cellules sur 4 semaines, valeur `1` sur un jour coché) |

`tests/db/client-schema-drift.test.ts` — **5/5 vert** (exécuté) : il garde que
`habits.name` existe côté migration (`:233-235`) et que le schéma client ne
déclare aucune colonne absente de la base. **Il ne garde pas** les deux colonnes
fantômes (`completions_add`, `attached_habit_ids`) car il ne compare que les
colonnes **déclarées**, pas celles qu'un **writer émet** — et le writer audit de
`domain-schema-drift.test.ts` (`:403-406`) n'appelle pas `recordHabitCompletion`
ni `createRoutine`.

### Seuils

Référence : `docs/testing/matrix.md`. Le domaine est couvert (1 test exécuté) ;
le drift de surface est gardé (`client-schema-drift` 5/5) ; les **deux colonnes
fantômes** et le **drift d'interface `Habit.title`** ne sont gardés par **aucun**
test → `NOT_READY` sur ces deux points précis.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **MH-1** | `habits.completions_add` : colonne à créer (migration additive) ou remplacer par une table de complétions ? | **ouverte** — AD-15 ; **correction interdite** ici |
| **MH-2** | `routines.attached_habit_ids` : colonne à créer ou re-modéliser ? | **ouverte** — AD-15 ; **correction interdite** ici |
| **MH-3** | Enregistrer le renommage `Habit.title → habits.name` dans `domain-schema-drift.test.ts` (ajouter `Habit`/`Routine` à `PAIRS`) ? | **ouverte** — couverture de preuve |
| **MH-4** | Étendre le writer audit aux writers `habits`/`routines` (`recordHabitCompletion`, `createRoutine`) ? | **ouverte** — c'est la garde qui aurait vu les colonnes fantômes |
| **MH-5** | Qui applique `productivity.habit_checkin` / `productivity.habit_update` côté serveur ? | **ouverte** — aucune route ; chemin agent `NOT_READY` |
