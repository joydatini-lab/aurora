/**
 * focus-wiring.test.ts (S5, M-51 — profils de focus ; M-52 — page v2).
 *
 * Contratuel node:test, AD-7 (local-first, zéro réseau, zéro PowerSync) :
 *
 * - **M-51** : le profil de focus (méthode + durées + tâche assignée) est
 *   modélisé CÔTÉ APP dans le store local (`lib/focus-profiles.ts`,
 *   `InMemoryLocalStore` de `@aurora/data`). L'entité `focus_profiles`
 *   n'existe PAS encore en miroir Supabase (bannière de synthèse S5 →
 *   checkpoint lead ; blocage PowerSync reporté dans le rapport, on ne code
 *   PAS de migration). La création d'un profil produit une row du store ;
 *   `launchProfile(profil)` mappe le profil en `FocusSessionOptions` et
 *   démarre le mode focus via `FocusControllerService.startSession(opts)`
 *   (S5 §M-51).
 * - **M-52** : l'assignation tâche ↔ profil (`taskProfileLinks`) est
 *   persistée localement (la tâche simple du Q11 reste la `Task` miroir
 *   existante) ; le ▶ d'une tâche lance le focus avec le profil assigné.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --test test/focus-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryLocalStore, type LocalStore } from '@aurora/data';
import { createAppFocusService } from '../src/lib/focus-service.ts';
import {
  createFocusProfileStore,
  launchProfile,
  type FocusProfile,
} from '../src/lib/focus-profiles.ts';
import { createMinimalTask } from '../src/lib/productivity-repo.ts';
import {
  formatElapsed,
  formatRemaining,
  remainingSecOf,
} from '../src/pages/focus/timer-format.ts';
import type { FocusSessionOptions, FocusTimerState } from '@aurora/focus';

// ---------------------------------------------------------------------------
// Fixtures — un profil Pomodoro et un profil Chronomètre (S5 écran 9)
// ---------------------------------------------------------------------------

function makeProfile(over: Partial<FocusProfile> = {}): FocusProfile {
  return {
    id: 'p1',
    userId: 'user1',
    title: 'Étude profonde',
    method: 'pomodoro',
    workMin: 25,
    pauseMin: 5,
    sessions: 4,
    taskId: 't1',
    displayOnFocusPage: true,
    createdAt: '2026-10-18T00:00:00.000Z',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// M-51 — store de profils + wiring `launchProfile`
// ---------------------------------------------------------------------------

test('M-51 createFocusProfile: la création d’un profil produit une row du store', () => {
  const store = new InMemoryLocalStore();
  const put = createFocusProfileStore(store);
  put.create(makeProfile());

  const row = store.row(
    'focus_profiles',
    'p1',
  ) as { title?: string; method?: string; task_id?: string } | undefined;
  assert.ok(row, 'row focus_profiles/p1 écrite par la création du profil');
  assert.equal(row.title, 'Étude profonde', 'titre miroir');
  assert.equal(row.method, 'pomodoro', 'méthode miroir');
  assert.equal(row.task_id, 't1', 'tâche assignée → colonne task_id');
});

test('M-51 launchProfile: un profil Pomodoro démarre startSession(mode, durées + tâche)', async () => {
  const store = new InMemoryLocalStore();
  const svc = createAppFocusService(store);
  const profile = makeProfile();

  const opts: FocusSessionOptions = launchProfile(profile);
  assert.equal(opts.mode, 'pomodoro', 'méthode → mode focus');
  assert.equal(opts.plannedDurationSec, 25 * 60, 'travail min → plannedDurationSec');
  assert.equal(opts.pomodoroPauseSec, 5 * 60, 'pause min → pomodoroPauseSec');
  assert.deepEqual(opts.taskIds, ['t1'], 'tâche assignée → taskIds');
  assert.equal(opts.userId, 'user1', 'propriétaire (RLS scope)');

  const session = await svc.startSession(opts);
  assert.equal(session.mode, 'pomodoro', 'la session démarre en mode Pomodoro');
  assert.equal(session.plannedDurationSec, 1500, 'durée planifiée portée par la session');
});

test('M-51 launchProfile: un profil Chronomètre démarre startSession(mode=timer, sans limite)', async () => {
  const store = new InMemoryLocalStore();
  const svc = createAppFocusService(store);
  const profile = makeProfile({
    id: 'p2',
    title: 'Lecture libre',
    method: 'timer',
    workMin: 0,
    pauseMin: 0,
    sessions: 0,
    taskId: undefined,
  });

  const opts = launchProfile(profile);
  assert.equal(opts.mode, 'timer', 'chronomètre → mode timer');
  assert.equal(opts.plannedDurationSec ?? 0, 0, 'sans limite de durée (planned=0)');
  assert.equal(opts.taskIds, undefined, 'pas de tâche assignée → pas de taskIds');

  const session = await svc.startSession(opts);
  assert.equal(session.mode, 'timer', 'la session démarre en chronomètre');
});

// ---------------------------------------------------------------------------
// M-52 — page v2 : assignation tâche ↔ profil + lancement du ▶ d’une tâche
// ---------------------------------------------------------------------------

test('M-52 linkTaskToProfile + launchTask: le ▶ d’une tâche lance le focus avec le profil assigné', async () => {
  const store = new InMemoryLocalStore();
  const put = createFocusProfileStore(store);
  put.create(makeProfile({ taskId: undefined }));
  const svc = createAppFocusService(store);

  // la tâche simple t1 pointe vers le profil p1 (assignation depuis la tâche,
  // S5 M-52 « Choisir un profil ») ; le lien est persisté localement sur la row
  // du profil (pas d’entité distincte, AD-7 — l’entité focus_profiles est le
  // blocage PowerSync reporté, le lien reste app-side tant que le miroir n’existe pas).
  put.linkTaskToProfile('t1', 'p1');
  const row = store.row(
    'focus_profiles',
    'p1',
  ) as { task_id?: string } | undefined;
  assert.equal(row?.task_id, 't1', 'le lien tâche→profil est stocké sur la row du profil (task_id)');

  const profile = put.get('p1')!;
  assert.equal(profile.taskId, 't1', 'get() reconstitue le profil avec sa tâche assignée');

  const opts = launchProfile(profile);
  assert.equal(opts.mode, 'pomodoro');
  assert.deepEqual(opts.taskIds, ['t1'], 'la tâche lancée porte bien l’id de la tâche');
  const session = await svc.startSession(opts);
  assert.deepEqual(
    session.linkedTaskIds?.map((o) => o.v),
    ['t1'],
    'la session liée porte la tâche (SSoT row focus_sessions)',
  );
});

test('M-52 createMinimalTask: une tâche simple (Q11) crée une row du store', () => {
  const store = new InMemoryLocalStore();
  const task = createMinimalTask(store, { userId: 'user1', title: 'Rendre le TD de béton armé' }, 't3');
  assert.equal(task.title, 'Rendre le TD de béton armé');
  assert.equal(task.status, 'todo');
  const row = store.row('tasks', 't3') as { title?: string; subject?: string } | undefined;
  assert.ok(row, 'row tasks/t3 écrite par la création de la tâche simple');
  assert.equal(row.title, 'Rendre le TD de béton armé', 'titre miroir');
});

// ---------------------------------------------------------------------------
// M-53 — écrans de minuteurs : l'anneau Pomodoro (reste + progression) et le
// chrono (temps écoulé HH:MM:SS) rendus par les helpers du timer v2.
// ---------------------------------------------------------------------------

test('M-53 formatRemaining + remainingSecOf: l’anneau Pomodoro rend le reste + la progression', () => {
  // anneau : r=118, C = 2πr ≈ 741.4 ; le test vérifie le temps restant + la
  // progression fractionnelle (l'arc strokeDashoffset = C·(1−progress)).
  const timer: FocusTimerState = {
    state: 'active',
    activeAnchor: 1000,
    activeSec: 780, // 13 min écoulé d'un pomodoro de 25 min (planned 1500 s)
    pausedSec: 0,
    pauseAnchor: null,
    plannedSec: 1500,
    endReason: null,
  };
  assert.equal(remainingSecOf(timer), 720, '1500 − 780 = 720 s restant');
  assert.equal(formatRemaining(720), '12:00', 'restant MM:SS');
  // la progression de l'anneau = 1 − restant/planned (0→1).
  const progress = 1 - (remainingSecOf(timer) as number) / 1500;
  assert.ok(
    Math.abs(progress - 780 / 1500) < 1e-9,
    'l’arc pomodoro avance avec le temps écoulé (780/1500)',
  );
});

test('M-53 formatElapsed: le chrono rend le temps écoulé HH:MM:SS', () => {
  // le chrono Stitch affiche 00:42:18 (42 min 18 s écoulées).
  assert.equal(formatElapsed(2538), '00:42:18', 'HH:MM:SS');
  assert.equal(formatElapsed(0), '00:00:00', 'bornes basses');
  assert.equal(formatElapsed(3661), '01:01:01', '1 h +');
});
