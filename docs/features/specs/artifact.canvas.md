# Spec de module MVP — `artifact.canvas`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2b/specs-modules-7-11`.
> **Périmètre** : WS-2.11 (`docs/plans/2026-10-27-division-du-travail-parallele.md:215`)
> = `packages/artifact/src/` **et** la feature **Canvas** (0022/0023), qui est le
> pendant éditable des artefacts (`canvas_sessions.artifact_id` → `artifacts`).
> **Statut du module** : `PARTIAL` — la logique pure Artifact (commands + event F-06)
> est écrite et testée (9/9 `@aurora/artifact`) ; le Canvas a un endpoint serveur
> réel (6 verbes), un client device et 21 tests. Mais **rien n'exécute `artifact_gen`**
> côté serveur, `artifact_files` n'est **routé/synchronisé nulle part**, et Canvas
> n'est **ni routé, ni synchronisé, ni dans une vue relay**. Voir §M2 drifts et §M6.
> **Priorité** : **V4** (Discovery + Progress + Artifact, plan §3.4).

---

## §M1 Capacités retenues en v1

### Artifact — métadonnées + event post-R2

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Enregistrer un artefact (`status='queued'`, **aucun** event) | ✅ | `createArtifact` — `packages/artifact/src/commands.ts:108` |
| Transitions pré-upload (`generating` / `failed`, **aucun** event) | ✅ | `setArtifactStatus` — `commands.ts:141` |
| Confirmer l'upload R2 + **émettre** `ArtifactGenerated` (atomique) | ✅ | `markUploaded` — `commands.ts:179` (seul producteur, `:185`) |
| Vocabulaire `kind` **étroit** (10 valeurs acceptées par le CHECK) | ✅ | `ArtifactKind` — `commands.ts:69` (divergence D-1, `:62-67`) |
| Cycle de vie `status` (5 états du CHECK) | ✅ | `ArtifactStatus` — `commands.ts:82` |
| Joindre un fichier physique (`artifact_files`) | ⚠️ code écrit, **non routé** | `addArtifactFile` — `commands.ts:241` ; hors chemin device (`:230-235`) |
| Déclarer les tables réellement routées | ✅ | `ARTIFACT_OWNED_TABLES = ['artifacts']` — `commands.ts:283` |
| Déclarer les tables non routées (gap visible) | ✅ | `ARTIFACT_UNROUTED_TABLES = ['artifact_files']` — `commands.ts:288` |
| Déclarer l'unique event produit | ✅ | `ARTIFACT_PRODUCED_EVENTS = ['ArtifactGenerated']` — `commands.ts:291` |

### Canvas — surface d'édition d'artefact

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Lire une session (blocs + commentaires) | ✅ | `handleRead` — `supabase/functions/fn-canvas/index.ts:148` |
| Écrire/remplacer un bloc markdown | ✅ | `handleWrite` — `fn-canvas/index.ts:296` (bloc `blockId` absent = ajout, `:335`) |
| Refuser l'écriture d'un canvas verrouillé (`409 canvas/locked`) | ✅ | `fn-canvas/index.ts:320-322` |
| Commenter (créer / répondre, ancre héritée du parent) | ✅ | `handleComment` — `fn-canvas/index.ts:352` (contrat docstring `:43`) |
| Créer une session (G10) | ✅ | `case "create"` — `fn-canvas/index.ts:463` |
| (Dé)verrouiller une session (colonne `locked`, 0023) | ✅ | `handleLock` — `fn-canvas/index.ts:234` ; migration `0023_canvas_locked.sql:19` |
| Renommer une session (G4) | ✅ | `handleRename` — `fn-canvas/index.ts:263` |
| Client device (get/create/save/comments) | ✅ | `createCanvasClient` — `apps/mobile/src/lib/canvas-client.ts:60` |
| **Hors v1** : suppression d'une session (`canvas.delete`) | ❌ | outil émis (`tools.ts:1206`) mais **aucun verbe `delete`** dans `fn-canvas` (`grep -n '"delete"' fn-canvas/index.ts` → aucun) |
| **Hors v1** : exécution serveur de `artifact_gen` | ❌ | aucun handler (`grep -rn "artifact_gen" supabase/functions/fn-job-dispatcher/index.ts` → aucun résultat) |

**Vocabulaire fermé** : `kind` Artifact 10 (`commands.ts:69`) ; `status` Artifact 5
(`commands.ts:82`) ; statut ArtifactFile 3 (`0007_artifact.sql:38`) ; verbes Canvas
6 (`fn-canvas/index.ts:456-469`).

---

