/**
 * Learning local-mirror repo — branchement module A3 (learning).
 *
 * Le module `@aurora/learning` est la logique métier pure (AD-1/AD-10) :
 * `fsrsNext` (scheduling FSRS v5, AD-8 idempotent), `QcmService` /
 * `detectRecurringErrors` / `nextRevisionDifficulty` (QCM progressive +
 * error analysis), `FlashcardService`, `DefaultMirrorCognitiveService`
 * / `detectMirrorFindings` (Mirror Cognitive G-L3), `buildRetrievalQueries`
 * / `fuseRetrieval` (retrieval server-only, AD-12 — le repo EXPOSE les
 * deux legs du query contract sans exécuter, l'exécution vit dans
 * `fn-retrieval` EF), `DefaultCourseImportPipeline` (course import),
 * `StudySheetService` / `checkFidelity` (study sheets), `treeLayout` /
 * `checkTreeInvariants` / `lazyExpand` (semantic tree layout).
 *
 * C'est **ce repo** (confiné à la couche provider, AD-15) qui consomme
 * le module et le relie au store local `LocalStore` (miroirs PowerSync
 * `learning_sessions` + `reviews` + `node_state` — 03 S4.2, AD-7). Les
 * tables `flashcards` / `learning_items` / `courses` ne sont PAS
 * miroitées (server-only, AD-7) : le repo lit honnêtement les miroirs
 * existants et expose le calcul du module sur ces données locales.
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit des types SSoT
 * (`FsrsOutput`, `ErrorCluster`, `QcmDifficulty`, `ChartSpec`). La page
 * lit le hook React Query — elle n'importe jamais `@aurora/learning`.
 */
import type {
  NodeState,
  SemanticNode,
  SemanticEdge,
} from '@aurora/domain';
import type {
  LocalFilter,
  LocalQueryRepository,
  LocalStore,
} from '@aurora/data';
import {
  fsrsNext,
  FSRS_PARAMS,
  detectRecurringErrors,
  nextRevisionDifficulty,
  QcmService,
  detectMirrorFindings,
  buildRetrievalQueries,
  fuseRetrieval,
  treeLayout,
  checkTreeInvariants,
  lazyExpand,
  type FsrsInput,
  type FsrsOutput,
  type FsrsParams,
  type FsrsRating,
  type QcmAttempt,
  type QcmDifficulty,
  type ErrorCluster,
  type MirrorClaim,
  type MirrorFinding,
  type RetrievalRequest,
  type TreeLayout,
} from '@aurora/learning';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

const optNum = (v: unknown): number | undefined =>
  typeof v === 'number' ? v : undefined;

export interface LearningSessionRow {
  id: string;
  userId: string;
  courseId?: string;
  startedAt: string;
  endedAt?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

function mapLearningSession(row: RawRow): LearningSessionRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    courseId: optStr(row.course_id),
    startedAt: str(row.started_at) ?? '',
    endedAt: optStr(row.ended_at),
    summary: optStr(row.summary),
    createdAt: str(row.created_at) ?? '',
    updatedAt: str(row.updated_at) ?? '',
  };
}

