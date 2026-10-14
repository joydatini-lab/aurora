/**
 * React Query hooks — local reads (AD-7, 02 S6.2: NO network on mount).
 *
 * Each hook reads from the injected `MobileDataProvider`'s local repositories
 * (SQLite mirror). The 5 canonical UX states (AD-13) are derived from the
 * React Query status: `isPending` -> loading, `isError` -> error,
 * `data.length === 0` -> empty, plus the `offline` / `killed` states from the
 * NetworkStatusAdapter / AppLifecycleAdapter (P3).
 */
import { useQuery } from '@tanstack/react-query';
import type { GoalProject, Task } from '@aurora/domain';
import { qk, type MobileDataProvider } from './query-client';
import { useMobileData } from './context';

export function useGoals() {
  const { goals } = useMobileData();
  return useQuery({
    queryKey: qk.goal.list(),
    queryFn: async () =>
      ((await goals.list({ entity: 'goals' })).filter(
        (g): g is GoalProject => (g as GoalProject).status === 'active',
      ) as GoalProject[]),
  });
}

export function useGoal(goalId: string | undefined) {
  const { goals } = useMobileData();
  return useQuery({
    queryKey: qk.goal.detail(goalId ?? ''),
    queryFn: async () => (goalId ? goals.getById(goalId) : undefined),
    enabled: goalId !== undefined,
  });
}

export function useTasks(filter?: { userId?: string }) {
  const { tasks } = useMobileData();
  return useQuery({
    queryKey: qk.task.list(filter?.userId),
    queryFn: async () =>
      tasks.list({ entity: 'tasks', where: filter?.userId ? { userId: filter.userId } : undefined }) as Promise<Task[]>,
  });
}

