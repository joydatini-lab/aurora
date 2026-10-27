/**
 * Knowledge module — command builders (AD-7 single-writer, tranche 3 lot 3.1).
 *
 * WHY THIS PACKAGE EXISTS
 * `packages/data/src/commands.ts` (`OWNER_MODULE_BY_ENTITY`) declared 7 entities
 * owned by the module `'knowledge'` — notes, resources, semantic_nodes,
 * semantic_edges, semantic_bridges, node_state, source_refs — and the 10 tables
 * already exist (0004_knowledge.sql). The owner module did not. So the read side
 * worked (the `v_knowledge_scope` relay view + the PowerSync stream are wired)
 * while NO module could legally write: `SqliteCommandRepository.apply('knowledge',
 * …)` had no builder to call, and every write was a missing seam.
 *
 * This module closes that seam. It owns the EXISTING tables — it creates ZERO
 * tables, ZERO columns, ZERO migrations. `commandEntity()` in
 * `packages/data/src/commands.ts` already maps every op name below to the right
 * mirror table (verified: note→notes, resource→resources, semanticNode→
 * semantic_nodes, semanticEdge→semantic_edges, semanticBridge→semantic_bridges,
 * nodeState→node_state, sourceRef→source_refs).
 *
 * SINGLE-WRITER DISCIPLINE (AD-7/F-03, 03 S4.2)
 * Every builder returns exactly ONE command against ONE table. Multi-table
 * writes are a blocking review finding (02 S11): a semantic edge is its own
 * table and its own command, never a side effect of creating a node.
 *
 * CRDT (AD-15/03 S5.3)
 * The mutable collections carry an OR-Set triple (`crdt_added`/`crdt_removed`
 * on the row, keyed by `localMutationId`). The builders seed `crdt_added` with
 * the creating client so a concurrent delete cannot silently resurrect the row.
 *
 * LOCAL MIRROR CONSTRAINT (03 S4.2, 0004 header)
 * `semantic_nodes` carries NO `embedding` column locally and must never gain
 * one: embeddings are derived server-side and are not part of the device truth.
 */
import type { OrSetValue } from '@aurora/domain';

/** Local client identity for OR-Set elements (03 S5.3). */
export interface KnowledgeCtx {
  userId: string;
  clientId: string;
  /** server-canonical timestamp (ms) — 03 S4.2 rule 3 */
  now: number;
}

/**
 * Partial command updates for tables owned by Knowledge.
 *
 * The table union is EXACTLY the set `OWNER_MODULE_BY_ENTITY` assigns to
 * `'knowledge'`. Adding a table here without adding it there (or vice versa)
 * is caught by `knowledge.test.ts` — the two lists must not drift.
 */
export interface KnowledgeCommand {
  /** owned table (0004_knowledge.sql) */
  table:
    | 'notes'
    | 'resources'
    | 'semantic_nodes'
    | 'semantic_edges'
    | 'semantic_bridges'
    | 'node_state'
    | 'source_refs';
  /** upsert key */
  id: string;
  /** partial fields (server-wins merge, 03 S4.2) */
  patch: Record<string, unknown>;
  /** ULID of the local mutation (G-M4 traceability) */
  localMutationId: string;
  /** Knowledge produces NO domain event (AD-9) — see events.ts for why. */
  event?: never;
}

/** OR-Set seed for a newly created row: added-by-this-client, removed-empty. */
function seedOrSet(ctx: KnowledgeCtx, localMutationId: string): Record<string, unknown> {
  return {
    crdt_added: { [ctx.clientId]: ctx.now },
    crdt_removed: {},
    local_mutation_id: localMutationId,
  };
}

// ---------------------------------------------------------------------------
// Notes (0004 `notes`) — free or structured (Tiptap JSON, ADR S26 v1.5)
// ---------------------------------------------------------------------------

export interface NewNote {
  userId: string;
  title: string;
  /** Tiptap document JSON serialized — corpus fidelity goes through SourceRef (AD-11) */
  content?: string;
  /** 'free' | 'structured' (DB CHECK) */
  kind?: 'free' | 'structured';
}

/**
 * Create a note.
 *
 * NOTE ON THE `tags` / `sourceRefIds` SSoT FIELDS: `Note` in
 * `packages/domain/src/entities-knowledge.ts` declares `tags: OrSetValue[]` and
 * `sourceRefIds: OrSetValue[]`, but the `notes` table has NO such columns (0004:
 * id, user_id, title, body, kind, crdt_*, timestamps). The builders therefore do
 * NOT invent those columns. Recorded as divergence D-2 in the module test rather
 * than patched unilaterally — changing either side is an AD-15 owner decision.
 */