export interface ReviewRow {
  id: string;
  userId: string;
  itemId?: string;
  rating?: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

function mapReview(row: RawRow): ReviewRow {
  return {
    id: str(row.id) ?? '',
    userId: str(row.user_id) ?? '',
    itemId: optStr(row.item_id),
    rating: optNum(row.rating),
    comment: optStr(row.comment),
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

export interface LearningRead {
  sessions: LearningSessionRow[];
  reviews: ReviewRow[];
}

/** Read the learning input sets from the local store (AD-7 local-only). */
export function readLearning(
  store: LocalStore,
  userId?: string,
): LearningRead {
  return {
    sessions: collectRows(store, 'learning_sessions', userId).map(
      mapLearningSession,
    ),
    reviews: collectRows(store, 'reviews', userId).map(mapReview),
  };
}

// ---------------------------------------------------------------------------
// LocalQueryRepository facade (pattern `productivity-repo.ts` /
// `progress-repo.ts`) — the provider-layer read surface.
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
 * Build the learning `LocalQueryRepository` family over the `LocalStore`
 * mirrors (`learning_sessions`, `reviews`). Read-only + local (AD-7) :
 * the write side (flashcard review, QCM attempt, course import) vit dans
 * le module `@aurora/learning` + l'upsync queue ; ce repo est le READ
 * path seulement.
 */
export function createLearningRepo(store: LocalStore): {
  sessions: LocalQueryRepository<LearningSessionRow>;
  reviews: LocalQueryRepository<ReviewRow>;
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
    sessions: {
      getById: getById('learning_sessions', mapLearningSession),
      list: listMirror('learning_sessions', mapLearningSession),
      watch: watchMirror('learning_sessions', mapLearningSession),
    },
    reviews: {
      getById: getById('reviews', mapReview),
      list: listMirror('reviews', mapReview),
      watch: watchMirror('reviews', mapReview),
    },
  };
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/learning module)
// ---------------------------------------------------------------------------

/**
 * The FSRS scheduler (F-07 : le FSRS court SERVER-SIDE via un job
 * `fsrs-tick` AD-8 ; ce wrapper est le calcul local pour la page /learn
 * — le rating est lu dans le miroir `reviews`, la date d'échéance est
 * recomputeée localement. La vérité SSoT du scheduling reste l'EF.
 */
export function computeFsrsNext(
  input: FsrsInput,
  params: FsrsParams = FSRS_PARAMS,
): FsrsOutput {
  return fsrsNext(input, params);
}

/** The QCM service (generation prompt + job payload, AD-8 artifact_gen). */
export const qcmService: QcmService = new QcmService();

/** Recurring-error detection → targeted revision (SAPPHO §2). */
export function computeRecurringErrors(
  attempts: QcmAttempt[],
  opts?: { perThreshold?: number; totalThreshold?: number },
): ErrorCluster[] {
  return detectRecurringErrors(attempts, opts);
}

/** Targeted revision : skill level → next QCM difficulty. */
export function computeNextRevisionDifficulty(
  skill: { level: import('@aurora/domain').SkillState['level'] },
): QcmDifficulty {
  return nextRevisionDifficulty(skill);
}

/**
 * The Mirror Cognitive detector (G-L3, 01 S4.2). The pure
 * `detectMirrorFindings` (module) lit les claims + le semantic tree ;
 * le job `agent_run` (AD-8) exécuté côté EF appelle `DefaultMirror-
 * CognitiveService.analyze`. Ce wrapper est le calcul local pour la
 * page /learn — le rapport complet (transcription + job status) reste
 * server-only (AD-12/F-09).
 */
export function computeMirrorFindings(
  claims: MirrorClaim[],
  nodes: Array<{
    id: string;
    label: string;
    learningState?: NodeState['learningState'];
  }>,
): { findings: MirrorFinding[]; weakNodes: string[] } {
  return detectMirrorFindings(claims, nodes);
}

/**
 * The semantic-tree layout (G2 tree chart). The module `treeLayout`
 * produit le layout positionné (AD-10 : le UI rend le layout, pas le
 * module) ; ce wrapper est l'entrée du repo sur les `SemanticNode` /
 * `SemanticEdge` du domaine (le store les lit via `readKnowledgeMirror`
 * de `knowledge-repo.ts` — ce repo reçoit l'arbre déjà mapé).
 */
export function computeTreeLayout(
  nodes: SemanticNode[],
  edges: SemanticEdge[],
  opts?: { nodeWidth?: number; nodeHeight?: number; rankGap?: number; nodeGap?: number },
): TreeLayout {
  return treeLayout(nodes, edges, opts);
}

/** The tree invariants check (05 S3.6.4). */
export function checkTreeInvariantsRepo(
  nodes: SemanticNode[],
  edges: SemanticEdge[],
): ReturnType<typeof checkTreeInvariants> {
  return checkTreeInvariants(nodes, edges);
}

/** Level-by-level lazy expansion (02 S9.2: root + level-1 first). */
export function lazyExpandRepo(
  nodes: SemanticNode[],
  edges: SemanticEdge[],
  depth: number,
): string[] {
  return lazyExpand(nodes, edges, depth);
}

/**
 * The retrieval query contract (AD-12 server-only, F-09). Le repo EXPOSE
 * les deux legs du query shape — l'exécution (Postgres FTS + HNSW) vit
 * dans `fn-retrieval` (EF), pas ici. Ce wrapper est le shape builder
 * partagé EF + tests (le module est la SSoT du query contract, AD-10).
 */
export function buildRetrievalQueriesRepo(
  req: RetrievalRequest,
): ReturnType<typeof buildRetrievalQueries> {
  return buildRetrievalQueries(req);
}

/** Reciprocal-rank fusion of the FTS + vector legs (pure, deterministic). */
export function fuseRetrievalRepo(
  fts: Array<{ chunkId: string; documentId: string; score: number }>,
  vector: Array<{ chunkId: string; documentId: string; score: number }>,
  opts?: { limit?: number; ftsWeight?: number },
): ReturnType<typeof fuseRetrieval> {
  return fuseRetrieval(fts, vector, opts);
}

export type {
  FsrsInput,
  FsrsOutput,
  FsrsParams,
  FsrsRating,
  QcmAttempt,
  QcmDifficulty,
  ErrorCluster,
  MirrorClaim,
  MirrorFinding,
  RetrievalRequest,
  TreeLayout,
};
