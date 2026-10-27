# Spec de module MVP — `knowledge.tree`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : branche `rebaseline/2026-10-23`, arbre de travail de
> `ws2b/specs-modules-7-11`.
> **Statut du module** : `PARTIAL` — le **contrat d'écriture** (7 builders
> single-writer) et le **rendu** (miroir local + `SemanticTreeRenderer`) sont
> écrits et testés (8/8 `@aurora/knowledge`), mais **aucun appelant** n'applique
> les commandes (seam de write non branché) et le **versioning** `semantic_tree_version`
> n'a pas de builder. Voir §M2 et §M6.
> **Priorité** : **V3** (Learning + Knowledge, plan §3.4).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Arbre sémantique hiérarchique : nœuds (`semantic_nodes`) | ✅ | `createSemanticNode` — `packages/knowledge/src/commands.ts:209` |
| Relations verticales (`semantic_edges`) — table + commande propres | ✅ | `createSemanticEdge` — `commands.ts:247` |
| Passerelles inter-domaines annotées (`semantic_bridges`) | ✅ | `createSemanticBridge` — `commands.ts:280` |
| `node_state` — **auteur unique** Knowledge (AD-6/F-02) | ✅ | `setNodeState` — `commands.ts:323` ; commentaire `0004_knowledge.sql:92` |
| Notes (`notes`, Tiptap JSON) | ✅ | `createNote`/`updateNote` — `commands.ts:103,132` |
| Ressources (`resources`, métadonnées + `r2_key`, jamais le binaire) | ✅ | `createResource` — `commands.ts:162` |
| Provenance (`source_refs`, AD-11) | ✅ | `createSourceRef` — `commands.ts:367` |
| Invariants de l'arbre (racine, atteignabilité, ADR §14) | ✅ | `checkTreeInvariants` — `packages/learning/src/semantic-tree.ts:41` |
| Expansion paresseuse (niveau par niveau, 02 §9.2) | ✅ | `lazyExpand` — `semantic-tree.ts:142` |
| Layout déterministe (Dagre, présentation seule, AD-10) | ✅ | `treeLayout` — `semantic-tree.ts:191` |
| Rendu React Flow (`SemanticTreeRenderer`, lazy level-1) | ✅ | `packages/ui/src/renderers/SemanticTreeRenderer.tsx:154` |
| **Hors v1** : versioning de l'arbre (`semantic_tree_version`) | ❌ | table créée (`0004:105`) mais **aucun builder** — `grep -rn "semantic_tree_version" packages/knowledge/src/` → **aucun résultat** |
| **Hors v1** : retrieval sémantique (FTS + pgvector) | ❌ | server-only (AD-12/F-09) ; `embedding` **non miroité** (`packages/data/src/powersync-schema.ts`) |
| **Hors v1** : consommation de `ProgressEvidenceCreated`/`SkillStateChanged` | ❌ (déclarée) | `KNOWLEDGE_CONSUMED_EVENTS` — `packages/knowledge/src/events.ts:23` ; aucun handler trouvé |

**Vocabulaire fermé** : 10 `kind` de nœud (`0004:47`), 5 `relation` (`0004:69`),
7 `state` (`0004:97`), 2 `kind` de note (`0004:136`).

---

## §M2 Contrat de données

### 7 tables propriétaires (SSoT = migration + table de routage, AD-15)

`supabase/migrations/0004_knowledge.sql` — le module **écrit** exactement les 7
tables que `OWNER_MODULE_BY_ENTITY` lui assigne (`packages/data/src/commands.ts:190-196`) :

| Table | Ligne | Colonnes clés |
|---|---|---|
| `notes` | `0004:131` | `title`, `body`, `kind` CHECK `free\|structured` (`:136`) |
| `resources` | `0004:144` | `title`, `mime_type`, `r2_key`, `size_bytes` (jamais le binaire, AD-16) |
| `semantic_nodes` | `0004:43` | `kind` CHECK 10 valeurs (`:47`), `label`, `summary`, `body`, `parent_id`, `domain_path`, `source_ref_ids jsonb` (`:55`) |
| `semantic_edges` | `0004:63` | `source_node`/`target_node` → `semantic_nodes` (CASCADE), `relation` CHECK 5 (`:69`) |
| `semantic_bridges` | `0004:77` | `label`, `secondaries jsonb` |
| `node_state` | `0004:91` | `node_id` → `semantic_nodes`, `state` CHECK 7 (`:97`) — **auteur unique Knowledge** |
| `source_refs` | `0004:113` | `entity`, `entity_id`, `source_document_id`, `page`, `passage`, `kind` |

