/**
 * Productivity local-mirror repo — branchement module A2 (productivity).
 *
 * Le module `@aurora/productivity` est la logique métier pure (AD-1/AD-10) :
 * `buildReview`, `aggregateAnalytics`, `habitStreak`, `habitHeatmap`,
 * `quadrantBoard`. C'est **ce repo** (confiné à la couche provider, AD-15)
 * qui consomme le module et le relie au store local `LocalStore` (PowerSync
 * miroirs : `tasks`, `habits`, `routines`, `decisions`, `goals` —
 * packages/data/powersync-schema.ts).
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit des types SSoT
 * (`ReviewSummary`, `AnalyticsSlice`, `HeatmapCell`, `Quadrant`). La page
 * lit le hook React Query — elle n'importe jamais `@aurora/productivity`.
 *
 * Les miroirs PowerSync sont en snake_case ; le module attend du camelCase
 * (`Task`, `Goal`, `Decision` de `@aurora/domain`). Ce repo fait le mapping
 * snake→camel (pattern `ascent-repo.ts`).
 */
import type {
  Goal,
  Task,
  Decision,
  OrSetValue,
  TaskStatus,
  Countdown,
} from '@aurora/domain';
import type { LocalFilter, LocalQueryRepository, LocalStore } from '@aurora/data';
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

/**
 * Le miroir tasks stocke les OR-Sets CRDT dans `crdt_added` /
 * `crdt_removed` (packages/data/powersync-schema.ts). `orSetValues`
 * (modules/productivity) produit exactement ce shape : la valeur effective =
 * les éléments `v` qui n'ont pas encore été supprîmés. C'est la SSoT de
 * lecture du contenu des OR-Sets à partir d'un miroir.
 */
