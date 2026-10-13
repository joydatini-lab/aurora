/**
 * Progress local-mirror repo — branchement module A1 (progress).
 *
 * Le module `@aurora/progress` est la logique métier pure (AD-1/AD-10) :
 * `recomputeSkill` (idempotent AD-8), `dashboard` (ChartSpec S18.6),
 * `skillTrajectoryChart`, `trendBoard`, `todayBoard`. C'est **ce repo**
 * (confiné à la couche provider, AD-15) qui consomme le module et le relie
 * au store local `LocalStore` (miroirs PowerSync LIMITÉ 03 S4.2 :
 * `skill_states` + `progress_snapshots` uniquement — les tables
 * `progress_evidences` / `progress_events` / `progress_trends` sont
 * server-only et ne sont PAS miroitées, AD-7).
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit des types SSoT
 * (`ChartSpec`, `SkillState`, `ProgressSnapshot`). La page lit le hook
 * React Query — elle n'importe jamais `@aurora/progress`.
 *
 * Le miroir PowerSync `skill_states` (packages/data/powersync-schema.ts)
 * est LE mirror LE plus simple (user_id, skill_id, proficiency real,
 * updated_evidence, created_at, updated_at) — pas de `level`/`confidence`
 * /`freshness` miroir (celles-ci vivent dans la table server-side riche,
 * non miroitée). Le repo map donc le miroir LIMIÉ vers le `SkillState`
 * SSoT avec des valeurs honnêtes par défaut (AD-7: le miroir figé est un
 * état, jamais une erreur).
 */
import type {
  SkillState,
  ProgressSnapshot,
} from '@aurora/domain';
import type { LocalFilter, LocalQueryRepository, LocalStore } from '@aurora/data';
import {
  dashboard as moduleDashboard,
  skillTrajectoryChart,
  todayBoard,
  trendBoard,
  recomputeSkill,
  computeFreshness as moduleComputeFreshness,
  type DashboardBoard,
  type ChartSpec,
  type RecomputeOutput,
} from '@aurora/progress';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

/**
 * Le miroir `skill_states` (LIMITÉ, 03 S4.2) ne stocke PAS `level` /
 * `confidence` / `freshness` (colonnes server-only, riches). On map le
 * miroir avec `proficiency` (real, 0..1) comme proxy de niveau ET de
 * confiance (le niveau riche est DERIVED du proficiency par le repo —
 * l'échelle S18.2 ordonnée, `levelToOrdinal` inversée honnêtement) +
 * `level` par défaut `'discovered'` quand proficiency est absente.
 * `updated_evidence` (TEXT) est l'id de la dernière evidence (pas un
 * OR-Set ici — le miroir limité ne porte que la référence la plus
 * récente, AD-7 single-source).
 */
function proficiencyToLevel(p: number | undefined): SkillState['level'] {
  if (p === undefined || p < 0.2) return 'discovered';
  if (p < 0.4) return 'comprehended';
  if (p < 0.6) return 'recalled';
  if (p < 0.75) return 'guided-application';
  if (p < 0.85) return 'autonomous-application';
  if (p < 0.95) return 'novel-problem';
  return 'mastered';
}

function mapSkillState(row: RawRow): SkillState {
  const proficiency =
    typeof row.proficiency === 'number' ? row.proficiency : undefined;
  return {
    id: str(row.id) ?? str(row.skill_id) ?? '',
    userId: str(row.user_id) ?? '',
    skillId: str(row.skill_id) ?? '',
    level: proficiencyToLevel(proficiency),
    freshness: proficiency,
    confidence: proficiency,
    evidenceRefs: optStr(row.updated_evidence)
      ? [
          {
            v: optStr(row.updated_evidence)!,
            ts: 0,
            c: 'progress',
          },
        ]
      : [],
    history: [],
    updatedAt: str(row.updated_at) ?? '',
  };
}