## §M2 Contrat de données

### Tables propriétaires — Artifact (`supabase/migrations/0007_artifact.sql`)

| Table | Ligne | Miroir local | Colonnes clés |
|---|---|---|---|
| `artifacts` | `0007:7` | ✅ | `kind` CHECK 10 (`:11`), `r2_key` (`:14`), `status` CHECK 5 (`:20`) |
| `artifact_files` | `0007:28` | ❌ **non routé/synchronisé** | `filename NOT NULL` (`:32`), `sha256` (`:36`), `status` CHECK 3 (`:38`) |

**Propriété** : `OWNER_MODULE_BY_ENTITY` mappe `artifacts` → `'artifact'`
(`packages/data/src/commands.ts:206`) ; `validate.ts` : `ArtifactGenerated: 'Artifact'`
(`packages/workflows/src/validate.ts:33`). `artifact_files` **n'apparaît nulle part**
dans le routage — vérifié par `ARTIFACT_UNROUTED_TABLES` (`commands.ts:288`) et par
`grep -c "artifact_files" packages/data/src/commands.ts powersync/sync-config.yaml
supabase/migrations/0015_powersync_relay_views.sql` → **0, 0, 0**.

**RLS** : `artifacts`/`artifact_files` sont dans la boucle `0007:43-58` — `ENABLE` +
**`FORCE`** ROW LEVEL SECURITY, policies `<table>_user_isolation` +
`<table>_service_role`, trigger `set_updated_at`. Le module ne pose aucune policy.

### Tables propriétaires — Canvas (`supabase/migrations/0022_canvas.sql`)

| Table | Ligne | Miroir local | Colonnes clés |
|---|---|---|---|
| `canvas_sessions` | `0022:11` | ❌ **non synchronisé** | `blocks jsonb` (SSoT contenu, `:15`), `artifact_id` FK→`artifacts` (`:16`), `locked` (0023:19) |
| `canvas_comments` | `0022:22` | ❌ **non synchronisé** | `anchor_start`/`anchor_end` (`:26-27`), `body` (`:28`) |