**Contrat de liste en dur** : `KNOWLEDGE_OWNED_TABLES` (`commands.ts:397`) —
le test `knowledge: owns exactly the 7 tables…` (`knowledge.test.ts:36`) verrouille
l'égalité avec la table de routage.

> **Tables NON possédées en écriture** (server-only ou autres owners) :
> `knowledge_documents` (`0004:12`) et `document_chunks` (`0004:29`, colonne
> `embedding vector(768)` `:36`) ne sont **pas** dans `OWNER_MODULE_BY_ENTITY`
> (`grep -n "knowledge_documents" packages/data/src/commands.ts` → **aucun
> résultat**) : ce sont des tables serveur (ingestion KB), pas des tables miroir.
> `semantic_tree_version` (`0004:105`) est bien assignée à Knowledge par
> `packages/workflows/src/validate.ts:62`, mais **aucun builder** ne l'écrit
> (voir §M1 et DL-K2).

### RLS — héritée, pas ajoutée

Les 9 tables du bloc `0004:160-176` (`FOREACH t IN ARRAY ARRAY[…]`, liste `:162`)
reçoivent `ENABLE` + **`FORCE`** ROW LEVEL SECURITY, policy
`<table>_user_isolation` (`user_id = auth.uid()`) + `<table>_service_role` en
`SELECT`. `semantic_tree_version` a ses 2 policies dédiées (`0004:180-185`). Le
module ne pose **aucune** policy.

### Écriture — single-writer (AD-7 / F-03)

Chaque cas d'usage retourne **une seule** commande (`KnowledgeCommand`,
`commands.ts:51`) contre **une seule** table. Le test
`knowledge: every builder returns ONE command against ONE owned table`
(`knowledge.test.ts:55`) l'assure. Les colonnes binaires sont interdites
(`knowledge: metadata only` — `knowledge.test.ts:110`). Le champ `event` est
`never` (`commands.ts:68`) : Knowledge **ne produit aucun événement** (AD-9,
`events.ts:34`).

### Synchronisation

Le stream `knowledge` (`powersync/sync-config.yaml:59-68`) expose les **7 tables
propriétaires** (`notes`, `resources`, `semantic_nodes`, `semantic_edges`,
`semantic_bridges`, `node_state`, `source_refs`) → l'arbre est **lisible
hors-ligne**.

**Exclus du miroir** (server-only) : `semantic_tree_version`,
`knowledge_documents`, `document_chunks`
(`grep -n "semantic_tree_version\|document_chunks" powersync/sync-config.yaml`
→ **aucun résultat**).

Le schéma client `packages/data/src/powersync-schema.ts:242-303` porte bien les
colonnes des 7 tables, **sans `embedding`** (bloc commenté `:211`
« NO `embedding` column, AD-12/F-09 »).

### ⚠ Drifts mesurés (documentés, **non corrigés**)

| # | Drift | Preuve |
|---|---|---|
| **DK-1** | **Les builders n'ont aucun appelant.** `grep -rn "createSemanticNode\|createNote\|setNodeState\|createSourceRef" apps/ packages/ --include=*.ts` (hors `packages/knowledge/` et tests) → **aucun résultat**. Le commentaire de `commands.ts:10-11` décrit le seam (`SqliteCommandRepository.apply('knowledge', …)`) mais rien ne l'appelle : la lecture marche, l'écriture est **déclarée mais non branchée**. |
| **DK-2** | **`semantic_tree_version` n'a pas de builder.** La table existe (`0004:105`), Knowledge en est l'owner (`validate.ts:62`), mais aucun cas d'usage ne l'écrit (`grep -rn "semantic_tree_version" packages/knowledge/src/` → **aucun résultat**). Le versioning AD-6/F-10 est **absent**. |
| **DK-3** | **`semantic_nodes.source_ref_ids` n'est jamais renseigné.** La colonne existe (`0004:55`, miroitée `powersync-schema.ts:250`) mais `createSemanticNode` (`commands.ts:209-233`) ne l'écrit pas — le champ est laissé à son défaut `'[]'`. La provenance par nœud n'est donc pas peuplée par le module. |
| **DK-4** | **Le code de l'arbre vit dans `packages/learning`, pas `packages/knowledge`.** `checkTreeInvariants`/`lazyExpand`/`treeLayout` sont dans `packages/learning/src/semantic-tree.ts` (en-tête `:2` « Learning module ») alors que le domaine est Knowledge (`docs/knowledge/overview.md`). Le package `@aurora/knowledge` n'exporte **pas** ces helpers (`packages/knowledge/src/index.ts:13-14` : commands + events seulement). Décision de placement, pas un bug — mais deux packages pour un module. |

> **Documentation, pas correction** (consigne) : DK-2/DK-3 exigent une décision
> de propriétaire (AD-15) ; `packages/domain/src/**` et les migrations sont
> **interdits** ici.

