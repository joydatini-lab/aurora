/**
 * productivity-wiring.test.ts (lot B, story A2 — branchement
 * `@aurora/productivity`).
 *
 * Contratuel node:test : le repo `createProductivityRepo` (AD-15, couche
 * provider) + les wrappers de calcul `readProductivity` / `computeReview` /
 * `computeAnalytics` / `computeHabitStreak` / `computeHabitHeatmap` /
 * `computeQuadrantBoard` / `computeCountdownDaysLeft` sont TESTÉS SUR MÉMOIRE
 * (le `InMemoryLocalStore` de `packages/data` — zéro PowerSync, zéro
 * réseau, AD-7). Le module `@aurora/productivity` (logique pure) est
 * résolu via l'alias vite / le package source.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --test test/productivity-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  createProductivityRepo,
  readProductivity,
  computeReview,
  computeAnalytics,
  computeHabitStreak,
  computeHabitHeatmap,
  computeQuadrantBoard,
  computeCountdownDaysLeft,
  type HabitRow,
} from '../src/lib/productivity-repo.ts';
import type {
  Goal,
  Task,
  Decision,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (the PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

const NOW_MS = Date.parse('2026-10-13T12:00:00.000Z');

function makeTaskRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 't1',
    user_id: 'user1',
    subject: 'Tâche A',
    description: undefined,
    status: 'todo',
    priority: 3,
    due_date: undefined,
    completed_at: undefined,
    created_at: '2026-10-10T00:00:00.000Z',
    updated_at: '2026-10-13T00:00:00.000Z',
    ...over,
  };
}

function makeGoalRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'g1',
    user_id: 'user1',
    title: 'Goal 1',
    description: undefined,
    status: 'active',
    target_date: undefined,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function makeDecisionRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'd1',
    user_id: 'user1',
    context: 'ctx',
    decision: 'décision prise',
    rationale: 'rationale',
    created_at: '2026-10-12T00:00:00.000Z',
    updated_at: '2026-10-12T00:00:00.000Z',
    ...over,
  };
}

// The mirror row is shaped like the DATABASE, not like the client schema:
// habits has name/target/status/streak (0002) and NO title/description/active.
// Seeding the client-schema shape is what hid the drift for so long — the test
// passed while the relay would have delivered an unreadable row.
function makeHabitRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'h1',
    user_id: 'user1',
    name: 'Habit 1',
    frequency: JSON.stringify({ cadence: 'daily' }),
    target: 'daily',
    status: 'active',
    streak: 3,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function makeRoutineRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'r1',
    user_id: 'user1',
    name: 'Routine 1',
    anchor: JSON.stringify({ type: 'time', at: '08:00' }),
    steps: JSON.stringify([]),
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function makeCountdownRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'c1',
    user_id: 'user1',
    kind: 'countdown',
    title: 'Compte à rebours',
    target_date: '2026-10-20T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('tasks', makeTaskRow({ id: 't1', status: 'todo', due_at: '2026-10-12T00:00:00.000Z' }) as never);
  store.upsert('tasks', makeTaskRow({ id: 't2', status: 'done', due_at: '2026-10-11T00:00:00.000Z', updated_at: '2026-10-11T10:00:00.000Z' }) as never);
  store.upsert('goals', makeGoalRow({}) as never);
  store.upsert('decisions', makeDecisionRow({}) as never);
  store.upsert('habits', makeHabitRow({}) as never);
  store.upsert('routines', makeRoutineRow({}) as never);
  store.upsert('countdown', makeCountdownRow({}) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A2 readProductivity: snake→camel mapping — tasks subject→title, due_at→dueAt', () => {
  const store = seedStore();
  const read = readProductivity(store);
  const task = read.tasks.find((t) => t.id === 't1') as Task;
  assert.equal(task.title, 'Tâche A', 'subject miroir → title entité');
  assert.equal(task.dueAt, '2026-10-12T00:00:00.000Z', 'due_at miroir → dueAt');
  assert.equal(task.status, 'todo');
});

test('A2 readProductivity: decisions decision→title (pas de title miroir)', () => {
  const store = seedStore();
  const read = readProductivity(store);
  const decision = read.decisions.find((d) => d.id === 'd1') as Decision;
  assert.equal(decision.title, 'décision prise', 'colonne `decision` miroir → `title` entité');
});

test('A2 readProductivity: goals miroir → Goal (status default active)', () => {
  const store = seedStore();
  const read = readProductivity(store);
  const goal = read.goals.find((g) => g.id === 'g1') as Goal;
  assert.equal(goal.status, 'active');
  assert.equal(goal.title, 'Goal 1');
});

test('A2 createProductivityRepo: habits list (LocalQueryRepository facet)', async () => {
  const store = seedStore();
  const repo = createProductivityRepo(store);
  const habits = await repo.habits.list({ entity: 'habits' });
  assert.equal(habits.length, 1);
  assert.equal(habits[0]!.id, 'h1');
  assert.equal(habits[0]!.title, 'Habit 1');
  assert.equal(habits[0]!.cadence, 'daily', 'frequency JSONB-in-TEXT → parsé');
});

test('A2 createProductivityRepo: routines list', async () => {
  const store = seedStore();
  const repo = createProductivityRepo(store);
  const routines = await repo.routines.list({ entity: 'routines' });
  assert.equal(routines.length, 1);
  assert.equal(routines[0]!.id, 'r1');
  assert.equal(routines[0]!.title, 'Routine 1');
});

test('A2 createProductivityRepo: countdowns list + days-left DERIVED (AD-7)', async () => {
  const store = seedStore();
  const repo = createProductivityRepo(store);
  const countdowns = await repo.countdowns.list({ entity: 'countdown' });
  assert.equal(countdowns.length, 1);
  assert.equal(countdowns[0]!.targetDate, '2026-10-20T00:00:00.000Z');
  const daysLeft = computeCountdownDaysLeft(countdowns[0]!.targetDate, NOW_MS);
  assert.equal(daysLeft, 7, '10-20 − 10-13 = 7 jours (dérivé, jamais stocké)');
});

test('A2 computeReview: daily review over a seeded task set', () => {
  const store = seedStore();
  const review = computeReview(store, 'daily', undefined, NOW_MS);
  assert.equal(review.period, 'daily');
  // t2 done on 2026-10-11, not in the daily window (today = 10-13) → pas
  // dans completedTaskIds.
  assert.equal(
    review.completedTaskIds.includes('t2'),
    false,
    't2 done 10-11 → hors fenêtre daily 10-13',
  );
  assert.equal(
    review.overdueOpenTaskIds.includes('t1'),
    true,
    't1 due 10-12 < now 10-13 → overdue open',
  );
});

test('A2 computeAnalytics: procrastination ratio + goal progress', () => {
  const store = seedStore();
  const analytics = computeAnalytics(store, undefined, NOW_MS);
  // t1 open + overdue → procrastination = 1/2 (t1 + t2 open, t1 overdue)
  // t2 done → not open
  assert.equal(analytics.procrastination, 1, '1 open task, 1 overdue → 1.0');
  assert.equal(
    analytics.goalProgress,
    0,
    'goals: 1 active, 0 achieved → 0',
  );
});

test('A2 computeHabitStreak: daily habit with a known completion set', () => {
  const habit: Pick<HabitRow, 'completions' | 'cadence' | 'weekdays'> = {
    completions: ['2026-10-12', '2026-10-13'],
    cadence: 'daily',
  };
  const streak = computeHabitStreak(habit, NOW_MS);
  assert.equal(streak.current, 2, '2 jours consécutifs = streak 2');
  assert.ok(streak.best >= 2);
});

test('A2 computeHabitHeatmap: 4-week window, daily cadence → 28 cells', () => {
  // `habitHeatmap` (habits.ts L157-179) : `start = new Date(nowMs - weeks*7*86400000)`,
  // alors `start` est HEURE-PRÉCISE (09:00, pas minuit) et la boucle `for
  // (t = start; t <= start + (28-1)*day; t += day)` produit 28 cells dont le
  // dernier = `start + 27j` (24-sept quand nowMs = 25-sept 09:00) — le jour
  // de `nowMs` (25-sept) n'est PAS dans la fenêtre du module. On aligne les
  // complétions dans la fenêtre (23-sept dans la fenêtre, 25-sept hors).
  const heatmapNowMs = Date.parse('2026-09-25T09:00:00Z');
  const habit: Pick<HabitRow, 'completions' | 'cadence' | 'weekdays'> = {
    completions: ['2026-09-23', '2026-09-24'],
    cadence: 'daily',
  };
  const cells = computeHabitHeatmap(habit, 4, heatmapNowMs);
  assert.equal(cells.length, 28, '4 semaines × 7 jours = 28 cells');
  assert.ok(
    cells.some((c) => c.dateIso === '2026-09-23' && c.value === 1),
    '2026-09-23 complété (dans la fenêtre 28-sept…24-sept) → value 1',
  );
  assert.ok(
    cells.some((c) => c.dateIso === '2026-09-24' && c.value === 1),
    '2026-09-24 complété (dernier cell de la fenêtre) → value 1',
  );
});

test('A2 computeQuadrantBoard: low-importance overdue task lands in q3_minimize', () => {
  const store = seedStore();
  // t1 (status 'todo', overdue 10-12 < now 10-13, priority 3). Sans importance
  // explicite, le module traite t1 comme "low-importance" (eisenhower.ts §3)
  // → q3_minimize (overdue mais faible importance). C'est le comportement SSoT
  // du module (cf. `productivity.test.ts` L102-111 : dueAt proche + explicit:1
  // → q3_minimize).
  const board = computeQuadrantBoard(store, undefined, NOW_MS);
  assert.ok(board.q3_minimize.some((t) => t.id === 't1'), 't1 overdue low-importance → q3_minimize');
  assert.ok(!board.q1_do.some((t) => t.id === 't2'), 't2 done → filtré du board');
  assert.equal(board.q4_defer.length, 0, 'pas de task future → q4 vide');
});

test('A2 createProductivityRepo: watch delivers the current projection + reacts', async () => {
  const store = seedStore();
  const repo = createProductivityRepo(store);
  const seen: string[][] = [];
  const unsub = repo.habits.watch(
    { entity: 'habits' },
    (rows) => seen.push(rows.map((r) => r.id)),
  );
  // Le watch du repo (03 S5.2.2) + le watch du store livrent chacun la
  // projection initiale de façon synchrone (le store watch L158-163 fait
  // `onChange(this.query(filter))` immédiatement). `seen` capture donc 2
  // livraisons `['h1']` avant toute mutation.
  assert.deepEqual(seen[0], ['h1'], 'watch delivers the current projection');
  // A local upsync triggers a reactive delivery via the store's microtask
  // (InMemoryLocalStore.notify, local-store.ts L209-216).
  store.upsert('habits', makeHabitRow({ id: 'h2', user_id: 'user1' }) as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    seen.length >= 3 && seen[seen.length - 1]!.includes('h2'),
    'watch reacts to a local upsync (03 S5.2.2)',
  );
  unsub();
});