export function useTask(taskId: string | undefined) {
  const { tasks } = useMobileData();
  return useQuery({
    queryKey: qk.task.detail(taskId ?? ''),
    queryFn: async () => (taskId ? tasks.getById(taskId) : undefined),
    enabled: taskId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Productivity module (A2 — lot B story A2). These hooks read through the
// provider's `productivity` read facade (created at boot from the local
// store). NO network on mount (AD-7). Absent `productivity` (tests without
// a boot provider) → the queryFn throws, surfaced as the 5-canonical error
// state (AD-13), never a fake data.
// ---------------------------------------------------------------------------

export function useHabits(userId?: string) {
  const { productivity } = useMobileData();
  return useQuery({
    queryKey: qk.productivity.habits(userId),
    queryFn: async () =>
      productivity
        ? productivity.habits.list({ entity: 'habits' })
        : Promise.reject(new Error('productivity provider not wired')),
  });
}

export function useRoutines(userId?: string) {
  const { productivity } = useMobileData();
  return useQuery({
    queryKey: qk.productivity.routines(userId),
    queryFn: async () =>
      productivity
        ? productivity.routines.list({ entity: 'routines' })
        : Promise.reject(new Error('productivity provider not wired')),
  });
}

export function useCountdowns(userId?: string) {
  const { productivity } = useMobileData();
  return useQuery({
    queryKey: qk.productivity.countdowns(userId),
    queryFn: async () =>
      productivity
        ? productivity.countdowns.list({ entity: 'countdown' })
        : Promise.reject(new Error('productivity provider not wired')),
  });
}

// ---------------------------------------------------------------------------
// Progress module (A1 — lot B story A1). These hooks read through the
// provider's `progress` read facade (created at boot from the local store).
// NO network on mount (AD-7). Absent `progress` (tests without a boot
// provider) → the queryFn throws, surfaced as the 5-canonical error state
// (AD-13), never a fake data.
// ---------------------------------------------------------------------------

export function useSkillStates(userId?: string) {
  const { progress } = useMobileData();
  return useQuery({
    queryKey: qk.progress.skillStates(userId),
    queryFn: async () =>
      progress
        ? progress.skillStates.list({ entity: 'skill_states' })
        : Promise.reject(new Error('progress provider not wired')),
  });
}

export function useProgressSnapshots(userId?: string) {
  const { progress } = useMobileData();
  return useQuery({
    queryKey: qk.progress.snapshots(userId),
    queryFn: async () =>
      progress
        ? progress.snapshots.list({ entity: 'progress_snapshots' })
        : Promise.reject(new Error('progress provider not wired')),
  });
}

// ---------------------------------------------------------------------------
// Learning module (A3 — lot B story A3). These hooks read through the
// provider's `learning` read facade (created at boot from the local store).
// NO network on mount (AD-7). Absent `learning` (tests without a boot
// provider) → the queryFn throws, surfaced as the 5-canonical error state
// (AD-13), never a fake data.
// ---------------------------------------------------------------------------

export function useLearningSessions(userId?: string) {
  const { learning } = useMobileData();
  return useQuery({
    queryKey: qk.learning.sessions(userId),
    queryFn: async () =>
      learning
        ? learning.sessions.list({ entity: 'learning_sessions' })
        : Promise.reject(new Error('learning provider not wired')),
  });
}

export function useLearningReviews(userId?: string) {
  const { learning } = useMobileData();
  return useQuery({
    queryKey: qk.learning.reviews(userId),
    queryFn: async () =>
      learning
        ? learning.reviews.list({ entity: 'reviews' })
        : Promise.reject(new Error('learning provider not wired')),
  });
}

// ---------------------------------------------------------------------------
// Discovery module (A4 — lot B story A4). These hooks read through the
// provider's `discovery` read facade (created at boot from the local store).
// NO network on mount (AD-7). The search is SERVER-ONLY (AD-12/F-09) via
// `fn-research` EF — the device reads the mirrored results
// (`discovery_items` + `gaps`). Absent `discovery` (tests without a boot
// provider) → the queryFn throws, surfaced as the 5-canonical error state
// (AD-13), never a fake data.
// ---------------------------------------------------------------------------

export function useDiscoveryItems(userId?: string) {
  const { discovery } = useMobileData();
  return useQuery({
    queryKey: qk.discoveryItems.items(userId),
    queryFn: async () =>
      discovery
        ? discovery.items.list({ entity: 'discovery_items' })
        : Promise.reject(new Error('discovery provider not wired')),
  });
}

export function useDiscoveryGaps(userId?: string) {
  const { discovery } = useMobileData();
  return useQuery({
    queryKey: qk.discoveryItems.gaps(userId),
    queryFn: async () =>
      discovery
        ? discovery.gaps.list({ entity: 'gaps' })
        : Promise.reject(new Error('discovery provider not wired')),
  });
}

// ---------------------------------------------------------------------------
// Ascent engine (A5 — lot B story A5). These hooks read through the
// provider's `ascentEngine` facade (created at boot from the local store).
// NO network on mount (AD-7). The engine PRODUCES the `AscentLearningIR`
// (module SSoT, AD-12 server-side pedagogy) ; the device reads the
// mirrored `ascent_paths` (frozen path) + pre-visualizes the next step
// via the engine. Absent `ascentEngine` (tests without a boot provider)
// → the queryFn throws, surfaced as the 5-canonical error state (AD-13),
// never a fake data.
// ---------------------------------------------------------------------------

export function useAscentLearnerBaseline(userId?: string) {
  const { ascentEngine } = useMobileData();
  return useQuery({
    queryKey: ['ascentEngine', 'learnerBaseline', userId ?? 'me'] as const,
    queryFn: async () =>
      ascentEngine && userId
        ? ascentEngine.computeLearnerBaseline(ascentEngine.store, userId)
        : Promise.reject(new Error('ascentEngine provider not wired')),
    enabled: userId !== undefined,
  });
}

/**
 * Pre-visualize the AscentLearningIR for a goal (the `buildPath` SSoT).
 * LE BUILD DU CHEMIN court SERVER-SIDE (AD-12) — ce hook prévisualise
 * le calcul local (la persistance de l'IR reste l'EF `fn-ascent`).
 * Le repo reçoit l'`input` du `buildPath` (le module est la SSoT du
 * shape `BuildPathInput`) ; la page le lit via ce hook.
 */
export function useAscentPathPreview(
  input: import('@aurora/ascent').BuildPathInput | undefined,
) {
  const { ascentEngine } = useMobileData();
  return useQuery({
    queryKey: [
      'ascentEngine',
      'pathPreview',
      input?.userId ?? 'me',
      input?.pathId ?? 'draft',
    ] as const,
    queryFn: async () =>
      ascentEngine && input
        ? ascentEngine.buildPath(input)
        : Promise.reject(new Error('ascentEngine provider not wired')),
    enabled: input !== undefined && ascentEngine !== undefined,
  });
}

export type { MobileDataProvider };
