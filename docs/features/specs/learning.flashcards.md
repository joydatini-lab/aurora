# Spec de module MVP — `learning.flashcards`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2a/specs-modules-1-6`.
> **Statut du module** : `IMPLEMENTED` (FSRS pur + handler de tick testés, 31/31)
> — mais l'état `lapses` **n'est pas persisté** (voir §M2).
> **Priorité** : **V2** (Learning, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Cœur FSRS pur (`fsrsNext`, déterministe, sans I/O) | ✅ | `packages/learning/src/fsrs.ts:78` |
| Paramètres FSRS v5 gelés (19 poids + retention + steps) | ✅ | `FSRS_PARAMS` — `fsrs.ts:49` ; décroissance `FSRS_DECAY` `fsrs.ts:46` |
| Service de revue : avance l'état + émet `FlashcardReviewed` | ✅ | `FlashcardService` — `fsrs.ts:195` ; `review()` `fsrs.ts:214` |
| Balayage quotidien **serveur** `fsrs-tick` (job persisté, AD-8) | ✅ | `buildFsrsTickHandler` — `packages/learning/src/jobs.ts:134` |
| Enfilage du tick via cron (1 job/user/jour, idempotent) | ✅ | `aurora_fsrs_tick` — `supabase/migrations/0014_cron_placeholders.sql:39` |
| Génération de cartes (job, AD-8) | ✅ (agent) | capacité `flashcard.generate` — `capability.ts:350` |
| **Hors v1** : `LearningPort.due()` retourne `[]` (non câblé à un repo) | ❌ | `fsrs.ts:245-249` |
| **Hors v1** : écriture `ProgressEvidence` (interdit F-07) | ❌ | `fsrs.ts:7-8` |

**Vocabulaire fermé** : rating `0..5` (`fsrs.ts:23`, CHECK SQL `0003:87`).

---

## §M2 Contrat de données

### Deux tables propriétaires (SSoT = migration, AD-15)

`supabase/migrations/0003_learning.sql` : `flashcards` (`:64`), `reviews` (`:82`).

**`flashcards`** (`0003:64-80`) :

| Colonne | Type | Note |
|---|---|---|
| `id` / `user_id` | `uuid` | `user_id NOT NULL` → `auth.users` — `0003:66` |
| `course_id` | `uuid` → `courses` (CASCADE) | `0003:67` |
| `front` / `back` | `text NOT NULL` / `text` | `0003:68-69` |
| `due` | `timestamptz` | prochaine échéance — `0003:71` |
| `stability` / `difficulty` | `numeric(10,4)` | **jamais 0..1 : en jours / 1..10** — `0003:72-73` |
| `last_reviewed_at` | `timestamptz` | `0003:74` |
| `crdt_added` / `crdt_removed` / `local_mutation_id` | `jsonb` / `text` | `0003:75-77` |

**`reviews`** (`0003:82-95`) : `flashcard_id` → `flashcards` (CASCADE), `skill_id`
→ `skills` (SET NULL), `rating int NOT NULL CHECK (rating BETWEEN 0 AND 5)`
(`0003:87`), `reviewed_at` (`0003:88`), `fsrs_state jsonb` (`0003:89`).

### RLS — héritée, pas ajoutée

`flashcards` et `reviews` sont dans la boucle générique `0003_learning.sql:113-120`
(liste `:114`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`<table>_user_isolation` (`user_id = auth.uid()`). Le module ne pose **aucune**
policy.

### Écriture — single-writer (AD-7 / F-03)

Le module écrit **uniquement** `flashcards` (via le handler, PATCH par carte —
`fn-job-dispatcher/index.ts:269-277`) et `reviews`. Il **ne crée jamais**
`ProgressEvidence` (`fsrs.ts:7-8`, F-07).

### Synchronisation — **`flashcards` n'est PAS miroité**

`sync-config.yaml` (stream `learning`, `:74-78`) ne streame que `courses`,
`subjects`, `skills`, `learning_sessions`, `reviews`. **`flashcards` est absent**
(`grep -n "flashcards" powersync/sync-config.yaml` → **aucun résultat**), et
absent du schéma client (`grep -n "flashcards:" packages/data/src/powersync-schema.ts`
→ **aucun résultat**). Confirmé par `apps/mobile/src/lib/learning-repo.ts:18-20` :
« Les tables `flashcards` / `learning_items` / `courses` ne sont PAS miroitées
(server-only, AD-7) ». Conséquence : `reviews` est lisible hors-ligne
(`sync-config.yaml:78`, stream `learning` `:71`), `flashcards` non — la lecture d'une carte exige le
réseau.

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DF-1** | **`lapses` n'existe dans aucune table.** Le dispatcher lit `lapses: Number(r.lapses ?? 0)` (`fn-job-dispatcher/index.ts:257`) alors que `flashcards` n'a **pas** de colonne `lapses` (`grep -rn "lapses" supabase/migrations/0003_learning.sql` → **ABSENT**). Le `select` ne demande même pas la colonne (`:246` : `select=id,due,stability,difficulty`). Conséquence : `lapses` vaut **toujours 0** → le compteur d'échecs ne survit pas d'un tick à l'autre. |
| **DF-2** | **`saveSchedule` ne persiste pas `lapses`.** Le PATCH écrit `due`, `stability`, `difficulty`, `last_reviewed_at`, `updated_at` (`:271-276`) — pas `lapses`. Le `CardSchedule` porte pourtant `lapses` (`jobs.ts:54-59`). |
| **DF-3** | **Le domaine décrit `stability`/`difficulty` en `0..1`** (`packages/domain/src/entities-learning.ts:117-120` : « `/** 0..1 */` ») alors que l'implémentation les produit sur `1..10` (`fsrs.ts:148` (`clamp(stability,1,10)`)) et que la colonne est `numeric(10,4)` (`0003:72-73`). Le commentaire de type est faux, pas la valeur. |

Même famille que les drifts `tasks.tags` (corrigés par `0032`) : la valeur est
**acceptée** puis **perdue** à l'upsync. Aucune garde ne les voit : le writer
audit de `domain-schema-drift.test.ts` (`:403-406`) n'appelle **pas**
`buildFsrsTickHandler`, et `flashcards` n'est pas dans `PAIRS`
(`tests/db/domain-schema-drift.test.ts:154-160`).

> **Documentation, pas correction** (consigne) : DF-1/DF-2 exigent une migration
> additive (`flashcards.lapses`) ou un déplacement de l'état dans `reviews.fsrs_state`
> — décision AD-15, hors périmètre de ce document.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:17`.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `qcm.generate / flashcard.generate` | matrix L17 ; `capability.ts:350` |
| Outil | `flashcard_generate` | `capability.ts:351` |
| Énoncé type | « make me QCM on X » | matrix L17 |
| Scopes | `learning:read, knowledge:read` / `learning:write (items)` | matrix L17 |
| Confirmation | **non** | matrix L17 |
| Dégradation AD-1 | `degraded quality flag` | matrix L17 |
| Garde | `fidelity check (ADR §17)` | matrix L17 |
| Reprise | `job retry` | matrix L17 |
| Niveau | `FULL` | matrix L17 |

> **Périmètre** : le chemin agent couvre la **génération** (job AD-8), pas la
> **revue** d'une carte. La revue est device-side (`FlashcardService.review`,
> `fsrs.ts:214`) — elle n'est ni une capacité ni une commande agent. Le tick est
> déclenché par **cron** (`0014:39`), pas par l'agent.

> **Chemin serveur du tick** : `buildFsrsTickHandler` (`jobs.ts:134`) est bien
> injecté dans le dispatcher (`fn-job-dispatcher/index.ts:242`), qui détient les
> seams REST (`:240-277`). Mais le déploiement du dispatcher est **hors ligne**
> (voir `docs/operations/2026-10-27-remediation-job-queue.md`, AD-7 côté ops) :
> le code est présent, l'exécution live dépend du déploiement EF + du vault.
> Statut : **`NOT_READY`** pour l'exécution live du tick.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:111`.

| Écran | Route | Statut spec |
|---|---|---|
| `flashcards (FSRS)` | `/learn/:id` (overlay) | `SPÉCIFIABLE` — `_inventory.md:111` |

**Routes réelles** : `/learn` (`apps/mobile/src/router.tsx:77`) et `/learn/:id`
(`router.tsx:94`) ; overlays flashcards/QCM/exercices (`router.tsx:167`). Pages
`LearnPage` / `LearnDetailPage` (`router.tsx:37`).

**Classe offline** : `offline-capable (review) / online (génération + tick job)`
(`_inventory.md:111`).

> **Réserve mesurée** : la page lit une liste « Due reviews » (`pages/learn/index.tsx:88`,
> « the read-only review mirror ») et le bloc flashcards **pointe vers `/inbox`**
> (`pages/learn/index.tsx:54`) — le flow de revue n'est pas câblé à
> `MobileDataProvider` (`pages/learn/index.tsx:10`). L'écran n'est donc pas
> prouvé bout-en-bout.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire les revues (`reviews`) | ✅ | stream PowerSync (`sync-config.yaml:78`, stream `learning` `:71`) |
| Lire une carte (`flashcards`) | ❌ **réseau requis** | table **non miroitée** (§M2) |
| Avancer l'état FSRS (pur) | ✅ | `fsrsNext` sans I/O (`fsrs.ts:78`) |
| Tick quotidien serveur | ❌ **réseau + dispatcher** | cron → `job_queue` → `fn-job-dispatcher` (`0014:39`, `fn-job-dispatcher:242`) |
| Émettre `FlashcardReviewed` | ✅ (local) | `FlashcardService.review` (`fsrs.ts:214`) |

**Classe offline** : mixte (`_inventory.md:111`).

> **Réserve** : `lapses` n'est pas persisté (§M2 DF-1/DF-2) → l'état affiché est
> **partiel** après un tick. Ne pas lire ce tableau comme une garantie de
> fidélité de l'état.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/learning test        # tests du module — 31/31 vert
grep -rn "lapses" supabase/migrations/0003_learning.sql packages/data/src/powersync-schema.ts packages/data/src/sqlite-schema.ts  # → ABSENT
grep -n "flashcards" powersync/sync-config.yaml  # → aucun résultat (non miroité)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/learning test` → **31 tests, 31 pass, 0 fail** (exécuté).
Tests du cœur FSRS :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `fsrs: new card "Good" lands on the 5-min learning step` | `learning.test.ts:73` | carte neuve, rating 3 → échéance +5 min, `stability` dans `[1,10]`, `lapses=0` |
| `fsrs: failure increments lapses and shrinks stability` | `learning.test.ts:80` | rating 0 → `lapses` incrémenté à 1 et `stability` réduite |
| `fsrs: FlashcardService returns a well-formed FlashcardReviewed event` | `learning.test.ts:91` | l'événement porte `type:'FlashcardReviewed'`, `cardId`, `fsrsState.stability` |
| `fsrs-tick: advances every due card and leaves future cards alone` | `jobs.test.ts:60` | le tick ne touche que les cartes dues |
| `fsrs: regression — a review must schedule DAYS ahead, not one minute` | `jobs.test.ts:80` | garde de la régression d'intervalle (le bug `nextStabilityToDays` décrit `fsrs.ts:182`) |
| `fsrs-tick: pushes each card forward, never backwards` | `jobs.test.ts:100` | monotonie de l'échéance |
| `fsrs-tick: a brand-new card (no state) is initialised, not skipped` | `jobs.test.ts:114` | `state=null` → initialisation |
| `fsrs-tick: idempotent — a second run finds nothing due` | `jobs.test.ts:126` | AD-8 idempotence |
| `fsrs-tick: default rating is Good, and the FSRS params are the frozen v5 set` | `jobs.test.ts:165` | défaut `Good` + gel des 19 poids |

### Seuils

Référence : `docs/testing/matrix.md`. Le cœur algorithmique est **solidement**
couvert (9 tests exécutés, dont une garde de régression). Les drifts **DF-1/DF-2**
(`lapses` non persisté) ne sont gardés par **aucun** test → `NOT_READY` sur ce
point. La **surface** (`/learn/:id` non câblé) et le **tick live** (dispatcher non
déployé) ne sont pas prouvés → `NOT_READY`.

> **Note de statut doc** : `docs/learning/overview.md:3` déclare le module
> `DESIGNED_NOT_IMPLEMENTED`. Mesure : le cœur FSRS **est** implémenté et testé.
> La doc est en retard sur le code (doc-lag, pas un défaut de code).

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **ML-1** | `flashcards.lapses` : ajouter la colonne (migration additive) ou déplacer l'état dans `reviews.fsrs_state` ? | **ouverte** — AD-15 ; **correction interdite** ici |
| **ML-2** | Faut-il persister `lapses` dans le PATCH `saveSchedule` (`fn-job-dispatcher:271-276`) ? | **ouverte** — dépend de ML-1 |
| **ML-3** | Corriger les commentaires `0..1` de `FsrsState` (`entities-learning.ts:117-120`) vers `1..10` ? | **ouverte** — fichier `packages/domain/src/**` **interdit** ici ; demande documentée |
| **ML-4** | `flashcards` doit-il être miroité (pour la revue hors-ligne) ou la revue reste-t-elle server-only ? | **ouverte** — décision AD-7/AD-15 |
| **ML-5** | Câbler `/learn/:id` au flow de revue (aujourd'hui vers `/inbox`) ? | **ouverte** — preuve de surface |
| **ML-6** | Déployer `fn-job-dispatcher` + secret vault pour que le tick draine ? | **ouverte** — ops (voir runbook `2026-10-27-remediation-job-queue.md`) |
