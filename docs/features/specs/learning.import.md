# Spec de module MVP — `learning.import`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2b/specs-modules-7-11`.
> **Statut du module** : `PARTIAL` — le **contrat** de pipeline et le **handler**
> sont écrits et testés (31/31 sur `@aurora/learning`), mais l'**exécution live**
> est incomplète (OCR = seam vide, ingestion KB = no-op, statuts écrits hors
> contrainte SQL). Voir §M2 drifts et §M6.
> **Priorité** : **V3** (Learning + Knowledge, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Contrat de pipeline d'import (capture → upload R2 → job) | ✅ | `CourseImportPipeline` — `packages/learning/src/course-import.ts:44` |
| Upload du document vers R2 (clé déterministe = idempotent AD-8) | ✅ | `capture()` — `course-import.ts:80` ; `r2KeySafe` `course-import.ts:125` |
| Enfilage du job `course_import` (OCR + ingestion KB + événement) | ✅ | `dispatchImport()` — `course-import.ts:91` |
| Enfilage d'un job `ocr` autonome pour un document déjà importé | ✅ | `dispatchOcr()` — `course-import.ts:105` |
| Vocabulaire de source fermé (`camera/pdf/web/manual/other`) | ✅ | `CourseImportSource` — `course-import.ts:20` |
| Handler serveur `course_import` : OCR puis ingestion KB | ✅ (code) | `buildCourseImportHandler` — `packages/learning/src/jobs.ts:187` |
| Idempotence : un import `done` n'est jamais ré-importé (AD-8) | ✅ | `jobs.ts:203` (branche `skipped: 'already-done'`) |
| Dégradation explicite si rien n'est extrait (AD-1) | ✅ | `jobs.ts:216-223` (`needs_manual`, `ok:true`) |
| Événement `CourseImported` (producer Learning) | ✅ (défini) | `packages/domain/src/events.ts:35` |
| **Hors v1** : `fn-import-course` réel (enfilage effectif) | ❌ | **stub wave-0** — `supabase/functions/fn-import-course/index.ts:26` |
| **Hors v1** : provider OCR réel | ❌ | `extract` est un seam, `NEEDS_DECISION` — `jobs.ts:101-103` ; dispatcher : `fn-job-dispatcher/index.ts:309` |
| **Hors v1** : ingestion KB effective | ❌ | `ingestKnowledge` no-op dans le dispatcher — `fn-job-dispatcher/index.ts:310` |

**Vocabulaire fermé** : 5 sources (`course-import.ts:20`) ; statuts du pipeline
(`queued → running → done | needs_manual`, `jobs.ts:207,214,218,230`) — voir le
drift **DL-1** en §M2.

---

## §M2 Contrat de données

### Une table propriétaire : `course_imports` (SSoT = migration, AD-15)

`supabase/migrations/0003_learning.sql:97-110` :

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid PK` | `0003:98` |
| `user_id` | `uuid NOT NULL` → `auth.users` (CASCADE) | isolation RLS — `0003:99` |
| `course_id` | `uuid` → `courses` (CASCADE) | `0003:100` |
| `source` | `text NOT NULL` | `0003:101` |
| `r2_key` | `text` | binaire en R2 (AD-16) — `0003:102` |
| `status` | `text NOT NULL DEFAULT 'queued'` | CHECK — `0003:103-104` |
| `job_id` | `text` | `0003:105` |
| `created_at` / `updated_at` | `timestamptz` | `0003:106-107` |

> **Pas de `crdt_*` ni de `local_mutation_id`** sur cette table (contrairement aux
> autres tables Learning) : `course_imports` est une **file d'état serveur**, pas
> un objet édité hors-ligne. Vérifié : `grep -c crdt` sur `0003:97-110` → **0**.

### RLS — héritée, pas ajoutée

`course_imports` est dans la boucle générique `0003_learning.sql:113-120` (liste
`:114`) : `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`course_imports_user_isolation` (`USING`/`WITH CHECK` sur `user_id = auth.uid()`).
Le module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

Le module écrit **uniquement** `course_imports` (via `setStatus`, PATCH par ligne
— `fn-job-dispatcher/index.ts:311-325`) et délègue l'ingestion KB à un port
(`ingestKnowledge`, `jobs.ts:104`) qui reste **sous la propriété de Knowledge**.
Le pipeline n'écrit **pas** les tables Knowledge directement.

### Synchronisation — **`course_imports` n'est PAS miroité**

Le stream `learning` (`powersync/sync-config.yaml:71-78`) ne streame que
`courses`, `subjects`, `skills`, `learning_sessions`, `reviews`.
**`course_imports` est absent** (`grep -n "course_imports" powersync/sync-config.yaml`
→ **aucun résultat**). L'état d'un import n'est donc lisible **qu'en ligne** —
cohérent avec `online-required` (§M5).

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DL-1** | **Le handler écrit des statuts hors contrainte SQL.** `setStatus` reçoit `'running'` (`jobs.ts:214`) et `'needs_manual'` (`jobs.ts:207,218`), alors que le CHECK n'autorise que `('queued','processing','done','failed')` (`0003:104`). Un PATCH réel de `'running'`/`'needs_manual'` viole la contrainte. Vérifié : `grep -rn "needs_manual" supabase/migrations/` → **aucun résultat** (exit 1). Les **tests passent** parce qu'ils utilisent un `setStatus` en mémoire (`jobs.test.ts:52`) qui ne voit pas le CHECK — aucun test n'exerce la vraie table. |
| **DL-2** | **`fn-import-course` n'enfile rien.** L'EF génère un `jobId` puis journalise — le `INSERT INTO job_queue` est un commentaire `Wave-0 stub` (`fn-import-course/index.ts:26-31`). Aucun job n'est créé par cette route. |
| **DL-3** | **L'ingestion KB est un no-op au déploiement.** `buildCourseImportHandler` reçoit `ingestKnowledge: async () => []` (`fn-job-dispatcher/index.ts:310`) et `extract: async () => ({ text: "", pageCount: 0 })` (`:309`). Conséquence : tout import dégrade systématiquement en `needs_manual` (`empty_extraction`), et **aucun document KB n'est produit**. |
| **DL-4** | **`CourseImported` n'est jamais émis.** L'événement est défini (`events.ts:35`) mais `buildCourseImportHandler` ne l'émet pas — il retourne `{ op, textLength, documentIds, needsManual }` (`jobs.ts:231-236`). Vérifié : `grep -n "CourseImported" packages/learning/src/jobs.ts` → **aucun résultat**. |

Même famille que les drifts `tasks.tags` (corrigés par `0032`) : la valeur est
**acceptée en test** puis **rejetée/perdue** au déploiement. `course_imports`
n'est pas dans `PAIRS` de `tests/db/domain-schema-drift.test.ts` — aucune garde
automatique.

> **Documentation, pas correction** (consigne) : DL-1 exige une migration additive
> (élargir le CHECK, ou renommer les statuts du handler vers `processing`) —
> décision AD-15, hors périmètre de ce document.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md` — **la matrice ne porte pas de
ligne `learning.import`** (vérifié : `grep -n "learning.import" feature-agentability-matrix.md`
→ **aucun résultat**, exit 1, §M6). L'entrée de capacité existe pourtant dans le
registre.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `learning.import` | `packages/agent/src/capability.ts:370` |
| Outil | `learning_import` | `capability.ts:371`, `packages/agent/src/tools.ts:758` |
| Description | « Ingest course materials for a course (G-L5 course_import job, AD-8) » | `capability.ts:372` |
| Scopes | write `learning:write` ; read `learning:read`, `artifact:read` | `capability.ts:373-374` |
| Confirmation | **non** (`requiresConfirmation: false`) | `capability.ts:376` |
| Destructif | non | `capability.ts:375` |
| Dépendance | `course-importer` | `capability.ts:378` |
| Classe offline | `online-required` | `capability.ts:377` |
| Niveau | outil **thin** (`{ ok, jobKind, payload }`) | `tools.ts:766` |

> **Écart constaté (documenté, non corrigé)** : l'outil émet `{ ok: true, jobKind:
> 'course_import', payload }` (`tools.ts:766`) mais **aucun consommateur ne
> l'applique** — `fn-import-course` est un stub (DL-2) et le dispatcher ne reçoit
> pas cette commande depuis l'agent. Le chemin agent est **enregistré mais non
> abouti** : `NOT_READY` pour l'exécution serveur.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:113` +
`docs/frontend/module-ownership-matrix.md:34` (section Learning).

| Élément | Route | Statut spec |
|---|---|---|
| `exercises-proof` (ingestion / preuve) | `/learn/:id` | **ADDITIF / GAP (OQ-36)** — `_inventory.md:113` |
| `bibliotheque-ressources` | `/learn` | `SPÉCIFIABLE` — `_inventory.md:107` (référence, non possédée) |
| `cours-liste` / `cours-detail` | `/learn`, `/learn/:id` | `SPÉCIFIABLE` / `PARTIAL` — `_inventory.md:108-109` |

> **Écart constaté (documenté, non corrigé)** : il n'existe **pas d'écran dédié
> à l'import** dans l'inventaire — l'ingestion est rattachée à `exercises-proof`
> (OQ-36, additif) et à la capture device (`04 §3.2.3`, hors périmètre de ce
> document). L'écran n'est donc **pas ratifié** au v1.

**Les 5 états UX** (chargement · vide · erreur · hors-ligne · partiel) : non
prouvés pour ce module (aucune page d'import trouvée dans `apps/mobile/src/pages/`).

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Capturer un document (device) | ✅ | capture locale (`04 §3.2.3`, hors module) |
| Uploader vers R2 | ❌ **réseau requis** | `capture()` → `StoragePort.upload` (`course-import.ts:87`) |
| Enfiler le job `course_import` | ❌ **réseau requis** | `dispatchImport()` → `JobDispatcherPort` (`course-import.ts:96`) |
| OCR + ingestion KB | ❌ **réseau + dispatcher** | `buildCourseImportHandler` (`jobs.ts:187`) via `fn-job-dispatcher` |
| Lire l'état d'un import | ❌ **réseau requis** | `course_imports` **non miroité** (§M2) |
| Dégrader en saisie manuelle | ✅ (par conception) | `needs_manual` (`jobs.ts:207,218`) — AD-1 |

**Classe offline** : `online-required (ingestion) ; AD-1 = saisie manuelle`
(`_inventory.md:113`, `capability.ts:377`).

> **Ne pas confondre** : la **capture** est locale ; tout le reste de la chaîne
> d'import exige le réseau et le dispatcher (lui-même non déployé, voir `learning.flashcards`
> §M3 et `docs/operations/2026-10-27-remediation-job-queue.md`).

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/learning test        # tests du module — 31/31 vert
grep -rn "needs_manual" supabase/migrations/            # → aucun résultat (exit 1 ; DL-1)
grep -n "course_imports" powersync/sync-config.yaml     # → aucun résultat (exit 1 ; non miroité)
grep -n "learning.import" docs/agent/feature-agentability-matrix.md  # → aucun résultat (exit 1)
grep -n "CourseImported" packages/learning/src/jobs.ts  # → aucun résultat (DL-4)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/learning test` → **31 tests, 31 pass, 0 fail** (exécuté).
Tests de ce module :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `course-import: deterministic R2 key + idempotent course_import dispatch` | `learning.test.ts:51` | clé R2 déterministe (`courses/user-1/course-1/mecanique-des-fluides-10.pdf`) + job enfilé |
| `course_import: a healthy import runs OCR then ingestion and lands on done` | `jobs.test.ts:171` | ordre `running → done`, 1 document ingéré |
| `course_import: a missing import id is a real failure, not a silent success` | `jobs.test.ts:192` | `import_not_found` (jamais de faux succès) |
| `course_import: an empty importId is rejected before any I/O` | `jobs.test.ts:200` | `missing_import_id` avant tout I/O |
| `course_import: no r2 key degrades to needs_manual, never a broken job (AD-1)` | `jobs.test.ts:208` | dégradation `needs_manual`, `ok:true` |
| `course_import: OCR returning nothing degrades to needs_manual, never invents text` | `jobs.test.ts:227` | `empty_extraction`, 0 ingestion |
| `course_import: idempotent — an already-done import is never re-imported (AD-8)` | `jobs.test.ts:250` | replay = `skipped: 'already-done'` |
| `course_import: sets status running before doing the heavy work` | `jobs.test.ts:270` | ordre `status:running → extract → status:done` |

### Seuils

Référence : `docs/testing/matrix.md`. Le **contrat** (pipeline + handler) est
couvert (8 tests exécutés). Mais les gardes de bout en bout **manquent** :
les drifts **DL-1 → DL-4** ne sont gardés par **aucun** test → `NOT_READY` sur
l'exécution live. La **surface** (aucun écran d'import ratifié) n'est pas prouvée
→ `NOT_READY`.

> **Note de statut doc** : `docs/learning/overview.md:3` déclare le module
> `DESIGNED_NOT_IMPLEMENTED`. Mesure : le contrat et le handler **sont** écrits et
> testés ; l'exécution live est partielle. La doc est en retard sur le code
> (doc-lag, pas un défaut de code).

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **LI-1** | Élargir le CHECK `course_imports.status` (`0003:104`) à `running`/`needs_manual`, ou aligner le handler sur `processing` ? | **ouverte** — AD-15 ; **correction interdite** ici (migration interdite) |
| **LI-2** | `fn-import-course` doit-il vraiment enfiler le job (aujourd'hui stub, DL-2) ? | **ouverte** — implémentation EF |
| **LI-3** | Quel provider OCR ? (seam vide aujourd'hui, DL-3) | **ouverte** — `NEEDS_DECISION` (périmètre) |
| **LI-4** | Qui émet `CourseImported` (DL-4) — le handler, ou le worker d'ingestion Knowledge ? | **ouverte** — contrat AD-9 |
| **LI-5** | L'écran d'import (`exercises-proof`, OQ-36 additif) est-il ratifié au v1 ? | **ouverte** — `_inventory.md:113` |
