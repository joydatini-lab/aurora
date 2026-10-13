/**
 * Productivity local-mirror repo — branchement module A2 (productivity).
 *
 * Le module `@aurora/productivity` est la logique métier pure (AD-1/AD-10) :
 * `buildReview`, `aggregateAnalytics`, `habitStreak`, `habitHeatmap`,
 * `quadrantBoard`. C'est **ce repo** (confiné à la couche provider, AD-15)
 * qui consomme le module et le relie au store local `LocalStore` (PowerSync
 * miroirs : `tasks`, `habits`, `decisions`, `goals`).
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit des types SSoT
 * (`ReviewSummary`, `AnalyticsSlice`, `HeatmapCell`, `Quadrant`). La page
 * lit le hook React Query — elle n'importe jamais `@aurora/productivity`.
 *
 * Les miroirs PowerSync sont en snake_case ; le module attend du camelCase
 * (`Task`, `Goal`, `Decision`, `Habit` de `@aurora/domain`). Ce repo fait
 * le mapping snake→camel (pattern `ascent-repo.ts`).
 */
import type {
  Goal,
  Task,
  Decision,
  OrSetValue,
  TaskStatus,
} from '@aurora/domain';
import type { LocalStore } from '@aurora/data';
import {
  buildReview,
  aggregateAnalytics,
  habitStreak,
  habitHeatmap,
  quadrantBoard,
  type ReviewPeriod,
  type ReviewSummary,
  type AnalyticsSlice,
  type HabitCadence,
  type HeatmapCell,
  type Quadrant,
} from '@aurora/productivity';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

/** JSONB-in-TEXT → array (PowerSync stores OR-Set JSONB as TEXT). */
function orSet(value: unknown): OrSetValue[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as OrSetValue[];
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as OrSetValue[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapTask(row: RawRow): Task {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    description: optStr(row.description),
    status: (str(row.status) as TaskStatus | undefined) ?? 'todo',
    projectId: optStr(row.project_id),
    subjectId: optStr(row.subject_id),
    goalId: optStr(row.goal_id),
    dueAt: optStr(row.due_at),
    priority:
      typeof row.priority === 'number' ? row.priority : undefined,
    tags: orSet(row.tags),
    dependencies: orSet(row.dependencies),
    evidenceRefs: orSet(row.evidence_refs ?? row.evidenceRefs),
    timeSpentSec:
      typeof row.time_spent_sec === 'number' ? row.time_spent_sec : undefined,
    recurring: row.recurring === true,
    recurrenceRule: optStr(row.recurrence_rule),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

function mapGoal(row: RawRow): Goal {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    description: optStr(row.description),
    status: (str(row.status) as Goal['status'] | undefined) ?? 'active',
    targetDate: optStr(row.target_date),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  } as Goal;
}

function mapDecision(row: RawRow): Decision {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    rationale: optStr(row.rationale),
    alternatives: Array.isArray(row.alternatives)
      ? (row.alternatives as string[])
      : optStr(row.alternatives)
        ? [optStr(row.alternatives) as string]
        : undefined,
    decidedAt: str(row.decided_at) ?? '',
    context: optStr(row.context),
    linkedTaskIds: orSet(row.linked_task_ids ?? row.linkedTaskIds),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface HabitRow {
  id: string;
  cadence: HabitCadence;
  weekdays?: number[];
  completions: string[];
}

function mapHabit(row: RawRow): HabitRow {
  const frequency = row.frequency;
  let cadence: HabitCadence = 'daily';
  let weekdays: number[] | undefined;
  if (frequency && typeof frequency === 'object') {
    const f = frequency as Record<string, unknown>;
    cadence = (str(f.cadence) as HabitCadence | undefined) ?? 'daily';
    if (Array.isArray(f.weekdays)) weekdays = f.weekdays as number[];
  }
  let completions: string[] = [];
  const rawCompletions = row.completions;
  if (rawCompletions == null) {
    completions = [];
  } else if (Array.isArray(rawCompletions)) {
    completions = rawCompletions.map(String);
  } else if (typeof rawCompletions === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawCompletions);
      completions = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      completions = [];
    }
  }
  return {
    id: str(row.id) ?? '',
    cadence,
    weekdays,
    completions,
  };
}

// ---------------------------------------------------------------------------
// Read facade over the local mirrors
// ---------------------------------------------------------------------------

function collectRows(
  store: LocalStore,
  entity: string,
  userId?: string,
): RawRow[] {
  const rows = store.allRows(entity) as RawRow[];
  if (!userId) return rows;
  return rows.filter((r) => r.user_id === userId || r.userId === userId);
}

export interface ProductivityRead {
  tasks: Task[];
  goals: Goal[];
  decisions: Decision[];
  habits: HabitRow[];
}

/** Read the productivity input sets from the local store. */
export function readProductivity(
  store: LocalStore,
  userId?: string,
): ProductivityRead {
  return {
    tasks: collectRows(store, 'tasks', userId).map(mapTask),
    goals: collectRows(store, 'goals', userId).map(mapGoal),
    decisions: collectRows(store, 'decisions', userId).map(mapDecision),
    habits: collectRows(store, 'habits', userId).map(mapHabit),
  };
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/productivity module)
// ---------------------------------------------------------------------------

export function computeReview(
  store: LocalStore,
  period: ReviewPeriod,
  userId?: string,
  nowMs = Date.now(),
): ReviewSummary {
  const data = readProductivity(store, userId);
  return buildReview(period, {
    tasks: data.tasks,
    decisions: data.decisions,
    habits: data.habits.map((h) => ({
      id: h.id,
      cadence: h.cadence,
      completions: h.completions,
    })),
    nowMs,
  });
}

export function computeAnalytics(
  store: LocalStore,
  userId?: string,
  nowMs = Date.now(),
): AnalyticsSlice {
  const data = readProductivity(store, userId);
  return aggregateAnalytics(data.tasks, data.goals, nowMs);
}

/** Streak for one habit row. */
export function computeHabitStreak(
  habit: Pick<HabitRow, 'completions' | 'cadence' | 'weekdays'>,
  nowMs = Date.now(),
): ReturnType<typeof habitStreak> {
  return habitStreak(habit.completions, habit.cadence, habit.weekdays, nowMs);
}

/** Heatmap cells for the HabitStreak view (AntV G2, @aurora/ui). */
export function computeHabitHeatmap(
  habit: Pick<HabitRow, 'completions' | 'cadence' | 'weekdays'>,
  weeks = 16,
  nowMs = Date.now(),
): HeatmapCell[] {
  return habitHeatmap(
    habit.completions,
    weeks,
    habit.cadence,
    habit.weekdays,
    nowMs,
  );
}

/** Quadrant board (G-L5 explainable prioritization). */
export function computeQuadrantBoard(
  store: LocalStore,
  userId?: string,
  nowMs = Date.now(),
): Record<Quadrant, Task[]> {
  const data = readProductivity(store, userId);
  return quadrantBoard(data.tasks, nowMs);
}

export type {
  ReviewPeriod,
  ReviewSummary,
  AnalyticsSlice,
  HeatmapCell,
  HabitCadence,
  Quadrant,
};
