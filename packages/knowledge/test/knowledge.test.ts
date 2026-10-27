/**
 * Knowledge module — single-writer + contract invariants (tranche 3 lot 3.1).
 *
 * The defect this package closes: `OWNER_MODULE_BY_ENTITY` declared 7 entities
 * owned by `'knowledge'`, the 10 tables existed, the read path (relay view +
 * PowerSync stream) was wired — but no module could legally write, because the
 * owner module did not exist. A declared owner with no implementation is a
 * missing seam that no existing check could see.
 *
 * These tests assert what the module must never do:
 *   - return MORE THAN ONE command from one use-case (AD-7, 02 S11 blocking);
 *   - write to a table it does not own;
 *   - carry a binary/blob instead of an r2_key (AD-16);
 *   - invent a domain event (AD-9 vocabulary is closed at 9).
 *
 * Run: node --experimental-strip-types --no-warnings --test packages/knowledge/test/knowledge.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOWLEDGE_OWNED_TABLES,
  KNOWLEDGE_PRODUCED_EVENTS,
  KNOWLEDGE_CONSUMED_EVENTS,
  createNote,
  updateNote,
  createResource,
  createSemanticNode,
  createSemanticEdge,
  createSemanticBridge,
  setNodeState,
  createSourceRef,
} from '../src/index.ts';

const ctx = { userId: 'u1', clientId: 'client-a', now: 1_700_000_000_000 };

test('knowledge: owns exactly the 7 tables the routing table assigns it', () => {
  // The literal is deliberate: if someone adds a table to
  // OWNER_MODULE_BY_ENTITY['knowledge'] without adding it here (or the reverse)
  // the two lists drift and one side silently stops being enforced.
  // packages/data/test/owner-module-coverage.test.ts checks the other direction.
  assert.deepEqual(
    [...KNOWLEDGE_OWNED_TABLES].sort(),
    [
      'node_state',
      'notes',
      'resources',
      'semantic_bridges',
      'semantic_edges',
      'semantic_nodes',
      'source_refs',
    ],
  );
});

test('knowledge: every builder returns ONE command against ONE owned table', () => {
  const built = [
    createNote({ userId: 'u1', title: 'N' }, ctx, 'm1', 'note-1'),
    updateNote('note-1', { title: 'N2' }, ctx, 'm2'),
    createResource({ userId: 'u1', title: 'R' }, ctx, 'm3', 'res-1'),
    createSemanticNode({ userId: 'u1', kind: 'concept', label: 'L' }, ctx, 'm4', 'node-1'),
    createSemanticEdge(
      { userId: 'u1', sourceNode: 'node-1', targetNode: 'node-2', relation: 'deepens' },
      ctx,
      'm5',
      'edge-1',
    ),
    createSemanticBridge(
      { userId: 'u1', sourceNode: 'node-1', targetNode: 'node-2', label: 'bridge' },
      ctx,
      'm6',
      'bridge-1',
    ),
    setNodeState({ userId: 'u1', nodeId: 'node-1', state: 'mastered' }, ctx, 'm7', 'ns-1'),
    createSourceRef({ userId: 'u1', passage: 'p' }, ctx, 'm8', 'ref-1'),
  ];

  for (const cmd of built) {
    assert.ok(
      (KNOWLEDGE_OWNED_TABLES as readonly string[]).includes(cmd.table),
      `builder wrote to "${cmd.table}", which Knowledge does not own (AD-7)`,
    );
    assert.equal(typeof cmd.patch, 'object', 'every command carries a patch');
    assert.equal(cmd.localMutationId.length > 0, true, 'traceability id is required (G-M4)');
  }
  // The union type is the enforcement: a second table per use-case would need a
  // return type that cannot exist. This counts the shape instead.
  assert.equal(built.length, 8, '8 use-cases, 8 single-table commands');
});

test('knowledge: a created row seeds its OR-Set (concurrent delete cannot resurrect)', () => {
  const cmd = createNote({ userId: 'u1', title: 'N' }, ctx, 'm1', 'note-1');
  assert.deepEqual(cmd.patch.crdt_added, { 'client-a': ctx.now });
  assert.deepEqual(cmd.patch.crdt_removed, {});
});

test('knowledge: the local mirror never carries an embedding (03 S4.2)', () => {
  const cmd = createSemanticNode(
    { userId: 'u1', kind: 'concept', label: 'L' },
    ctx,
    'm1',
    'node-1',
  );
  assert.equal(
    'embedding' in cmd.patch,
    false,
    'the local semantic_nodes mirror must have NO embedding column (0004 header)',
  );
});

test('knowledge: metadata only — no binary ever enters a command (AD-16)', () => {
  const cmd = createResource(
    { userId: 'u1', title: 'R', r2Key: 'dev/u1/knowledge/2026/10/25/x.pdf' },
    ctx,
    'm1',
    'res-1',
  );
  for (const [k, v] of Object.entries(cmd.patch)) {
    const isBlob =
      v instanceof Uint8Array ||
      v instanceof ArrayBuffer ||
      (typeof v === 'object' && v !== null && 'byteLength' in v && !Array.isArray(v));
    assert.equal(
      isBlob,
      false,
      `field "${k}" is a binary payload; binaries live in R2, the row keeps only r2_key`,
    );
  }
  assert.equal(cmd.patch.r2_key, 'dev/u1/knowledge/2026/10/25/x.pdf');
});

test('knowledge: produces NO event — it is a consumer (AD-9, closed vocabulary)', () => {
  assert.deepEqual(
    [...KNOWLEDGE_PRODUCED_EVENTS],
    [],
    'Knowledge produces no domain event; the AD-9 vocabulary is closed at 9',
  );
  assert.deepEqual([...KNOWLEDGE_CONSUMED_EVENTS].sort(), [
    'ProgressEvidenceCreated',
    'SkillStateChanged',
  ]);
  // No builder may attach an event — the type is `never` for that reason.
  const cmd = setNodeState({ userId: 'u1', nodeId: 'n', state: 'mastered' }, ctx, 'm1', 'ns-1');
  assert.equal(cmd.event, undefined);
});

test('knowledge: divergence D-2 is real — notes has no tags/sourceRefIds column', () => {
  // Pinned so the gap is visible rather than forgotten. The SSoT Note declares
  // `tags` + `sourceRefIds`; 0004 `notes` has neither. If a migration adds them,
  // this test fails and the builders should start writing them.
  const cmd = createNote({ userId: 'u1', title: 'N' }, ctx, 'm1', 'note-1');
  assert.equal('tags' in cmd.patch, false);
  assert.equal('source_ref_ids' in cmd.patch, false);
});

test('knowledge: divergence D-4 is real — source_refs uses source_document_id, not sourceId', () => {
  const cmd = createSourceRef({ userId: 'u1', sourceDocumentId: 'doc-1' }, ctx, 'm1', 'ref-1');
  assert.equal(cmd.patch.source_document_id, 'doc-1');
  assert.equal('source_id' in cmd.patch, false);
});