---

## §M3 Chemin agent

SSoT : `docs/agent/feature-agentability-matrix.md` — **la matrice ne porte pas de
ligne `knowledge.add`** (vérifié : `grep -n "knowledge.add" feature-agentability-matrix.md`
→ **aucun résultat**, exit 1, §M6). L'entrée de capacité existe pourtant.

| Champ | Valeur | Preuve |
|---|---|---|
| Capacité | `knowledge.add` | `packages/agent/src/capability.ts:381` |
| Outil | `knowledge_add` | `capability.ts:382`, `packages/agent/src/tools.ts:770` |
| Description | « Ingest a new source into the KB (camera / OCR / upload — ocr job, AD-11 provenance) » | `capability.ts:383` |
| Scopes | write `knowledge:write` ; read `artifact:read` | `capability.ts:384-385` |
| Confirmation | **non** (`requiresConfirmation: false`) | `capability.ts:387` |
| Destructif | non | `capability.ts:386` |
| Dépendance | `ocr` | `capability.ts:389` |
| Classe offline | `online-required` | `capability.ts:388` |
| Niveau | outil **thin** (`{ ok, jobKind: 'ocr', payload }`) | `tools.ts:778` |

> **Écart constaté (documenté, non corrigé)** : l'outil émet `jobKind: 'ocr'`
> (`tools.ts:778`) mais le dispatcher **ne route pas** ce kind
> (`grep -cn "'ocr'" fn-job-dispatcher/index.ts` → **0**). Le chemin agent
> d'ingestion est **enregistré mais non abouti** : `NOT_READY`.
> **Navigation de l'arbre** : la matrice ne porte pas non plus de capacité de
> navigation ; `docs/agent/e2e-agent-scenarios.md:292-299` la documente comme
> **USER_ONLY** (`NavigationIntent { route: '/knowledge/tree/:nodeId' }`) — un
> deep-link, pas un outil.

---

## §M4 Contrat de surface

SSoT : `docs/design-system/screens/_inventory.md:116-117` +
`docs/frontend/module-ownership-matrix.md:44` (section Knowledge).

| Écran | Route | Statut spec |
|---|---|---|
| `knowledge-tree` (Semantic Tree, AD-10) | `/knowledge` | **GAP (OQ-39)** — `_inventory.md:116` |
| `knowledge-node` | `/knowledge/:nodeId` | **GAP (OQ-40)** — `_inventory.md:117` |

**Routes réelles** : `/knowledge` (`apps/mobile/src/router.tsx:99`) et
`/knowledge/:nodeId` (`router.tsx:100`), pages `KnowledgePage` / `KnowledgeNodePage`
(`router.tsx:38`), derrière `FeatureGate feature="knowledge"`.

**Implémentation présente** : `apps/mobile/src/pages/knowledge/index.tsx` rend le
**vrai** `SemanticTreeRenderer` (`:151`) alimenté par `readKnowledgeMirror(store)`
(`:73`) — lecture **locale** du miroir, jamais le réseau (AD-7). Les **5 états UX**
s'appuient sur `UxStates` + `useOnlineStatus` (`:136-146`) avec CTA vide
« Importer un concept » (`:138`).

> **Écart constaté (documenté, non corrigé)** : les deux écrans sont classés
> **GAP** (OQ-39/OQ-40) — la SSoT `docs/knowledge/overview.md` « claim 44 » mais
> reste **muette écran-par-écran** (`_inventory.md:184-185`). L'écran n'est donc
> pas **ratifié** au v1, même si une implémentation existe.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lire l'arbre (nœuds + relations) | ✅ | stream `knowledge` (`sync-config.yaml:62-68`) |
| Calculer les invariants de l'arbre | ✅ | pur, sans I/O — `checkTreeInvariants` (`semantic-tree.ts:41`) |
| Expansion paresseuse / layout | ✅ | purs — `lazyExpand` (`:142`), `treeLayout` (`:191`) |
| Recherche locale (`?q=`) | ✅ (substring seulement) | `searchKnowledgeMirror` (`apps/mobile/src/lib/knowledge-repo.ts:127`) — **jamais FTS/vecteur** (AD-12/F-09) |
| Retrieval sémantique complet (FTS + pgvector) | ❌ **réseau requis** | `embedding` non miroité (`0004:36,54` ; `powersync-schema.ts:211`) |
| Écrire un nœud depuis le device | ❌ **non branché** | DK-1 (aucun appelant des builders) |
| Ingestion d'un document (`knowledge.add`) | ❌ **réseau + dispatcher** | `ocr` non routé (§M3) |

