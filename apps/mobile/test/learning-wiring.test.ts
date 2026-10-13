/**
 * learning-wiring.test.ts (lot B, story A3 — branchement `@aurora/learning`).
 *
 * Contratuel node:test : le repo `createLearningRepo` (AD-15, couche
 * provider) + les wrappers de calcul `readLearning` / `computeFsrsNext` /
 * `computeRecurringErrors` / `computeNextRevisionDifficulty` /
 * `computeMirrorFindings` / `computeTreeLayout` / `checkTreeInvariantsRepo`
 * / `lazyExpandRepo` / `buildRetrievalQueriesRepo` / `fuseRetrievalRepo`
 * sont TESTÉS SUR MÉMOIRE (le `InMemoryLocalStore` de `packages/data` —
 * zéro PowerSync, zéro réseau, AD-7). Le module `@aurora/learning`
 * (logique pure) est résolu via l'alias vite / le package source.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/learning-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  createLearningRepo,
  readLearning,
  computeFsrsNext,
  computeRecurringErrors,
  computeNextRevisionDifficulty,
  computeMirrorFindings,
  computeTreeLayout,
  checkTreeInvariantsRepo,
  lazyExpandRepo,
  buildRetrievalQueriesRepo,
  fuseRetrievalRepo,
  type LearningSessionRow,
  type ReviewRow,
} from '../src/lib/learning-repo.ts';
import type {
  SemanticNode,
  SemanticEdge,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

function makeSessionRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'ls1',
    user_id: 'user1',
    course_id: 'course-1',
    started_at: '2026-10-01T09:00:00.000Z',
    ended_at: '2026-10-01T10:00:00.000Z',
    summary: 'résumé',
    created_at: '2026-10-01T09:00:00.000Z',
    updated_at: '2026-10-01T10:00:00.000Z',
    ...over,
  };
}

function makeReviewRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'rv1',
    user_id: 'user1',
    item_id: 'item-1',
    rating: 3,
    comment: 'bien',
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('learning_sessions', makeSessionRow({}) as never);
  store.upsert('learning_sessions', makeSessionRow({ id: 'ls2', course_id: 'course-2' }) as never);
  store.upsert('reviews', makeReviewRow({}) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A3 readLearning: snake→camel mapping — learning_sessions + reviews', () => {
  const store = seedStore();
  const read = readLearning(store);
  assert.equal(read.sessions.length, 2);
  const s1 = read.sessions.find((s) => s.id === 'ls1') as LearningSessionRow;
  assert.equal(s1.courseId, 'course-1', 'course_id miroir → courseId');
  assert.equal(s1.summary, 'résumé');
  assert.equal(read.reviews.length, 1);
  const r1 = read.reviews[0]!;
  assert.equal(r1.rating, 3);
  assert.equal(r1.itemId, 'item-1');
});

test('A3 createLearningRepo: sessions list (LocalQueryRepository facet)', async () => {
  const store = seedStore();
  const repo = createLearningRepo(store);
  const sessions = await repo.sessions.list({ entity: 'learning_sessions' });
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0]!.userId, 'user1');
});

test('A3 createLearningRepo: reviews list', async () => {
  const store = seedStore();
  const repo = createLearningRepo(store);
  const reviews = await repo.reviews.list({ entity: 'reviews' });
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]!.rating, 3);
});

test('A3 createLearningRepo: watch delivers the current projection + reacts', async () => {
  const store = seedStore();
  const repo = createLearningRepo(store);
  const seen: string[][] = [];
  const unsub = repo.sessions.watch(
    { entity: 'learning_sessions' },
    (rows) => seen.push(rows.map((r) => r.id)),
  );
  // Le watch du repo + le watch du store livrent chacun la projection
  // initiale de façon synchrone. `seen` capture donc 2 livraisons.
  assert.deepEqual(seen[0], ['ls1', 'ls2'], 'watch delivers the current projection');
  store.upsert('learning_sessions', makeSessionRow({ id: 'ls3', course_id: 'course-3' }) as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    seen.length >= 3 && seen[seen.length - 1]!.includes('ls3'),
    'watch reacts to a local upsync (03 S5.2.2)',
  );
  unsub();
});

test('A3 computeFsrsNext: new card (state null) → initial stability + learning step', () => {
  // Nouvelle carte (state null), rating 3 (Good) : le learning step est
  // `learningSteps[1]` = 5 min (rating > 1). due = now + 5 min.
  const nowMs = Date.parse('2026-10-13T12:00:00.000Z');
  const out = computeFsrsNext({
    state: null,
    rating: 3,
    elapsedDays: 0,
    now: nowMs,
  });
  assert.ok(out.stability >= 1, 'stability bornée ≥ 1 (clamp v5)');
  assert.ok(out.difficulty >= 1 && out.difficulty <= 10);
  assert.equal(out.lapses, 0, 'rating 3 (Good) → pas de lapse');
  assert.equal(
    out.due,
    nowMs + 5 * 60_000,
    'learning step 5 min (rating > 1 → learningSteps[1])',
  );
});

test('A3 computeRecurringErrors: an item failed on 2+ difficulties → 1 cluster', () => {
  // L'item `item-x` échoue sur `recall` + `comprehension` (2 difficultés
  // distinctes) → `distinctDifficulties = 2 ≥ perThreshold (2)` → cluster.
  const attempts = [
    { learningItemId: 'item-x', userId: 'u1', correct: false, confidence: 0.4, difficulty: 'recall', at: '2026-10-01' },
    { learningItemId: 'item-x', userId: 'u1', correct: false, confidence: 0.5, difficulty: 'comprehension', at: '2026-10-02' },
    { learningItemId: 'item-y', userId: 'u1', correct: true, confidence: 0.9, difficulty: 'recall', at: '2026-10-01' },
  ] as const;
  const clusters = computeRecurringErrors([...attempts]);
  assert.equal(clusters.length, 1, 'un seul item est en échec récurrent');
  assert.equal(clusters[0]!.itemIds[0], 'item-x');
  assert.ok(clusters[0]!.itemIds.length === 1);
});

test('A3 computeNextRevisionDifficulty: skill level → QCM difficulty mapping', () => {
  // La map SSoT du module (qcm.ts L102-118) :
  assert.equal(computeNextRevisionDifficulty({ level: 'discovered' }), 'recall');
  assert.equal(computeNextRevisionDifficulty({ level: 'comprehended' }), 'comprehension');
  assert.equal(
    computeNextRevisionDifficulty({ level: 'guided-application' }),
    'application',
  );
  assert.equal(
    computeNextRevisionDifficulty({ level: 'autonomous-application' }),
    'analysis',
  );
  assert.equal(
    computeNextRevisionDifficulty({ level: 'mastered' }),
    'synthesis',
  );
});

test('A3 computeMirrorFindings: a claim on a not-yet node → gap finding', () => {
  const nodes: Array<{ id: string; label: string; learningState?: string }> = [
    { id: 'n1', label: 'Nœud 1', learningState: 'not-yet' },
    { id: 'n2', label: 'Nœud 2', learningState: 'mastered' },
  ];
  const claims = [
    { text: 'Je pense que n1 est X', nodeId: 'n1' },
    { text: 'Je sais que n2 est Y', nodeId: 'n2' },
  ];
  const { findings, weakNodes } = computeMirrorFindings(claims, nodes);
  assert.equal(findings.length, 1, 'un seul finding (n1 not-yet → gap)');
  assert.equal(findings[0]!.kind, 'gap');
  assert.equal(findings[0]!.nodeId, 'n1');
  assert.deepEqual(weakNodes, ['n1']);
});

test('A3 computeTreeLayout: a 2-node tree → 2 placed nodes + 1 edge', () => {
  const nodes: SemanticNode[] = [
    {
      id: 'root', userId: 'u1', kind: 'principle', label: 'Racine',
      isRoot: true, sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
    {
      id: 'child', userId: 'u1', kind: 'concept', label: 'Enfant',
      parentId: 'root', sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
  ];
  const edges: SemanticEdge[] = [];
  const layout = computeTreeLayout(nodes, edges);
  assert.equal(layout.nodes.length, 2, '2 nœuds positionnés');
  // Le layout est déterministe (depth = longest path from root) : root à
  // depth 0 (y=0), child à depth 1 (y = h + rankGap).
  const root = layout.nodes.find((n) => n.id === 'root')!;
  const child = layout.nodes.find((n) => n.id === 'child')!;
  assert.ok(child.y > root.y, 'child est plus bas que root (h + rankGap)');
});

test('A3 checkTreeInvariantsRepo: a valid tree → ok:true, no violations', () => {
  const nodes: SemanticNode[] = [
    {
      id: 'root', userId: 'u1', kind: 'principle', label: 'Racine',
      isRoot: true, sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
    {
      id: 'child', userId: 'u1', kind: 'concept', label: 'Enfant',
      parentId: 'root', sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
  ];
  const edges: SemanticEdge[] = [];
  const result = checkTreeInvariantsRepo(nodes, edges);
  assert.equal(result.ok, true, 'tree valide (1 root, tous atteignables, pas de cycle)');
  assert.equal(result.violations.length, 0);
});

test('A3 checkTreeInvariantsRepo: a cycle → ok:false, "cycle detected"', () => {
  const nodes: SemanticNode[] = [
    {
      id: 'a', userId: 'u1', kind: 'principle', label: 'A',
      isRoot: true, sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
    {
      id: 'b', userId: 'u1', kind: 'concept', label: 'B',
      parentId: 'a', sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
  ];
  // Un edge `depends-on` b → a : le module combine l'arc parent a→b (via
  // parentId) avec l'arc depends-on b→a → cycle 2-élementaire détecté par
  // l'invariant #3 (DFS 3-color, semantic-tree.ts L104-125).
  const edges: SemanticEdge[] = [
    {
      id: 'e1', userId: 'u1', fromNodeId: 'b', toNodeId: 'a',
      relation: 'depends-on', createdAt: '', updatedAt: '',
    },
  ];
  const result = checkTreeInvariantsRepo(nodes, edges);
  assert.equal(result.ok, false, 'cycle détecté');
  assert.ok(
    result.violations.some((v) => v.includes('cycle')),
    'la violation "cycle" est rapportée',
  );
});

test('A3 lazyExpandRepo: depth 1 from root → root + children visible', () => {
  const nodes: SemanticNode[] = [
    {
      id: 'root', userId: 'u1', kind: 'principle', label: 'R',
      isRoot: true, sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
    {
      id: 'c1', userId: 'u1', kind: 'concept', label: 'C1',
      parentId: 'root', sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
    {
      id: 'c2', userId: 'u1', kind: 'concept', label: 'C2',
      parentId: 'root', sourceRefIds: [], evidenceRefIds: [],
      createdAt: '', updatedAt: '',
    },
  ];
  const edges: SemanticEdge[] = [];
  const visible = lazyExpandRepo(nodes, edges, 1);
  assert.equal(visible.length, 3, 'depth 1 = root + ses 2 enfants');
  assert.ok(visible.includes('root'));
  assert.ok(visible.includes('c1'));
  assert.ok(visible.includes('c2'));
});

test('A3 buildRetrievalQueriesRepo: FTS SQL always present, vector SQL when embedding=768', () => {
  // Le module est server-only (AD-12) ; le repo expose le query contract
  // partagé EF + tests. Pas d'exécution ici (le test n'exécute pas de SQL).
  const req = { userId: 'user1', query: 'structures' };
  const withoutVec = buildRetrievalQueriesRepo(req);
  assert.ok(withoutVec.ftsSql.includes('ts_rank'), 'FTS SQL : ts_rank présent');
  assert.equal(withoutVec.vectorSql, undefined, 'sans embedding → pas de vector SQL');

  // 768-dim embedding (bge-base, 0004) → le vector SQL est produit.
  const reqVec = {
    userId: 'user1',
    query: 'structures',
    embedding: new Array(768).fill(0.1) as number[],
  };
  const withVec = buildRetrievalQueriesRepo(reqVec);
  assert.ok(
    withVec.vectorSql?.includes('<=>') ?? false,
    'vector SQL : opérateur cosine distance `<=>` présent',
  );
});

test('A3 fuseRetrievalRepo: reciprocal-rank fusion of FTS + vector legs', () => {
  // Un chunk dans les deux legs a un bonus reciprocal-rank (+0.1) et
  // outranks un chunk dans un seul leg.
  const fts = [
    { chunkId: 'a', documentId: 'd1', score: 1.0 },
    { chunkId: 'b', documentId: 'd1', score: 0.5 },
  ];
  const vector = [
    { chunkId: 'a', documentId: 'd1', score: 1.0 },
  ];
  const fused = fuseRetrievalRepo(fts, vector);
  assert.equal(fused[0]!.chunkId, 'a', 'le chunk dual-recall (a) outrank le single (b)');
  assert.ok(fused[0]!.score > 0.5, 'le score fusé de `a` est élevé (dual + bonus)');
});