function mapSnapshot(row: RawRow): ProgressSnapshot {
  const value =
    typeof row.value === 'number' ? row.value : undefined;
  return {
    id: str(row.id) ?? str(row.skill_id) ?? '',
    userId: str(row.user_id) ?? '',
    takenAt: str(row.snapshot_at) ?? str(row.created_at) ?? '',
    subject: str(row.skill_id) ?? '',
    level: proficiencyToLevel(value), // valeur du snapshot → niveau (échelle S18.2)
    confidence: value,
    evidenceRefs: [],
    // `createdAt` n'est PAS un champ de `ProgressSnapshot` (AD-15 SSoT,
    // entities-progress.ts) — pas d'invention de champ.
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

export interface ProgressRead {
  skillStates: SkillState[];
  snapshots: ProgressSnapshot[];
}

/** Read the progress input sets from the local store (AD-7 local-only). */
export function readProgress(
  store: LocalStore,
  userId?: string,
): ProgressRead {
  return {
    skillStates: collectRows(store, 'skill_states', userId).map(mapSkillState),
    snapshots: collectRows(store, 'progress_snapshots', userId).map(mapSnapshot),
  };
}

// ---------------------------------------------------------------------------
// LocalQueryRepository facade (pattern `ascent-repo.ts` /
// `productivity-repo.ts`) — the provider-layer read surface.
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
 * Build the progress `LocalQueryRepository` family over the `LocalStore`
 * mirrors (`skill_states`, `progress_snapshots`). Read-only + local (AD-7) :
 * the write side (evidence, recompute, snapshot generation) vit dans le
 * module `@aurora/progress` + l'upsync queue ; ce repo est le READ path
 * seulement.
 */
export function createProgressRepo(store: LocalStore): {
  skillStates: LocalQueryRepository<SkillState>;
  snapshots: LocalQueryRepository<ProgressSnapshot>;
} {
  const getById =
    <T>(
      entity: string,
      mapRow: (row: RawRow) => T,
    ): ((id: string) => Promise<T | undefined>) =>
    async (id: string) => {
      const row = store.row(entity, id) as RawRow | undefined;
      return row === undefined ? undefined : mapRow(row);
    };

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

  return {
    skillStates: {
      getById: getById('skill_states', mapSkillState),
      list: listMirror('skill_states', mapSkillState),
      watch: watchMirror('skill_states', mapSkillState),
    },
    snapshots: {
      getById: getById('progress_snapshots', mapSnapshot),
      list: listMirror('progress_snapshots', mapSnapshot),
      watch: watchMirror('progress_snapshots', mapSnapshot),
    },
  };
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/progress module)
// ---------------------------------------------------------------------------

/**
 * The dashboard ChartSpec for a board (S18.6). Reads the local mirrors
 * (`skill_states` + `progress_snapshots` ONLY — 03 S4.2 mirror rule).
 * Offline-safe : a stale mirror is a frozen dashboard, never an error
 * (AD-7, 02 S7).
 */
export function computeDashboard(
  store: LocalStore,
  board: DashboardBoard,
  userId?: string,
  nowIso = new Date().toISOString(),
  subject?: string,
): ChartSpec {
  const data = readProgress(store, userId);
  return moduleDashboard(board, {
    userId: userId ?? '',
    subject,
    skillStates: data.skillStates,
    snapshots: data.snapshots,
    now: nowIso,
  });
}

/** The trajectory chart for one skill (G2 line, S18.2 time-scale view). */
export function computeTrajectory(
  store: LocalStore,
  subject: string,
  userId?: string,
): ChartSpec {
  const data = readProgress(store, userId);
  const relevant = data.snapshots.filter((s) => s.subject === subject);
  return skillTrajectoryChart(
    subject,
    relevant.map((s) => ({ takenAt: s.takenAt, level: s.level })),
  );
}

/** The "today" board (S18.1) — skill-level table chart. */
export function computeTodayBoard(
  store: LocalStore,
  userId?: string,
  nowIso = new Date().toISOString(),
): ChartSpec {
  const data = readProgress(store, userId);
  return todayBoard(data.skillStates, nowIso);
}

/** The week/month trend board (G2 area, trajectory over percentages). */
export function computeTrendBoard(
  store: LocalStore,
  board: 'week' | 'month',
  subject: string,
  userId?: string,
): ChartSpec {
  const data = readProgress(store, userId);
  return trendBoard(
    board,
    subject,
    data.snapshots.map((s) => ({
      at: s.takenAt,
      level: s.level,
      confidence: s.confidence,
    })),
  );
}

/**
 * Recompute one skill state (AD-8 idempotent). The module is pure +
 * deterministic ; ce wrapper lit les evidences du store local (si
 * miroitées — `progress_evidences` est server-only, donc en pratique ce
 * recompute court sur la table server-side via l'EF, pas côté app).
 * Gardé ici pour la complétude du contrat (AD-7) + les tests unitaires.
 */
export function computeRecomputeSkill(
  input: Parameters<typeof recomputeSkill>[0],
): RecomputeOutput {
  return recomputeSkill(input);
}

/** Freshness for one evidence timestamp (0..1 freshness bucket, S18.2). */
export function computeFreshnessSafe(
  lastEvidenceAt: string,
  nowIso = new Date().toISOString(),
): ReturnType<typeof moduleComputeFreshness> {
  return moduleComputeFreshness(lastEvidenceAt, nowIso);
}

export type {
  DashboardBoard,
  ChartSpec,
  RecomputeOutput,
};