**Classe offline** : `offline-capable (mirror) / online (retrieval AD-12)`
(`_inventory.md:116`).

> **Ne pas confondre** : l'**arbre** est hors-ligne (lecture du miroir local) ;
> la **recherche sémantique** ne l'est pas — et l'**écriture** device non plus
> (DK-1).

---

## §M6 Preuve

### Commandes (exécutées)

```sh
pnpm -F @aurora/knowledge test        # tests du module — 8/8 vert
grep -n "knowledge.add" docs/agent/feature-agentability-matrix.md        # → aucun résultat (exit 1)
grep -cn "'ocr'" supabase/functions/fn-job-dispatcher/index.ts           # → 0 (kind non routé)
grep -n "semantic_tree_version" packages/knowledge/src/commands.ts       # → aucun résultat (exit 1 ; DK-2)
grep -n "semantic_tree_version\|document_chunks" powersync/sync-config.yaml  # → aucun résultat (non miroités)
grep -rn "createSemanticNode\|createNote\|setNodeState" apps/ packages/ --include=*.ts  # → aucun appelant hors package (DK-1)
```

### Couverture actuelle (mesurée)

`pnpm -F @aurora/knowledge test` → **8 tests, 8 pass, 0 fail** (exécuté).
Tests de ce module (`packages/knowledge/test/knowledge.test.ts`) :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `knowledge: owns exactly the 7 tables the routing table assigns it` | 36 | égalité `KNOWLEDGE_OWNED_TABLES` ↔ `OWNER_MODULE_BY_ENTITY` |
| `knowledge: every builder returns ONE command against ONE owned table` | 55 | 8 cas d'usage → 8 commandes mono-table (AD-7) |
| `knowledge: a created row seeds its OR-Set…` | 90 | `crdt_added` seedé par le client créateur |
| `knowledge: the local mirror never carries an embedding (03 S4.2)` | 96 | aucun `embedding` dans un patch |
| `knowledge: metadata only — no binary ever enters a command (AD-16)` | 110 | `r2_key` seulement, aucun blob |
| `knowledge: produces NO event — it is a consumer (AD-9, closed vocabulary)` | 131 | 0 producteur, 2 consommateurs |
| `knowledge: divergence D-2 is real — notes has no tags/sourceRefIds column` | 146 | écart SSoT `Note` ↔ colonnes `notes` |
| `knowledge: divergence D-4 is real — source_refs uses source_document_id, not sourceId` | 155 | mapping vers la **vraie** colonne |

Le code de l'arbre (invariants/layout) est couvert dans `@aurora/learning` :
`semantic-tree: well-formed tree passes the invariants` (`learning.test.ts:218`),
`unreachable node is a violation` (`:225`), `lazy expand stops at the requested
depth` (`:231`), `layout is deterministic and row-ordered` (`:236`).

### Seuils

Référence : `docs/testing/matrix.md`. Le **contrat d'écriture** est couvert
(8 tests exécutés) et l'**arbre** l'est dans `@aurora/learning` (4 tests). Mais
les drifts **DK-1 → DK-3** ne sont gardés par **aucun** test → `NOT_READY` sur le
chemin d'écriture. La **surface** (OQ-39/OQ-40 = GAP) et l'**ingestion**
(`ocr` non routé) ne sont pas prouvées → `NOT_READY`.

> **Note de statut doc** : `docs/knowledge/overview.md:3` déclare le module
> `DESIGNED_NOT_IMPLEMENTED`. Mesure : le contrat d'écriture et le rendu **sont**
> implémentés et testés ; le seam d'écriture et le versioning manquent. Doc-lag
> partiel.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **KT-1** | Qui applique les commandes Knowledge (DK-1) — un use-case device, ou le module reste-t-il read-only côté app ? | **ouverte** — AD-7/AD-15 |
| **KT-2** | `semantic_tree_version` doit-il avoir un builder (versioning AD-6/F-10) ? | **ouverte** — owner décide ; migration interdite ici |
| **KT-3** | `semantic_nodes.source_ref_ids` doit-il être peuplé par `createSemanticNode` (DK-3) ? | **ouverte** — AD-11 provenance |
| **KT-4** | Les helpers d'arbre doivent-ils migrer de `packages/learning` vers `packages/knowledge` (DK-4) ? | **ouverte** — placement, décision AD-15 |
| **KT-5** | Le kind `ocr` doit-il être routé par le dispatcher (§M3) ? | **ouverte** — dépend de `learning.import` (LI-3) |
| **KT-6** | Les écrans `/knowledge` et `/knowledge/:nodeId` sont-ils ratifiés (OQ-39/OQ-40 = GAP) ? | **ouverte** — `_inventory.md:116-117` |
