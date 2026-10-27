# Spec de module MVP — `productivity.calendar`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `IMPLEMENTED` — domaine calculé et testé, surface
> spécifiable (`_inventory.md:97-99`), chemin agent **enregistré mais non abouti**
> (voir §M3).
> **Priorité** : **V2** (Productivity restant, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Créer un événement (titre, début, fin, lieu, journée entière) | ✅ | `createEvent` — `packages/productivity/src/calendar.ts:35` |
| Replanifier (déplacer / redimensionner) un événement | ✅ | `rescheduleEvent` — `calendar.ts:67` |
| Détection de **conflits** (chevauchement, dos-à-dos) | ✅ | `detectConflicts` — `calendar.ts:114` (`kind: 'overlap' \| 'back-to-back'`) |
| Détection de **surcharge** (≥ 3 événements dans la même heure) | ✅ | `calendar.ts:114` (`kind: 'overload'`, buckets `calendar.ts:139-150`) |
| **Time blocking** (plan de la journée depuis des fenêtres libres) | ✅ | `planTimeBlocks` — `calendar.ts:181` (heuristique LPT, buffer 15 min par défaut) |
| Récurrence **matérialisée** (1 ligne par occurrence) | ✅ | `materializeRecurringEvent` — `calendar.ts:220` ; doc `calendar.ts:9-10` |
| **Hors v1** : synchronisation d'un calendrier externe (Google/CalDAV), invitations/participants, fuseaux horaires par événement | ❌ | non trouvé dans `packages/productivity/src/calendar.ts` |

**Vocabulaire fermé** : 3 types de conflit (`overlap`/`back-to-back`/`overload` —
`calendar.ts:88-95`). Les règles de récurrence réutilisent `nextRecurrence`
(`packages/productivity/src/tasks.ts`, importé `calendar.ts:17`).

---

## §M2 Contrat de données

### Table propriétaire `calendar_events` (SSoT = migration, AD-15)

`supabase/migrations/0002_productivity.sql:153` (renommée depuis `events` pour
éviter la collision avec l'Event History — `0002_productivity.sql:151-152`).

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid PK` | `0002:154` |
| `user_id` | `uuid NOT NULL` → `auth.users` | isolation RLS — `0002:155` |
| `title` | `text NOT NULL` | `0002:156` |
| `description` | `text` | `0002:157` |
| `start_at` | `timestamptz NOT NULL` | `0002:158` |
| `end_at` | `timestamptz` | `0002:159` (optionnel : défaut 30 min, `calendar.ts:97-107`) |
| `all_day` | `boolean NOT NULL DEFAULT false` | `0002:160` |
| `recurrence` | `jsonb NOT NULL DEFAULT '{}'` | info matérialisée seulement — `0002:161` |
| `location` | `text` | `0002:162` |
| `crdt_added` / `crdt_removed` | `jsonb` | `0002:163-164` |
| `local_mutation_id` | `text` | traçabilité G-M4 — `0002:165` |
| `created_at` / `updated_at` | `timestamptz` | trigger `set_updated_at()` — `0002:166-167` |

### RLS — héritée, pas ajoutée

`calendar_events` est dans la boucle générique `0002_productivity.sql:174-202`
(liste `0002:179`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`calendar_events_user_isolation` (`USING`/`WITH CHECK` sur `user_id = auth.uid()`),
policy `calendar_events_service_role` en `SELECT` borné par `user_id`. Le module
ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

Chaque cas d'usage retourne un `ProductivityCommand` **partiel** sur la table
`calendar_events` (`createEvent` `calendar.ts:56-61`, `rescheduleEvent`
`calendar.ts:77-82`, `materializeRecurringEvent` `calendar.ts:235-249`), appliqué
par `LocalCommandRepository.apply('productivity', …)`. Une mutation = une
commande = une table. La détection de conflit et le time blocking sont **purs**
(aucun écrit).

### Synchronisation

`calendar_events` est dans le stream PowerSync
(`powersync/sync-config.yaml:56`), donc **disponible hors-ligne**. Le schéma
**client** porte la table et ses colonnes clés (`packages/data/src/powersync-schema.ts:192`
pour `calendar_events`, `:197` `start_at`, `:199` `all_day`).

> **Note de nommage** : le **serveur** nomme la table `calendar_events`
> (`0002:153`) ; l'**entité de domaine** locale est `Event`
> (`packages/domain/src/entities-productivity.ts:44`) et le mirror historique
> `events`. Les commentaires de code le documentent (`calendar.ts:9-10`,
> `0002:151-152`). Pas un drift de schéma — un alias documenté.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:11`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `calendar.schedule` | matrix L11 ; `packages/agent/src/capability.ts:78` |
| Outil | `schedule` | `capability.ts:79` |
| Énoncé type | « plan X on… » | matrix L11 |
| Scopes | `productivity:read` / `productivity:write` | matrix L11 ; `capability.ts:81-82` |
| Confirmation | **oui (conflit)** selon la matrice | matrix L11 (`CONFIRMATION_REQUIRED`) |
| Destructif | non | matrix L11 |
| Dégradation AD-1 | édition manuelle | matrix L11 |
| Niveau | `CONFIRMATION_REQUIRED` | matrix L11 |

> **Écart constaté (documenté, non corrigé)** : la matrice déclare la capacité
> `CONFIRMATION_REQUIRED` (matrix L11), mais l'entrée du registre porte
> `requiresConfirmation: false` (`capability.ts:83`). Deux SSoT se
> contredisent sur un point de sûreté. Classe : divergence registre ↔ matrice,
> pas un défaut de comportement runtime. Décision AD-15 requise.

> **Second écart** : l'outil `schedule` émet une commande
> `productivity.event_update` (`packages/agent/src/tools.ts:101`) mais
> **aucun consommateur ne l'applique** — `grep -rn "productivity.event_update"`
> ne renvoie que les définitions d'outils (`tools.ts:101,1113`) et un test
> d'émission (`packages/agent/test/rename-delete.test.ts:113`). Aucune branche
> serveur (`supabase/functions/fn-agent-run/`, `fn-canvas/`) ne traduit cette
> commande en écriture `calendar_events`. Chemin agent **enregistré mais non
> abouti** → `NOT_READY` pour l'application serveur.

---

## §M4 Contrat de surface

SSoT : `docs/frontend/module-ownership-matrix.md` +
`docs/design-system/screens/_inventory.md`.

| Écran | Route | Statut spec |
|---|---|---|
| `calendrier-jour` | `/calendar` (Pager jour) | `SPÉCIFIABLE` — `_inventory.md:97` |
| `calendrier-semaine` | `/calendar` (Pager semaine) | `SPÉCIFIABLE` — `_inventory.md:98` |
| `calendrier-mois` | `/calendar` (Pager mois) | `SPÉCIFIABLE` — `_inventory.md:99` |
| `calendrier` (enveloppe : Pager + éditeur de time-block + détail d'événement) | `/calendar` | `SPÉCIFIABLE` — `_inventory.md:128` |

**Route réelle** : `/calendar` est enregistrée dans
`apps/mobile/src/router.tsx:119` (`CalendarPage`, gardée par `FeatureGate
feature="calendar"`). La page vit dans `apps/mobile/src/pages/calendar/`
(`index.tsx` + `views/{DayView,MultiDayView,MonthView,YearView}.tsx`).

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) :
`UxStates` est importé par la page (`apps/mobile/src/pages/calendar/index.tsx:56`)
et l'état en ligne via `useOnlineStatus` (`index.tsx:57`).

> **Écart constaté (documenté, non corrigé)** : la page `CalendarPage` **ne
> consomme pas** les fonctions du domaine — `grep -rn "detectConflicts\|planTimeBlocks\|createEvent\|rescheduleEvent"`
> sur `apps/mobile/src/` → **aucun résultat**. La détection de conflit et le
> time blocking existent dans `packages/productivity/src/calendar.ts` mais ne
> sont **branchés sur aucune surface**. Classe : capacité domaine non exposée.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire l'agenda | ✅ | stream PowerSync `calendar_events` (`sync-config.yaml:56`) |
| Créer / déplacer un événement | ✅ (file locale) | `ProductivityCommand` (AD-2/AD-7) |
| Détecter conflits / surcharge | ✅ | pur, sans I/O — `detectConflicts` (`calendar.ts:114`) |
| Planifier les time blocks | ✅ | pur — `planTimeBlocks` (`calendar.ts:181`) |
| Matérialiser une occurrence | ✅ | `materializeRecurringEvent` (`calendar.ts:220`) |
| Synchroniser un calendrier **externe** | ❌ **réseau requis** | hors v1 (§M1) |
| Demander à l'agent de planifier | ❌ **réseau requis** | `fn-agent-run` + job — voir `agent.kernel` §M5 |

**Classe offline** : `offline-capable` (`master-feature-catalog.md:21`).

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/productivity test        # tests du module — 16/16 vert
grep -rn "detectConflicts\|planTimeBlocks\|createEvent\|rescheduleEvent" apps/mobile/src/  # → aucun résultat
grep -rn "productivity.event_update" --include=*.ts --include=*.tsx .  # → définition d'outil + 1 test d'émission
```

### Couverture actuelle (mesurée)

`packages/productivity/test/productivity.test.ts` — **16 tests** au total
(commande ci-dessus : `tests 16 / pass 16 / fail 0`), dont pour ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `calendar: conflicts, overload, time blocking` | 131 | `detectConflicts` (overlap + overload), `planTimeBlocks` (un item tient, le second déborde ; avec plus de place les deux tiennent), `createEvent` écrit `calendar_events` |
| `calendar: recurring event materialization` | 161 | `materializeRecurringEvent` retourne `null` ou une commande `calendar_events` |

### Seuils

Référence : `docs/testing/matrix.md`. Un test qui ne peut pas échouer n'est pas
une preuve. Le **domaine** est couvert (2 tests, exécutés). Le test de
matérialisation est **faible** — son assertion
(`cmd === null || cmd.table === 'calendar_events'`, `productivity.test.ts:167`)
accepte le cas dégénéré. La **surface** et le **chemin agent** ne sont pas
prouvés → §M3/§M4.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **MC-1** | `calendar.schedule` : `CONFIRMATION_REQUIRED` (matrice) ou `false` (registre `capability.ts:83`) ? | **ouverte** — décision AD-15 (divergence de sûreté) |
| **MC-2** | Qui applique la commande `productivity.event_update` (`tools.ts:101`) ? | **ouverte** — aucune route serveur ; chemin agent `NOT_READY` |
| **MC-3** | Brancher `detectConflicts`/`planTimeBlocks` sur `CalendarPage` ? | **ouverte** — capacité domaine non exposée |
| **MC-4** | Le test de matérialisation (`productivity.test.ts:167`) doit-il porter une assertion non dégénérée ? | **ouverte** — qualité de preuve |
