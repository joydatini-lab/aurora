/**
 * progress-wiring.test.ts (lot B, story A1 — branchement `@aurora/progress`).
 *
 * Contratuel node:test : le repo `createProgressRepo` (AD-15, couche
 * provider) + les wrappers de calcul `readProgress` / `computeDashboard` /
 * `computeTrajectory` / `computeTodayBoard` / `computeTrendBoard` /
 * `computeRecomputeSkill` sont TESTÉS SUR MÉMOIRE (le `InMemoryLocalStore`
 * de `packages/data` — zéro PowerSync, zéro réseau, AD-7). Le module
 * `@aurora/progress` (logique pure) est résolu via l'alias vite / le
 * package source.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/progress-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  createProgressRepo,
  readProgress,
  computeDashboard,
  computeTrajectory,
  computeTodayBoard,
  computeTrendBoard,
  computeRecomputeSkill,
  type ProgressRead,
} from '../src/lib/progress-repo.ts';
import type {
  SkillState,
  ProgressSnapshot,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

function makeSkillStateRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'ss1',
    user_id: 'user1',
    skill_id: 'skill-1',
    proficiency: 0.8,
    updated_evidence: 'ev-1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-10T00:00:00.000Z',
    ...over,
  };
}

function makeSnapshotRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'ps1',
    user_id: 'user1',
    skill_id: 'skill-1',
    value: 0.6,
    snapshot_at: '2026-10-05T00:00:00.000Z',
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('skill_states', makeSkillStateRow({}) as never);
  store.upsert('skill_states', makeSkillStateRow({ id: 'ss2', skill_id: 'skill-2', proficiency: 0.2 }) as never);
  store.upsert('progress_snapshots', makeSnapshotRow({}) as never);
  store.upsert('progress_snapshots', makeSnapshotRow({ id: 'ps2', skill_id: 'skill-1', value: 0.7, snapshot_at: '2026-10-12T00:00:00.000Z' }) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A1 readProgress: snake→camel mapping — proficiency → level (échelle S18.2)', () => {
  const store = seedStore();
  const read = readProgress(store);
  assert.equal(read.skillStates.length, 2);
  const ss1 = read.skillStates.find((s) => s.id === 'ss1') as SkillState;
  // proficiency 0.8 → 'autonomous-application' (0.75 ≤ p < 0.9)
  assert.equal(ss1.level, 'autonomous-application');
  assert.equal(ss1.confidence, 0.8, 'proficiency proxy de confiance');
  const ss2 = read.skillStates.find((s) => s.id === 'ss2') as SkillState;
  // proficiency 0.2 → 'comprehended' (0.15 ≤ p < 0.3)
  assert.equal(ss2.level, 'comprehended');
});

test('A1 readProgress: snapshots mapping — value → level (échelle S18.2)', () => {
  const store = seedStore();
  const read = readProgress(store);
  assert.equal(read.snapshots.length, 2);
  const ps1 = read.snapshots.find((s) => s.id === 'ps1') as ProgressSnapshot;
  // value 0.6 → 'guided-application' (0.6 ≤ p < 0.75)
  assert.equal(ps1.level, 'guided-application');
  assert.equal(ps1.takenAt, '2026-10-05T00:00:00.000Z');
});

test('A1 createProgressRepo: skillStates list (LocalQueryRepository facet)', async () => {
  const store = seedStore();
  const repo = createProgressRepo(store);
  const states = await repo.skillStates.list({ entity: 'skill_states' });
  assert.equal(states.length, 2);
  assert.equal(states[0]!.skillId, 'skill-1');
});

test('A1 createProgressRepo: snapshots list', async () => {
  const store = seedStore();
  const repo = createProgressRepo(store);
  const snapshots = await repo.snapshots.list({ entity: 'progress_snapshots' });
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0]!.subject, 'skill-1');
});

test('A1 createProgressRepo: watch delivers the current projection + reacts', async () => {
  const store = seedStore();
  const repo = createProgressRepo(store);
  const seen: string[][] = [];
  const unsub = repo.skillStates.watch(
    { entity: 'skill_states' },
    (rows) => seen.push(rows.map((r) => r.id)),
  );
  // Le watch du repo + le watch du store livrent chacun la projection
  // initiale de façon synchrone (store.watch L158-163 fait `onChange`
  // immédiatement). `seen` capture donc 2 livraisons.
  assert.deepEqual(seen[0], ['ss1', 'ss2'], 'watch delivers the current projection');
  store.upsert('skill_states', makeSkillStateRow({ id: 'ss3', skill_id: 'skill-3', proficiency: 0.5 }) as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    seen.length >= 3 && seen[seen.length - 1]!.includes('ss3'),
    'watch reacts to a local upsync (03 S5.2.2)',
  );
  unsub();
});

test('A1 computeDashboard: "today" board → table ChartSpec (S18.1)', () => {
  const store = seedStore();
  const nowIso = '2026-10-13T00:00:00.000Z';
  const spec = computeDashboard(store, 'today', undefined, nowIso);
  assert.equal(spec.type, 'table');
  assert.equal(spec.data.length, 2, '2 skill states dans le miroir');
  // Le "today" board est ordonné par levelToOrdinal décroissant (S18.1).
  const rows = spec.data as Array<{ skill: string; ordinal: number }>;
  assert.equal(rows[0]!.skill, 'skill-1', 'skill-1 (proficiency 0.8) en tête');
});

test('A1 computeTrajectory: skill-1 → 2 points (les 2 snapshots de skill-1)', () => {
  const store = seedStore();
  const spec = computeTrajectory(store, 'skill-1');
  assert.equal(spec.type, 'line');
  assert.equal(spec.data.length, 2);
  const data = spec.data as Array<{ time: string }>;
  assert.equal(data[0]!.time, '2026-10-05T00:00:00.000Z', 'tri par takenAt ascendant');
  assert.equal(data[1]!.time, '2026-10-12T00:00:00.000Z');
});

test('A1 computeTrendBoard: "week" → area ChartSpec (S18.2)', () => {
  const store = seedStore();
  const spec = computeTrendBoard(store, 'week', 'skill-1');
  assert.equal(spec.type, 'area');
  assert.equal(spec.data.length, 2, '2 snapshots pour skill-1');
});

test('A1 computeTodayBoard: standalone (pas par dashboard)', () => {
  const store = seedStore();
  const nowIso = '2026-10-13T00:00:00.000Z';
  const spec = computeTodayBoard(store, undefined, nowIso);
  assert.equal(spec.type, 'table');
  assert.equal(spec.data.length, 2);
});

test('A1 computeRecomputeSkill: idempotent (AD-8) — running twice = same state', () => {
  // Le module est testé via le wrapper (la même logique passe par le repo).
  // Les evidences ne sont PAS miroitées (server-only, 03 S4.2) : on passe
  // un jeu de evidences vide + un state courant → le recompute est
  // idempotent (AD-8) : le NIVEAU est identique sur les deux passes.
  //
  // Comportement SSoT du module (recompute.ts L61-103) : sans evidence,
  // `best` reste `undefined` → le level recalculé est `'discovered'`
  // (le niveau par défaut, PAS le niveau courant préservé). La confiance
  // recalculée est 0 (pas d'evidence → pas de recency weight) →
  // `changed=true` (confidence courante 0.8 ≠ 0). Le module "recalcul"
  // ne préserve pas le niveau courant quand aucune evidence ne le soutient :
  // c'est le contrat AD-8 (le recompute est une AGGREGATION, pas une
  // lecture de l'ancien state). Le test assert l'idempotence (le même
  // input produit le même output sur 2 passes) + le comportement SSoT.
  const current: SkillState = {
    id: 'ss1',
    userId: 'user1',
    skillId: 'skill-1',
    level: 'autonomous-application',
    confidence: 0.8,
    evidenceRefs: [],
    history: [],
    updatedAt: '2026-10-10T00:00:00.000Z',
  };
  const input = {
    userId: 'user1',
    skillId: 'skill-1',
    current,
    evidences: [] as readonly import('@aurora/domain').ProgressEvidence[],
    now: '2026-10-13T00:00:00.000Z',
  };
  const r1 = computeRecomputeSkill(input);
  const r2 = computeRecomputeSkill(input);
  assert.equal(r1.state.level, r2.state.level, 'level idempotent (AD-8)');
  assert.equal(r1.state.level, 'discovered', 'sans evidence → niveau par défaut SSoT');
  assert.equal(r1.changed, true, 'changed=true : confidence recalculée (0) ≠ courante (0.8)');
});

export type { ProgressRead };