export function createNote(
  input: NewNote,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'notes',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      title: input.title,
      body: input.content ?? '',
      kind: input.kind ?? 'free',
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

export interface NoteUpdate {
  title?: string;
  content?: string;
}

/** Update a note. Emits exactly one command (AD-7). */
export function updateNote(
  id: string,
  patch: NoteUpdate,
  ctx: KnowledgeCtx,
  localMutationId: string,
): KnowledgeCommand {
  const p: Record<string, unknown> = {
    updated_at: new Date(ctx.now).toISOString(),
    local_mutation_id: localMutationId,
  };
  if (patch.title !== undefined) p.title = patch.title;
  if (patch.content !== undefined) p.body = patch.content;
  return { table: 'notes', id, patch: p, localMutationId };
}

// ---------------------------------------------------------------------------
// Resources (0004 `resources`) — metadata + r2_key, never the binary (AD-16)
// ---------------------------------------------------------------------------

export interface NewResource {
  userId: string;
  title: string;
  kind?: string;
  url?: string;
  /** R2 object key — the binary never lands in SQLite (AD-7/01 S4.6) */
  r2Key?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export function createResource(
  input: NewResource,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'resources',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      title: input.title,
      kind: input.kind ?? 'link',
      url: input.url ?? null,
      r2_key: input.r2Key ?? null,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

// ---------------------------------------------------------------------------
// Semantic tree (0004 `semantic_nodes` / `semantic_edges` / `semantic_bridges`)
// ---------------------------------------------------------------------------

export interface NewSemanticNode {
  userId: string;
  /** must be in the DB CHECK list (0004) — validated by the caller, not invented here */
  kind: string;
  label: string;
  summary?: string;
  body?: string;
  parentId?: string;
  domainPath?: string;
}

/**
 * Create a semantic node.
 *
 * NO `embedding`: the local mirror must never carry one (03 S4.2, 0004 header).
 * The `evidenceRefIds` SSoT field also has no column here (divergence D-3).
 */
export function createSemanticNode(
  input: NewSemanticNode,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'semantic_nodes',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      kind: input.kind,
      label: input.label,
      summary: input.summary ?? null,
      body: input.body ?? null,
      parent_id: input.parentId ?? null,
      domain_path: input.domainPath ?? null,
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

export interface NewSemanticEdge {
  userId: string;
  sourceNode: string;
  targetNode: string;
  /** DB CHECK (0004): depends_on | is_a_case_of | deepens | applies | leads_to */
  relation: string;
}

/**
 * Create a vertical (hierarchical) relation. Its own table, its own command —
 * never a side effect of `createSemanticNode` (AD-7, 02 S11).
 */
export function createSemanticEdge(
  input: NewSemanticEdge,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'semantic_edges',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      source_node: input.sourceNode,
      target_node: input.targetNode,
      relation: input.relation,
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

export interface NewSemanticBridge {
  userId: string;
  sourceNode: string;
  targetNode: string;
  /** the annotation explaining the cross-domain connection (ADR S14) */
  label: string;
  secondaries?: string[];
}

/** Create a transversal inter-domain bridge (explicitly annotated, ADR S14). */
export function createSemanticBridge(
  input: NewSemanticBridge,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'semantic_bridges',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      source_node: input.sourceNode,
      target_node: input.targetNode,
      label: input.label,
      secondaries: input.secondaries ?? [],
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

// ---------------------------------------------------------------------------
// NodeState — the Knowledge module's exclusive authorship (AD-6/F-02)
// ---------------------------------------------------------------------------

export interface NodeStateUpdate {
  userId: string;
  nodeId: string;
  /** DB CHECK (0004): collapsed|expanded|selected|focused|mastered|fragile|forgotten */
  state: string;
}

/**
 * Set the per-node state.
 *
 * AD-6/F-02: Knowledge is the ONLY writer of `node_state`. It does so by
 * CONSUMING `ProgressEvidenceCreated` / `SkillStateChanged` — Progress never
 * writes here. `node_state` is therefore an upsert keyed by (user_id, node_id)
 * in practice; the caller supplies the row id.
 */
export function setNodeState(
  input: NodeStateUpdate,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'node_state',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      node_id: input.nodeId,
      state: input.state,
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

// ---------------------------------------------------------------------------
// SourceRef — provenance (ADR S14.25, fidelity AD-11)
// ---------------------------------------------------------------------------

export interface NewSourceRef {
  userId: string;
  /** the AD-15 entity this ref points to (DB column `entity`) */
  entity?: string;
  entityId?: string;
  sourceDocumentId?: string;
  page?: number;
  passage?: string;
  kind?: string;
}

/**
 * Create a provenance ref.
 *
 * NOTE ON THE SSoT `sourceId` FIELD: `SourceRef` in entities-knowledge.ts
 * declares `sourceId: string`, but the table's column is `source_document_id`
 * (a FK to `knowledge_documents`). The builder maps to the REAL column; the
 * mismatch is recorded as divergence D-4 rather than patched.
 */
export function createSourceRef(
  input: NewSourceRef,
  ctx: KnowledgeCtx,
  localMutationId: string,
  id: string,
): KnowledgeCommand {
  return {
    table: 'source_refs',
    id,
    localMutationId,
    patch: {
      id,
      user_id: input.userId,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      source_document_id: input.sourceDocumentId ?? null,
      page: input.page ?? null,
      passage: input.passage ?? null,
      kind: input.kind ?? null,
      created_at: new Date(ctx.now).toISOString(),
      updated_at: new Date(ctx.now).toISOString(),
      ...seedOrSet(ctx, localMutationId),
    },
  };
}

/**
 * The tables this module owns — the exact mirror of the `'knowledge'` entries in
 * `OWNER_MODULE_BY_ENTITY`. `knowledge.test.ts` asserts the two never drift.
 */
export const KNOWLEDGE_OWNED_TABLES = [
  'notes',
  'resources',
  'semantic_nodes',
  'semantic_edges',
  'semantic_bridges',
  'node_state',
  'source_refs',
] as const;

export type KnowledgeOwnedTable = (typeof KNOWLEDGE_OWNED_TABLES)[number];

/** Unused-import guard for the SSoT type the OR-Set fields derive from. */
export type { OrSetValue };
