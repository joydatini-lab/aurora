/**
 * ascent-engine-wiring.test.ts (lot B, story A5 — branchement
 * `@aurora/ascent` (moteur pédagogique)).
 *
 * Contratuel node:test : le repo `createAscentEngine` (AD-15, couche
 * provider) + les wrappers de calcul `readBaselineInputs` /
 * `computeAscentLearnerBaseline` / `computeSelectDepth` /
 * `computeBuildAscentPath` / `computeReactTo` / `computeAscentSessionContext`
 * / `computeCollectLearningCommands` / `computeCurrentLearningCommands`
 * / `computePhasesForStep` / `computeRankSources` / `computeFlagConflicts`
 * sont TESTÉS SUR MÉMOIRE (le `InMemoryLocalStore` de `packages/data` —
 * zéro PowerSync, zéro réseau, AD-7). Le module `@aurora/ascent`
 * (moteur pédagogique PUR, AD-12 server-side) est résolu via l'alias
 * vite / le package source.
 *
 * NOTE (AD-7 / AD-12) : LE BUILD DU CHEMIN (Agent Kernel) court
 * SERVER-SIDE — le device lit le `ascent_paths` miroité (frozen path) ;
 * ce repo expose le CALCUL local pour la prévisualisation + les tests.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/ascent-engine-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  createAscentEngine,
  readBaselineInputs,
  computeAscentLearnerBaseline,
  computeSelectDepth,
  computeHoursUntil,
  computeIsTimeConstrained,
  computeBuildAscentPath,
  computePhasesForStep,
  computeRankSources,
  computeFlagConflicts,
  computeSequencePhaseActivities,
  computeAscentSessionContext,
  computeCollectLearningCommands,
  computeCurrentLearningCommands,
  type AscentEngine,
} from '../src/lib/ascent-engine-repo.ts';
import type {
  SkillState,
  AscentLearningIR,
  AscentStep,
  LearnerBaseline,
  DomainEvent,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

function makeSkillStateRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'ss1',
    user_id: 'user1',
    skill_id: 'skill-1',
    proficiency: 0.5,
    updated_evidence: 'ev-1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-10T00:00:00.000Z',
    ...over,
  };
}

function makeGapRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'g1',
    user_id: 'user1',
    title: 'Gap 1',
    description: 'description 1',
    status: 'open',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('skill_states', makeSkillStateRow({}) as never);
  store.upsert('skill_states', makeSkillStateRow({ id: 'ss2', skill_id: 'skill-2', proficiency: 0.9 }) as never);
  store.upsert('gaps', makeGapRow({}) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A5 readBaselineInputs: lire les skill_states + gaps des miroirs', () => {
  const store = seedStore();
  const { skillStates, gaps } = readBaselineInputs(store);
  assert.equal(skillStates.length, 2, '2 skill states dans le miroir');
  assert.equal(gaps.length, 1, '1 gap dans le miroir');
  const ss1 = skillStates.find((s) => s.skillId === 'skill-1')!;
  assert.equal(ss1.confidence, 0.5, 'proficiency 0.5 → confidence 0.5');
});

test('A5 computeAscentLearnerBaseline: le module SSoT (S6.2) dérive le baseline', () => {
  const store = seedStore();
  const baseline = computeAscentLearnerBaseline(store, 'user1', '2026-10-13T00:00:00.000Z');
  assert.equal(baseline.userId, 'user1');
  assert.equal(baseline.skillStates.length, 2);
  // Le baseline dérive les buckets gaps/fragiles/mastered du skillStates (S6.2).
  // skill-1 (proficiency 0.5) → level 'guided-application' (0.4-0.6) → status 'known'
  // skill-2 (proficiency 0.9) → level 'novel-problem' (0.85-0.95) → status 'fragile'
  assert.equal(
    baseline.skillStates.find((s) => s.skillId === 'skill-1')!.status,
    'known',
    'skill-1 (level guided-application) → status known',
  );
  assert.equal(
    baseline.skillStates.find((s) => s.skillId === 'skill-2')!.status,
    'fragile',
    'skill-2 (level novel-problem) → status fragile',
  );
  // Le bucket `fragiles` est dérivé (S6.2) : skill-2 est fragile.
  assert.ok(
    baseline.fragiles.includes('skill-2'),
    'le bucket fragiles contient skill-2',
  );
});

test('A5 computeSelectDepth: S13 — time-constrained → quick depth', () => {
  // Le module (S13) : le selectDepth reçoit le baseline + l importance +
  // le targetDate + le now. Time-constrained (< 72h au deadline) → 'quick'
  // (exam week, QCM priority). Ici : importance 'standard', targetDate
  // dans 24h → quick.
  const depth = computeSelectDepth({
    baseline: {
      userId: 'u1',
      skillStates: [],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '2026-10-13T00:00:00.000Z',
    },
    importance: { skillId: 'skill-1', importance: 'standard' },
    targetDate: '2026-10-14T00:00:00.000Z',
    now: '2026-10-13T00:00:00.000Z',
  });
  assert.equal(depth, 'quick', 'time-constrained (24h) → quick');
});

test('A5 computeSelectDepth: importance core + non-constrained + known → deep', () => {
  // Le module (S13) : core + unknown/partial/known → 'deep' (mastery of
  // the prerequisite before it chains forward). Ici : importance 'core',
  // status 'known', targetDate dans 30 jours (non-constrained).
  const depth = computeSelectDepth({
    baseline: {
      userId: 'u1',
      skillStates: [
        {
          skillId: 'skill-1',
          status: 'known' as LearnerBaseline['skillStates'][number]['status'],
          dimensions: { understanding: 0.8, recall: 0.8, application: 0.4, autonomy: 0.2, retention: 0.5 },
          lastEvidence: '',
          freshness: '',
        },
      ],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '2026-10-13T00:00:00.000Z',
    },
    importance: { skillId: 'skill-1', importance: 'core' },
    targetDate: '2026-11-12T00:00:00.000Z',
    now: '2026-10-13T00:00:00.000Z',
  });
  assert.equal(depth, 'deep', 'core + known + non-constrained → deep');
});

test('A5 computeHoursUntil: 7 jours restants → 168h', () => {
  const hours = computeHoursUntil(
    '2026-10-20T00:00:00.000Z',
    '2026-10-13T00:00:00.000Z',
  );
  assert.equal(hours, 168, '7 jours = 168 heures');
});

test('A5 computeIsTimeConstrained: un target proche → true', () => {
  const constrained = computeIsTimeConstrained(
    '2026-10-14T00:00:00.000Z',
    '2026-10-13T00:00:00.000Z',
  );
  assert.equal(constrained, true, '1 jour restant → time-constrained');
});

test('A5 computePhasesForStep: S10 framework — mastered → skip READ', () => {
  const phases = computePhasesForStep({
    status: 'pending',
    baselineStatus: 'mastered',
  });
  assert.deepEqual(phases, ['do', 'prove'], 'mastered → skip READ');
});

test('A5 computePhasesForStep: S10 framework — time-constrained → PROVE only', () => {
  const phases = computePhasesForStep({
    status: 'pending',
    timeConstrained: true,
  });
  assert.deepEqual(phases, ['prove'], 'time-constrained → PROVE only');
});

test('A5 computeRankSources: S14 — l autorité détermine le classement', () => {
  const refs = [
    { level: 'C' as const, id: 'c1', title: 'C' },
    { level: 'A' as const, id: 'a1', title: 'A' },
    { level: 'B' as const, id: 'b1', title: 'B' },
  ];
  const ranked = computeRankSources(refs);
  assert.equal(ranked[0]!.level, 'A', 'A (autorité max) en tête');
  assert.equal(ranked[1]!.level, 'B');
  assert.equal(ranked[2]!.level, 'C', 'C (autorité min) en dernier');
});

test('A5 createAscentEngine: la façade expose le moteur SSoT (AD-15)', () => {
  const store = seedStore();
  const engine = createAscentEngine(store);
  assert.equal(engine.store, store, 'la façade garde la référence du store');
  assert.equal(typeof engine.buildPath, 'function');
  assert.equal(typeof engine.reactTo, 'function');
  assert.equal(typeof engine.selectDepth, 'function');
  // Le engine est la SSoT du moteur — la page n importe PAS le module.
});

test('A5 computeBuildAscentPath: S10/S13 — READ→DO→PROVE + scaling par profondeur', () => {
  // Le module (S10) : READ→DO→PROVE par concept, scaling par profondeur.
  // Un input minimal (1 concept, profondeur standard) produit un IR avec
  // 3 steps (read + do + prove) ; le budget DEPTH_BUDGETS.standard est
  // appliqué au step DO (exemples + flashcards).
  const path = computeBuildAscentPath({
    userId: 'user1',
    goal: 'Master RDM by exam day',
    targetSkill: 'skill-1',
    targetDate: '2026-11-01T00:00:00.000Z',
    baseline: {
      userId: 'user1',
      skillStates: [
        {
          skillId: 'skill-1',
          status: 'known' as LearnerBaseline['skillStates'][number]['status'],
          dimensions: {
            understanding: 0.8,
            recall: 0.8,
            application: 0.4,
            autonomy: 0.2,
            retention: 0.5,
          },
          lastEvidence: 'ev-1',
          freshness: '2026-10-10T00:00:00.000Z',
        },
      ],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '2026-10-13T00:00:00.000Z',
    },
    inputs: [
      {
        conceptId: 'concept-1',
        label: 'Concept 1',
        skillId: 'skill-1',
        sourceRefIds: [],
        requires: [],
        importance: 'medium' as const,
      },
    ],
    now: '2026-10-13T00:00:00.000Z',
  });
  assert.equal(path.userId, 'user1');
  assert.equal(path.goal, 'Master RDM by exam day');
  // Le module (S10/S13) : chaque concept → READ, DO, PROVE (framework
  // order) + UN RECAP qui clôt le chemin (path-builder.ts L179-189).
  // Donc 1 concept = 4 steps (read + do + prove + recap).
  assert.equal(
    path.steps.length,
    4,
    'READ→DO→PROVE + RECAP = 4 steps (framework S10)',
  );
  const phases = path.steps.map((s) => s.phase);
  assert.deepEqual(
    phases,
    ['read', 'do', 'prove', 'recap'],
    "l ordre READ→DO→PROVE→RECAP est préservé (S10)",
  );
});

test('A5 computeAscentSessionContext: S5/S7 — le l1 = current + next (S11)', () => {
  // Le kernel session context (S5/S7) : la slice du chemin que le Context
  // Builder du kernel injecte pour "what should the user learn next?".
  // La dérivation Level-1 est PARTAGÉE avec le Slide-Ascent UI (S11 SSoT).
  const path: AscentLearningIR = {
    id: 'p1',
    userId: 'user1',
    goal: 'Master RDM',
    steps: [
      {
        id: 's1',
        conceptRefs: ['c1'],
        label: 'Read c1',
        phase: 'read' as AscentStep['phase'],
        status: 'done' as AscentStep['status'],
        activities: [],
      },
      {
        id: 's2',
        conceptRefs: ['c1'],
        label: 'Do c1',
        phase: 'do' as AscentStep['phase'],
        status: 'active' as AscentStep['status'],
        activities: [],
      },
      {
        id: 's3',
        conceptRefs: ['c1'],
        label: 'Prove c1',
        phase: 'prove' as AscentStep['phase'],
        status: 'pending' as AscentStep['status'],
        activities: [],
      },
    ],
    depth: {},
    baseline: {
      userId: 'user1',
      skillStates: [],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '',
    },
    prerequisites: [],
    passageCriteria: [],
    adaptations: [],
    status: 'active' as AscentLearningIR['status'],
    createdAt: '',
    updatedAt: '',
  };
  const ctx = computeAscentSessionContext(path);
  assert.equal(ctx.goal, 'Master RDM');
  // Le activeStep est le step 'active' (s2 = DO).
  assert.equal(ctx.activeStep?.id, 's2', 'le activeStep est le DO (active)');
  // Le l1 est la dérivation S11 (current + next).
  assert.equal(ctx.l1.current?.id, 's2', 'l1.current = le step active (S11)');
});

test('A5 computeCollectLearningCommands: AD-7 — Ascent → Learning (learningCommand)', () => {
  // Le module (AD-7) : Ascent décide le QUOI + l'ORDRE ; Learning fait
  // le travail. Les LearningCommands sont les activités qui portent un
  // `learningCommand` (le type `AscentActivity.learningCommand`).
  const path: AscentLearningIR = {
    id: 'p1',
    userId: 'user1',
    goal: 'Master RDM',
    steps: [
      {
        id: 's1',
        conceptRefs: ['c1'],
        label: 'Do c1',
        phase: 'do' as AscentStep['phase'],
        status: 'active' as AscentStep['status'],
        activities: [
          {
            id: 'a1',
            type: 'exercise' as const,
            learningCommand: {
              action: 'create_exercise' as const,
              params: { topic: 'c1', depth: 'standard' as const, item_count: 5 },
            },
          },
          {
            id: 'a2',
            type: 'flashcard' as const,
            learningCommand: {
              action: 'generate_flashcards' as const,
              params: { topic: 'c1', depth: 'standard' as const, item_count: 3 },
            },
          },
        ],
      },
    ],
    depth: {},
    baseline: {
      userId: 'user1',
      skillStates: [],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '',
    },
    prerequisites: [],
    passageCriteria: [],
    adaptations: [],
    status: 'active' as AscentLearningIR['status'],
    createdAt: '',
    updatedAt: '',
  };
  const cmds = computeCollectLearningCommands(path, 's1');
  assert.equal(cmds.length, 2, '2 LearningCommands (exercise + flashcard)');
  assert.equal(cmds[0]!.action, 'create_exercise');
  assert.equal(cmds[1]!.action, 'generate_flashcards');
});

test('A5 computeCurrentLearningCommands: le active step commands (S5/S7)', () => {
  const path: AscentLearningIR = {
    id: 'p1',
    userId: 'user1',
    goal: 'Master RDM',
    steps: [
      {
        id: 's1',
        conceptRefs: ['c1'],
        label: 'Read c1',
        phase: 'read' as AscentStep['phase'],
        status: 'done' as AscentStep['status'],
        activities: [],
      },
      {
        id: 's2',
        conceptRefs: ['c1'],
        label: 'Do c1',
        phase: 'do' as AscentStep['phase'],
        status: 'active' as AscentStep['status'],
        activities: [
          {
            id: 'a1',
            type: 'exercise' as const,
            learningCommand: {
              action: 'create_exercise' as const,
              params: { topic: 'c1', depth: 'standard' as const, item_count: 5 },
            },
          },
        ],
      },
    ],
    depth: {},
    baseline: {
      userId: 'user1',
      skillStates: [],
      gaps: [],
      fragiles: [],
      mastered: [],
      computedAt: '',
    },
    prerequisites: [],
    passageCriteria: [],
    adaptations: [],
    status: 'active' as AscentLearningIR['status'],
    createdAt: '',
    updatedAt: '',
  };
  const cmds = computeCurrentLearningCommands(path);
  assert.equal(cmds.length, 1, 'le active step porte 1 LearningCommand');
  assert.equal(cmds[0]!.action, 'create_exercise');
});

test('A5 computeFlagConflicts: S14 — un conflit de source (A vs B, autorités différentes)', () => {
  // Le module (S14 source hierarchy) : flag les conflits entre 2 refs
  // qui contredisent le même concept avec des autorités DIFFÉRENTES.
  // Le `SourceRefInfo` (AD-15) = { refId, level, label? }. Le module
  // `resolveConflict` retourne `undefined` si les autorités sont
  // identiques ; sinon la source la plus autorisée gagne + le conflit
  // est flagué (jamais silencieux, S16).
  const refs = [
    { refId: 'a1', level: 'A' as const, label: 'A' },
    { refId: 'b1', level: 'B' as const, label: 'B' },
  ];
  const conflicts = computeFlagConflicts(refs);
  assert.equal(conflicts.length, 1, 'un conflit de source détecté');
  assert.equal(conflicts[0]!.winner.refId, 'a1', 'A (autorité max) gagne');
  assert.equal(conflicts[0]!.overridden.refId, 'b1');
  assert.ok(
    conflicts[0]!.message.includes('Level A'),
    'le message mentionne le niveau gagnant (A)',
  );
});