const strOrSet = (v: unknown): OrSetValue[] => {
  if (Array.isArray(v)) return v as OrSetValue[];
  if (typeof v === 'string') {
    try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as OrSetValue[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** JSONB-in-TEXT → parsed array (PowerSync stores JSONB columns as TEXT). */
function jsonArr(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapTask(row: RawRow): Task {
  const status = (str(row.status) as TaskStatus | undefined) ?? 'todo';
  const dueDate = optStr(row.due_date ?? row.due_at);
  const completedAt = optStr(row.completed_at);
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.subject ?? row.title) ?? '',
    description: optStr(row.description),
    status,
    projectId: optStr(row.project_id),
    subjectId: optStr(row.subject_id),
    goalId: optStr(row.goal_id),
    // due_at absent du miroir (côté server : due_date) ; on map la colonne
    // miroir vers le champ entité — `completed_at` sert de `updatedAt`
    // substitut seulement quand le miroir n'a pas `updated_at`.
    dueAt: dueDate,
    priority:
      typeof row.priority === 'number' ? row.priority : undefined,
    tags: strOrSet(row.tags ?? row.crdt_added),
    dependencies: strOrSet(row.dependencies ?? row.crdt_removed),
    evidenceRefs: strOrSet(row.evidence_refs ?? row.evidenceRefs),
    timeSpentSec:
      typeof row.time_spent_sec === 'number'
        ? row.time_spent_sec
        : undefined,
    recurring: row.recurring === true,
    recurrenceRule: optStr(row.recurrence_rule),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? completedAt ?? '',
  };
}

function mapGoal(row: RawRow): Goal {
  const status = (str(row.status) as Goal['status'] | undefined) ?? 'active';
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.title) ?? '',
    description: optStr(row.description),
    horizon: 'short',
    status,
    targetDate: optStr(row.target_date),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

function mapDecision(row: RawRow): Decision {
  // Le miroir decisions a la colonne `decision` (pas `title`) — cf.
  // powersync-schema.ts. Le `alternatives` field est absent du miroir (
  // server-side only), pas de colonne miroir : `undefined` honnête (AD-7).
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    title: str(row.decision ?? row.title) ?? '',
    rationale: optStr(row.rationale),
    alternatives: undefined,
    decidedAt: str(row.decided_at) ?? str(row.created_at) ?? '',
    context: optStr(row.context),
    linkedTaskIds: strOrSet(row.linked_task_ids ?? row.linkedTaskIds),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface HabitRow {
  id: string;
  title: string;
  cadence: HabitCadence;
  weekdays?: number[];
  recurrenceRule?: string;
  /** Ascending UTC day keys `YYYY-MM-DD` (source du streak / heatmap). */
  completions: string[];
}

function mapHabit(row: RawRow): HabitRow {
  let cadence: HabitCadence = 'daily';
  let weekdays: number[] | undefined;
  let recurrenceRule: string | undefined;
  const freqRaw = row.frequency;
  if (freqRaw != null) {
    // Le miroir habits.frequency est une colonne JSONB-in-TEXT
    // ({ cadence, weekdays?, rule? }). Si c'est déjà un object parsé,
    // on l'utilise directement ; sinon on JSON.parse.
    let freq: Record<string, unknown> | undefined;
    if (typeof freqRaw === 'object') freq = freqRaw as Record<string, unknown>;
    else if (typeof freqRaw === 'string') {
      try {
        freq = JSON.parse(freqRaw) as Record<string, unknown>;
      } catch {
        freq = undefined;
      }
    }
    if (freq) {
      cadence = (str(freq.cadence) as HabitCadence | undefined) ?? 'daily';
      if (Array.isArray(freq.weekdays)) weekdays = freq.weekdays as number[];
      recurrenceRule = str(freq.rule ?? freq.recurrenceRule);
    }
  }
  // Les completions ne sont PAS une colonne miroir (habits ne les a pas) ;
  // elles vivent dans la table server-side des completions de habitude
  // (règle single-writer, AD-7). On les lit honnêtement : `completions`
  // miroir si présent (ex. un miroir étendu), sinon [] — pas d'invention.
  const completions: string[] = jsonArr(row.completions ?? row.crdt_added).map(
    String,
  );
  return {
    id: str(row.id) ?? '',
    // `habits` has NO `title` column — it is `name` (0002). Reading
    // `row.title` first always yielded '', so every habit rendered with an
    // empty title while the real value sat unread in the mirror (PowerSync:
    // "stored internally, but not accessible" for undeclared columns).
    // `title` is kept as a fallback only for a hypothetical renamed mirror.
    title: str(row.name ?? row.title) ?? '',
    cadence,
    weekdays,
    recurrenceRule,
    completions,
  };
}

export interface RoutineRow {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

function mapRoutine(row: RawRow): RoutineRow {
  return {
    id: str(row.id) ?? '',
    // `routines` has `name`, NOT `title`/`description` (0002). The table also
    // has `anchor` and `steps`, but the RoutineRow surface below predates them
    // and is not extended here — that is a modelling decision, not a mirror fix.
    title: str(row.name ?? row.title) ?? '',
    description: optStr(row.description),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface CountdownRow {
  id: string;
  userId: string;
  kind: Countdown['kind'];
  title: string;
  targetDate: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

function mapCountdown(row: RawRow): CountdownRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    kind: (str(row.kind) as Countdown['kind'] | undefined) ?? 'countdown',
    title: str(row.title) ?? '',
    targetDate: str(row.target_date ?? row.targetDate) ?? '',
    imageUrl: optStr(row.image_url ?? row.imageUrl),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
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
  routines: RoutineRow[];
  countdowns: CountdownRow[];
}

/**
 * Read the productivity input sets from the local store (AD-7 local-only).
 * No network — the store is a local snapshot; a stale mirror is a frozen
 * productivity view, never an error.
 */
export function readProductivity(
  store: LocalStore,
  userId?: string,
): ProductivityRead {
  return {
    tasks: collectRows(store, 'tasks', userId).map(mapTask),
    goals: collectRows(store, 'goals', userId).map(mapGoal),
    decisions: collectRows(store, 'decisions', userId).map(mapDecision),
    habits: collectRows(store, 'habits', userId).map(mapHabit),
    routines: collectRows(store, 'routines', userId).map(mapRoutine),
    // `countdown` n'est PAS encore un miroir PowerSync (domain entity
    // local-only, AD-7) ; on lit honnêtement la table miroir si elle existe,
    // sinon un store vide rend [] — l'état vide honnête de /countdown.
    countdowns: collectRows(store, 'countdown', userId).map(mapCountdown),
  };
}

// ---------------------------------------------------------------------------
// LocalQueryRepository facade (pattern `ascent-repo.ts` /
// `automations-repo.ts`) — the provider-layer read surface the QueryClient
// and the /reviews, /retro, /habits, /routines, /countdown pages consume.
//
// One entry point per entity family the pages read. `habits` and `routines`
// are the native mirror entities; `tasks` / `goals` / `decisions` are
// re-exposed through this repo so the pages don't bypass the provider layer
// and reach the raw `provider.tasks` / `provider.goals` repos directly.
// `countdown` reads the local-only table (AD-7).
// ---------------------------------------------------------------------------

/** camelCase `where` keys → the snake_case mirror column names. */
function toSnakeWhere(
  where?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!where) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    out[key.replace(/([A-Z])/g, (m) => '_' + m.toLowerCase())] = value;
  }
  return out;
}

function matches(
  row: RawRow,
  where?: Record<string, unknown>,
): boolean {
  return !where || Object.entries(where).every(([k, v]) => row[k] === v);
}

/**
 * Build the productivity `LocalQueryRepository` family over the `LocalStore`
 * mirrors (`tasks`, `habits`, `routines`, `decisions`, `countdown`).
 * Read-only + local (AD-7): the write side lives in `@aurora/productivity`
 * (commands) + the upsync queue; this repo is the READ path only.
 */
export function createProductivityRepo(
  store: LocalStore,
): {
  habits: LocalQueryRepository<HabitRow>;
  routines: LocalQueryRepository<RoutineRow>;
  countdowns: LocalQueryRepository<CountdownRow>;
  tasks: LocalQueryRepository<Task>;
  goals: LocalQueryRepository<Goal>;
  decisions: LocalQueryRepository<Decision>;
} {
  const listMirror =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((filter: LocalFilter<T>) => Promise<T[]>) =>
    async (filter: LocalFilter<T>) => {
      const where = toSnakeWhere(
        filter.where as Record<string, unknown> | undefined,
      );
      return (store.allRows(entity) as RawRow[])
        .filter((row) => matches(row, where))
        .map(mapRow);
    };

  const watchMirror =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((
      filter: LocalFilter<T>,
      onChange: (rows: T[]) => void,
    ) => () => void) =>
    (filter: LocalFilter<T>, onChange: (rows: T[]) => void) => {
      const where = toSnakeWhere(
        filter.where as Record<string, unknown> | undefined,
      );
      const deliver = (rows: RawRow[]): void => {
        onChange(rows.filter((row) => matches(row, where)).map(mapRow));
      };
      deliver(store.allRows(entity) as RawRow[]);
      return store.watch(
        { entity, where } as unknown as LocalFilter<T>,
        (rows) => deliver(rows as RawRow[]),
      );
    };

  const getById =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((id: string) => Promise<T | undefined>) =>
    async (id: string) => {
      const row = store.row(entity, id) as RawRow | undefined;
      return row === undefined ? undefined : mapRow(row);
    };

  return {
    habits: {
      getById: getById('habits', mapHabit),
      list: listMirror('habits', mapHabit),
      watch: watchMirror('habits', mapHabit),
    },
    routines: {
      getById: getById('routines', mapRoutine),
      list: listMirror('routines', mapRoutine),
      watch: watchMirror('routines', mapRoutine),
    },
    countdowns: {
      getById: getById('countdown', mapCountdown),
      list: listMirror('countdown', mapCountdown),
      watch: watchMirror('countdown', mapCountdown),
    },
    tasks: {
      getById: getById('tasks', mapTask),
      list: listMirror('tasks', mapTask),
      watch: watchMirror('tasks', mapTask),
    },
    goals: {
      getById: getById('goals', mapGoal),
      list: listMirror('goals', mapGoal),
      watch: watchMirror('goals', mapGoal),
    },
    decisions: {
      getById: getById('decisions', mapDecision),
      list: listMirror('decisions', mapDecision),
      watch: watchMirror('decisions', mapDecision),
    },
  };
}

// ---------------------------------------------------------------------------
// Minimal task writer (S5, M-52 — Q11 : tâches minimales = titre + état +
// profil). AD-7 local-first : la row `tasks` est écrite côté appareil ; le
// rebranchement sur le miroir `productivity.tasks` + upsync se fait au
// checkpoint lead (le modèle de tâche Q11 reste compatible `productivity.tasks`).
// On ne modifie PAS le reader ci-dessus, on ajoute le writer minimal.
// ---------------------------------------------------------------------------

/** Le miroir tasks (single module owner = productivity). */
const TASKS_ENTITY = 'tasks';

/** La tâche minimale Q11 (titre + état, le profil est le lien app-side). */
export interface MinimalTaskInput {
  userId: string;
  /** titre (la seule donnée obligatoire) */
  title: string;
  /** état (défaut `todo`) */
  status?: TaskStatus;
}

/**
 * Créer une tâche minimale Q11 dans le store local (`tasks` miroir).
 * Retourne le `Task` créé (id généré, shape miroir snake_case upsert).
 * Le profil assigné vit côté app (`focus_profiles.task_id`) — la tâche
 * elle-même ne porte PAS de nouvelle colonne (le modèle Q11 reste
 * compatible `productivity.tasks`).
 */
export function createMinimalTask(
  store: LocalStore,
  input: MinimalTaskInput,
  id?: string,
): Task {
  const nowIso = new Date().toISOString();
  const taskId = id ?? `task-${Math.random().toString(36).slice(2, 10)}`;
  store.upsert(TASKS_ENTITY, {
    id: taskId,
    user_id: input.userId,
    userId: input.userId,
    subject: input.title,
    title: input.title,
    status: input.status ?? 'todo',
    created_at: nowIso,
    updated_at: nowIso,
    local_mutation_id: taskId,
    local_ts_ms: Date.now(),
  });
  return {
    id: taskId,
    userId: input.userId,
    title: input.title,
    status: input.status ?? 'todo',
    tags: [],
    dependencies: [],
    evidenceRefs: [],
    createdAt: nowIso,
    updatedAt: nowIso,
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

/** Quadrant board (G-L5 explainable prioritization, eisenhower.ts). */
export function computeQuadrantBoard(
  store: LocalStore,
  userId?: string,
  nowMs = Date.now(),
): Record<Quadrant, Task[]> {
  const data = readProductivity(store, userId);
  return quadrantBoard(data.tasks, new Date(nowMs));
}

/** Days-left for a countdown row (DERIVED, AD-7 : targetDate - now). */
export function computeCountdownDaysLeft(
  targetDateIso: string,
  nowMs = Date.now(),
): number {
  // targetDate peut être un jour simple (`YYYY-MM-DD`) OU un timestamp
  // complet ISO 8601 (le miroir `countdown.target_date` est `column.text`
  // — le module `@aurora/productivity` l'écrit en `toISOString()` complet).
  // `Date.parse` gère les deux ; pas de suffixe `T00:00:00Z` ajouté quand
  // la chaîne contient déjà une heure (sinon NaN → 0, faux résultat).
  const hasTime = /\d{2}-\d{2}-\d{2}T/.test(targetDateIso);
  const targetMs = Date.parse(hasTime ? targetDateIso : targetDateIso + 'T00:00:00Z');
  if (Number.isNaN(targetMs)) return 0;
  const todayMs = new Date(nowMs);
  todayMs.setUTCHours(0, 0, 0, 0);
  const targetDayMs = new Date(targetMs);
  targetDayMs.setUTCHours(0, 0, 0, 0);
  return Math.round((targetDayMs.getTime() - todayMs.getTime()) / 86_400_000);
}

export type {
  ReviewPeriod,
  ReviewSummary,
  AnalyticsSlice,
  HeatmapCell,
  HabitCadence,
  Quadrant,
};