**RLS** : boucle `0022:34-49` — `ENABLE` + **`FORCE`**, policies user + service_role,
trigger `set_updated_at`. **GRANT explicite** `SELECT, INSERT, UPDATE, DELETE …
TO authenticated` (`0022:52`) — les tables sont donc accessible via PostgREST
(l'agent passe par `fn-canvas` en service_role).

### Écriture — single-writer

- **Artifact** : `createArtifact`/`setArtifactStatus`/`markUploaded` sont les seuls
  constructeurs ; `markUploaded` (`commands.ts:179`) est le **seul** producteur de
  `ArtifactGenerated` (`:185`, AD-9).
- **Canvas** : `fn-canvas` est le single-writer AD-7 des tables `canvas_*` (en-tête
  `fn-canvas/index.ts:1-6`) ; l'humain édite via `canvas-client.ts` (RLS user), l'agent
  via le kernel → `fn-canvas`.

### Synchronisation

| Table | stream | Preuve |
|---|---|---|
| `artifacts` | `artifact` (`auto_subscribe`) | `sync-config.yaml:112-114` ; miroir `powersync-schema.ts:465` |
| `artifact_files` | **aucun** | `grep -c` → 0 partout |
| `canvas_sessions` | **aucun** | `grep -c "canvas" powersync/sync-config.yaml` → **0** |
| `canvas_comments` | **aucun** | idem |

Vue relay : `v_artifact_scope` (`0015_powersync_relay_views.sql:78-82`, `FROM artifacts`) ;
**aucune** vue `canvas` (`grep -c "canvas" 0015_powersync_relay_views.sql` → **0**).

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DA-1** | **Aucun exécuteur de `artifact_gen`.** Le kernel enfile le job (`tools.ts:876`, `jobKind: 'artifact_gen'`) mais le dispatcher n'a **aucun** handler : `grep -rn "artifact_gen" supabase/functions/fn-job-dispatcher/index.ts` → **aucun résultat**. Le module Artifact ne fournit **aucune** table de handlers (`grep -rn "ARTIFACT_JOB_HANDLERS\|artifact_gen" packages/artifact/src/` → **aucun résultat**). La génération de document est un cul-de-sac. |
| **DA-2** | **`artifact_files` n'est routé ni synchronisé ni relayé.** Aucune entrée dans `OWNER_MODULE_BY_ENTITY`, `sync-config.yaml`, `0015`. Le module l'admet (`commands.ts:230-235,288`) — un commande locale visant cette table ne peut être validée, synchronisée, ni relayée. |
| **DA-3** | **Canvas n'est ni routé, ni synchronisé, ni relayé.** `canvas_sessions`/`canvas_comments` sont absentes de `commands.ts`, `sync-config.yaml` et `0015` (`grep -c "canvas"` → **0/0/0**). L'agent passe par `fn-canvas` (réseau) et l'humain par PostgREST direct — **pas de miroir local**, donc **pas d'édition hors-ligne**. |
| **DA-4** | **`canvas.delete` émis mais non appliqué.** L'outil `canvasDelete` (`tools.ts:1206`) et la capacité `canvas.delete` (`capability.ts:624`, `destructive: true`, `requiresConfirmation: true`) existent, mais `fn-canvas` n'a **aucun** verbe `delete` (switch `fn-canvas/index.ts:456-469` : read/write/comment/create/lock/rename seulement) et le routeur `invokeTool` ne liste que 6 verbes (`fn-agent-bootstrap.ts:648`). La suppression est annoncée sans implémentation. |
| **DA-5** | **Divergence D-1 `kind` SSoT ↔ CHECK (reconnue par le code).** `Artifact.kind` (`packages/domain/src/entities-artifact.ts:19-25`) autorise `csv`/`text`/`code` que le CHECK SQL **rejette** (`0007:11`, 10 valeurs). Le module type étroit volontairement (`commands.ts:62-79`) et **teste** le gap (`artifact.test.ts:124`). |
| **DA-6** | **Divergence D-5 `ArtifactFile.filename` (reconnue par le code).** `ArtifactFile` (SSoT) ne déclare pas `filename`, mais la table l'impose `NOT NULL` (`0007:32`) ; le builder le requiert (`commands.ts:255`) et le test le pin (`artifact.test.ts:138`). |
| **DA-7** | **`v_artifact_scope` omet `context_task_id`/`context_course_id`.** La vue (`0015:79-82`) ne sélectionne pas ces 2 colonnes, présentes dans la table (`0007:17-18`) et dans le miroir (`powersync-schema.ts:474-475`). Le miroir les a ; la vue relay non — incohérence vue↔miroir. |

> **Documentation, pas correction** (consigne) : `packages/domain/src/**`,
> `supabase/migrations/*` et `powersync/*` sont **interdits** ici.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md:21,26`.

| Capacité | Outil | Scopes | Confirmation | Classe offline | Niveau | Preuve |
|---|---|---|---|---|---|---|
| `artifact.generate` | `artifact_generate` | write `artifact:write` / read `artifact:read,productivity:read` | non | `online-required` | **FULL** | matrix L21 ; `capability.ts:434` ; `tools.ts:868` |
| `artifact.preview` | `artifact_preview` | read `artifact:read` | non | — | **USER_ONLY** | matrix L26 ; `capability.ts:444` ; `tools.ts:886` |

`artifact.preview` émet la commande UI `show_artifact` + un deep-link
`/artifacts/:id` — le kernel **ne lit jamais** l'artefact (`tools.ts:890-897`,
AD-12/F-09).

**Canvas — chemin agent** (hors matrice, ajouté par la feature 0022/2026-10-06) :
7 capacités `canvas.*` — `canvas.read` (`capability.ts:728`), `canvas.write`
(`:738`, `requiresConfirmation: true`), `canvas.comment` (`:748`), `canvas.create`
(`:765`), `canvas.lock` (`:775`), `canvas.rename` (`:587`), `canvas.delete`
(`:624`). Scopes `canvas:read` / `canvas:write`. Routage serveur : `invokeTool`
route les 6 commandes implémentées vers `fn-canvas` (`fn-agent-bootstrap.ts:648-652`).

> **Écarts constatés (documentés, non corrigés)** : `artifact.generate` est **FULL**
> mais n'a **aucun exécuteur** (DA-1) → `NOT_READY`. `canvas.delete` est
> `CONFIRMATION_REQUIRED` mais **non appliqué** (DA-4). Canvas n'apparaît **pas**
> dans `docs/agent/feature-agentability-matrix.md` (`grep -n "canvas"` → aucun
> résultat) — il est tracé dans `docs/agent/feature-mapping-agent-gaps.md:215`
> (G10), pas dans la matrice de capacités.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:123`.

| Écran | Route | Statut spec | Preuve |
|---|---|---|---|
| `artifacts-detail` (preview par format) | `/artifacts/:id` | **détaillé** (OQ-46 levée) | `_inventory.md:123` ; fichier `docs/design-system/screens/artifacts-detail.md` |

**Canvas** : **aucun écran** dans l'inventaire (`grep -c "canvas"
docs/design-system/screens/_inventory.md` → **0**) et **aucun fichier** de spec
écran (`ls docs/design-system/screens/ | grep -i canvas` → aucun). La page existe
pourtant : `apps/mobile/src/pages/canvas/index.tsx` (407 lignes), montée sur
`/canvas/:id` derrière `FeatureGate feature="canvas"` (`apps/mobile/src/router.tsx:90`).
**La SSoT écran du Canvas n'existe pas** — même famille que OQ-43 (progress-dashboard).

**Implémentation présente** : client device `canvas-client.ts` (`createCanvasClient`
`:60`) + wiring de run `canvas-run-wiring.ts` (`canvasIdsOf` `:77`, `buildCanvasUrl`
`:91`, `buildCanvasDiff` `:137`, `currentToolStateOf` `:201`) qui alimente le CTA
« Ouvrir le canvas » du chat (`apps/mobile/src/lib/agent-client.ts:145-151`).

> **Écart constaté (documenté, non corrigé)** : la surface Canvas n'est **pas
> ratifiée** (pas d'entrée `_inventory`, pas de fichier écran) → `NOT_READY` sur §M4.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire les métadonnées d'artefacts | ✅ | stream `artifact` (`sync-config.yaml:112-114`) |
| Construire une commande Artifact (pure) | ✅ | `commands.ts:108,141,179,241` (aucune I/O) |
| `artifact.preview` (deep-link, cache device) | ✅ | `tools.ts:890-897` (kernel ne lit pas ; cache local, AD-1) |
| Lire `artifact_files` | ❌ **non synchronisé** | DA-2 |
| Générer un document (`artifact_gen`) | ❌ **aucun exécuteur** | DA-1 |
| Lire/écrire un canvas (tables `canvas_*`) | ❌ **non synchronisé** | DA-3 (`grep -c` → 0) |
| Écrire un canvas par l'agent (`canvas.*`) | ❌ **réseau requis** | `fn-canvas` (service_role) |

**Classe offline** : `artifact.generate` = `online + R2` (matrix L21) ;
`artifact.preview` = cache local (matrix L26). Les métadonnées `artifacts` sont
lisibles hors-ligne ; le **binaire** vit dans R2 (AD-16) et n'est **jamais** en
SQLite (`0007_artifact.sql:3`).

> **Ne pas confondre** : les **métadonnées** d'artefacts sont hors-ligne ;
> l'**édition Canvas** ne l'est pas — `canvas_*` n'ont aucun miroir (DA-3), alors
> que la page `/canvas/:id` existe et est présentée comme éditable.

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/artifact test        # 9/9 vert
pnpm -F @aurora/mobile exec node --experimental-strip-types --no-warnings \
  --import ./test/register-resolve-hook.mjs --test test/canvas-tools.test.ts test/canvas-client.test.ts   # 6/6 vert
pnpm -F @aurora/mobile exec node --experimental-strip-types --no-warnings \
  --import ./test/register-resolve-hook.mjs --test test/canvas-run-wiring.test.ts   # 15/15 vert
grep -rn "artifact_gen" supabase/functions/fn-job-dispatcher/index.ts    # → aucun résultat (DA-1)
grep -c "canvas" powersync/sync-config.yaml packages/data/src/powersync-schema.ts \
  packages/data/src/commands.ts supabase/migrations/0015_powersync_relay_views.sql   # → 0 0 0 0 (DA-3)
grep -n '"delete"' supabase/functions/fn-canvas/index.ts                 # → aucun résultat (DA-4)
grep -c "artifact_files" packages/data/src/commands.ts powersync/sync-config.yaml \
  supabase/migrations/0015_powersync_relay_views.sql                     # → 0 0 0 (DA-2)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/artifact test` → **9 tests, 9 pass, 0 fail** (exécuté).
`apps/mobile` canvas-tools + canvas-client → **6/6** ; canvas-run-wiring → **15/15**
(exécutés). Total Canvas = **21 tests**.

Tests Artifact (`packages/artifact/test/artifact.test.ts`) :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `owns exactly the table the routing table assigns it` | `:26` | `ARTIFACT_OWNED_TABLES = ['artifacts']` |
| `artifact_files is real but UNROUTED (a gap, not a capability)` | `:32` | DA-2 pinné (visible, pas supposé) |
| `every builder returns ONE command against ONE owned table` | `:39` | AD-7 single-table |
| `createArtifact emits NO event — the bytes are not there yet (F-06)` | `:65` | invariant F-06 |
| `a failed upload emits NO event either` | `:75` | pas d'annonce sur échec |
| `markUploaded is the SOLE producer, and it emits atomically (AD-9)` | `:81` | event post-R2 seul producteur |
| `produces exactly ONE event (AD-9: Artifact owns one)` | `:120` | `ARTIFACT_PRODUCED_EVENTS` |
| `divergence D-1 is real — the DB rejects csv/text/code` | `:124` | DA-5 pinné |
| `divergence D-5 is real — artifact_files.filename is NOT NULL` | `:138` | DA-6 pinné |

Tests Canvas (`apps/mobile/test/`) :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `KERNEL_TOOLS contient les 3 outils canvas (0022)` | `canvas-tools.test.ts:29` | outils exposés |
| `canvas_read: inputSchema = { canvasId, includeComments, userId? }` | `canvas-tools.test.ts:35` | read-only, pas de job |
| `canvas_write: inputSchema = { canvasId, blockId?, markdown, userId? }` | `canvas-tools.test.ts:43` | overwrite = risk du planStep |
| `canvas_comment: inputSchema = { canvasId, replyToCommentId?, body, userId? }` | `canvas-tools.test.ts:52` | ancres 0022 |
| `createCanvasClient expose la surface { get, create, save, listComments, addComment, deleteComment }` | `canvas-client.test.ts:25` | surface device |
| `get renvoie null quand la row est absente (AD-7: état vide honnête)` | `canvas-client.test.ts:33` | état vide honnête |
| `canvasIdsOf: extraie les ids de canvas touchés par un run depuis steps_json` | `canvas-run-wiring.test.ts:32` | CTA « Ouvrir le canvas » |
| `buildCanvasDiff: propose le contenu actuel vs le nouveau (canvas_write, bloc cible)` | `canvas-run-wiring.test.ts:90` | diff proposé avant confirmation |
| `currentToolStateOf: les 6 labels des verb canvas (SSoT du mapping)` | `canvas-run-wiring.test.ts:181` | 6 verbes, pas 7 → **DA-4** confirmé |

### Seuils

Référence : `docs/testing/matrix.md`. La logique pure Artifact (F-06, AD-9) et le
Canvas device (client + wiring) sont **couverts** (30 tests exécutés). Mais :
**DA-1** (aucun exécuteur `artifact_gen`), **DA-3** (Canvas non synchronisé),
**DA-4** (`canvas.delete` non appliqué) ne sont gardés par **aucun** test
d'exécution — ils sont seulement *documentés* (DA-2/DA-5/DA-6 sont pinnés par test,
ce qui est l'exception vertueuse). La surface Canvas n'est pas ratifiée (§M4) →
`NOT_READY` sur la génération, l'édition hors-ligne et la suppression.

> **Note de statut doc** : `docs/artifacts/overview.md` est « claimé, NON détaillé »
> (`_inventory.md:123`) et `docs/artifacts/` ne contient que `overview.md` +
> `infographic-multi-resource.md`. Mesure : la **logique pure** Artifact et le
> **Canvas device** sont implémentés et testés ; l'**exécution serveur** de
> `artifact_gen` et la **persistance hors-ligne** du Canvas manquent.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **QA-1** | Qui exécute `artifact_gen` (DA-1) — un `ARTIFACT_JOB_HANDLERS` (comme `LEARNING_JOB_HANDLERS`) ? | **ouverte** — AD-7/AD-8 |
| **QA-2** | `artifact_files` doit-il être routé + synchronisé (DA-2) ou rester server-only ? | **ouverte** — AD-15 |
| **QA-3** | Canvas doit-il avoir un miroir PowerSync (DA-3) pour l'édition hors-ligne, ou rester online-only ? | **ouverte** — AD-15 |
| **QA-4** | Implémente-t-on `canvas.delete` (verbe + routage) ou retire-t-on la capacité (DA-4) ? | **ouverte** — AD-7 |
| **QA-5** | Aligner `Artifact.kind` SSoT ↔ CHECK (DA-5) — widen CHECK (10→13) ou restreindre le SSoT ? | **ouverte** — AD-15 |
| **QA-6** | `ArtifactFile.filename` (DA-6) — ajouter au SSoT ou rendre la colonne nullable ? | **ouverte** — AD-15 |
| **QA-7** | `v_artifact_scope` doit-il exposer `context_task_id`/`context_course_id` (DA-7) ? | **ouverte** — AD-15 |
| **QA-8** | La SSoT écran du Canvas manque-t-elle (aucune entrée `_inventory`) ? | **ouverte** — même famille qu'OQ-43 |
