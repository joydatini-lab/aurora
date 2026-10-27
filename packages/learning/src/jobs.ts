/**
 * Learning module — job handlers (AD-8; global wiring lives in ORION's
 * fn-job-dispatcher switch — the ONLY place the JobKind switch lives).
 *
 * These are the handlers the dispatcher imports. Before this file existed the
 * dispatcher imported `PROGRESS_FSRS_TICK_HANDLER` and
 * `PROGRESS_COURSE_IMPORT_HANDLER` from `packages/progress/src/jobs.ts` and
 * neither symbol existed, so fn-job-dispatcher could not boot at all: it was
 * never deployed and 34 cron jobs sat pending from 2026-10-08.
 *
 * The two kinds are genuinely Learning's, not Progress's:
 *   - `fsrs-tick`     — the daily spaced-repetition sweep. The algorithm is
 *                       already written and pure (`fsrs.ts` → `fsrsNext`);
 *                       this handler is the missing I/O glue that reads the
 *                       due cards and writes their next schedule.
 *   - `course_import` — OCR + knowledge ingestion for a captured course. The
 *                       pure pipeline contract already exists
 *                       (`course-import.ts` → `CourseImportPipeline`); this
 *                       handler advances the persisted `course_imports` row.
 *
 * AD-7 (single-writer): this module writes `flashcards` and `course_imports`,
 * both Learning-owned. It never writes another module's tables.
 * AD-8 (idempotent): re-running the same tick or import is a no-op.
 * AD-3 (no keys on device): the ports are injected at DEPLOYMENT time by the
 * dispatcher, which holds the EF env; this file holds no secret.
 */
import type { JobKind } from '@aurora/domain';
import { fsrsNext, type FsrsRating } from './fsrs.ts';

/** A handler receives the dispatched job payload and returns the result that
 *  the dispatcher persists (AD-8 observability). */
export type LearningJobHandler = (
  jobId: string,
  userId: string,
  payload: Record<string, unknown>,
) => Promise<{ ok: boolean; result?: unknown; error?: string }>;

export interface RegisteredHandler {
  jobKind: JobKind;
  module: 'learning';
  handler: LearningJobHandler;
}

/** One due flashcard, as read from the Learning-owned mirror. */
export interface DueCard {
  id: string;
  due: number; // ms epoch
  stability: number | null;
  difficulty: number | null;
  lapses: number;
}

/** The schedule write for one card (Learning-owned table only, AD-7). */
export interface CardSchedule {
  id: string;
  due: number; // ms epoch
  stability: number;
  difficulty: number;
  lapses: number;
}

/**
 * I/O the `fsrs-tick` handler needs. Injected by the dispatcher (which holds
 * the EF env) so this module stays pure and secret-free (AD-3).
 */
export interface FsrsTickDeps {
  /** cards whose `due` is at or before `now`, oldest first */
  getDueCards(userId: string, now: number, limit: number): Promise<DueCard[]>;
  /** persist the advanced schedule (idempotent by card id + due) */
  saveSchedule(userId: string, schedules: CardSchedule[]): Promise<void>;
  now(): number;
}

/** A course-import row as persisted in `course_imports` (Learning-owned). */
export interface CourseImportRow {
  id: string;
  userId: string;
  courseId: string | null;
  source: string;
  r2Key: string | null;
  status: string;
  jobId: string | null;
}

/** What OCR + ingestion produced for one import. */
export interface ImportOutcome {
  /** extracted text length (0 when nothing could be read) */
  textLength: number;
  /** knowledge documents ingested into the KB */
  documentIds: string[];
  /** true when the capture needs manual completion (AD-1 degradation) */
  needsManual: boolean;
}

/**
 * I/O the `course_import` handler needs. `extract` is the OCR step: it is a
 * port because the OCR provider is a NEEDS_DECISION (the perimeter says OCR
 * happens "si nécessaire", without naming a provider). An absent port degrades
 * to `needsManual` — never a broken job (AD-1).
 */
export interface CourseImportDeps {
  getImport(importId: string, userId: string): Promise<CourseImportRow | null>;
  extract(r2Key: string): Promise<{ text: string; pageCount: number }>;
  ingestKnowledge(
    userId: string,
    courseId: string | null,
    text: string,
  ): Promise<string[]>;
  setStatus(
    importId: string,
    userId: string,
    status: string,
    jobId: string,
  ): Promise<void>;
  now(): string;
}

/** Clamp a rating read from the payload to the FSRS scale (0..5). */
function asRating(v: unknown): FsrsRating {
  const n = typeof v === 'number' ? Math.round(v) : 3;
  return Math.max(0, Math.min(5, n)) as FsrsRating;
}

/**
 * Build the `fsrs-tick` handler.
 *
 * Reads every due card for the user and advances its schedule with the
 * existing pure `fsrsNext`. The rating for a scheduled sweep is `Good` (3):
 * a tick is not a user review, it is the *reminder* pass — the user's real
 * rating arrives through `FlashcardService.review` when they actually study.
 * Cards not yet due are never touched, so re-running the tick is a no-op
 * (AD-8).
 */
export function buildFsrsTickHandler(deps: FsrsTickDeps): RegisteredHandler {
  return {
    jobKind: 'fsrs-tick',
    module: 'learning',
    handler: async (jobId, userId, payload) => {
      void jobId;
      const now = deps.now();
      const limit = Number(payload.limit ?? 500);
      const due = await deps.getDueCards(userId, now, limit);
      if (due.length === 0) {
        return { ok: true, result: { op: 'fsrs-tick', due: 0, scheduled: 0 } };
      }
      const schedules: CardSchedule[] = due.map((card) => {
        const next = fsrsNext({
          state:
            card.stability === null || card.difficulty === null
              ? null
              : {
                  stability: card.stability,
                  difficulty: card.difficulty,
                  lapses: card.lapses,
                },
          rating: asRating(payload.rating ?? 3),
          elapsedDays: Math.max(0, (now - card.due) / 86_400_000),
          now,
        });
        return {
          id: card.id,
          due: next.due,
          stability: next.stability,
          difficulty: next.difficulty,
          lapses: next.lapses,
        };
      });
      await deps.saveSchedule(userId, schedules);
      return {
        ok: true,
        result: { op: 'fsrs-tick', due: due.length, scheduled: schedules.length },
      };
    },
  };
}

/**
 * Build the `course_import` handler.
 *
 * Advances the persisted `course_imports` row through the import: OCR
 * extraction, then KB ingestion. Degradations are explicit, never silent
 * (AD-1):
 *   - unknown import row        → `ok:false` (`learning/import_not_found`)
 *   - nothing extracted         → status `needs_manual`, still `ok:true`
 *   - already `done`            → `ok:true` with `skipped` (idempotent, AD-8)
 */
export function buildCourseImportHandler(
  deps: CourseImportDeps,
): RegisteredHandler {
  return {
    jobKind: 'course_import',
    module: 'learning',
    handler: async (jobId, userId, payload) => {
      const importId = payload.importId;
      if (typeof importId !== 'string' || importId === '') {
        return { ok: false, error: 'learning/missing_import_id' };
      }
      const row = await deps.getImport(importId, userId);
      if (row === null) {
        return { ok: false, error: `learning/import_not_found: ${importId}` };
      }
      // AD-8: a completed import is never re-imported.
      if (row.status === 'done') {
        return { ok: true, result: { op: 'course_import', skipped: 'already-done' } };
      }
      if (row.r2Key === null) {
        await deps.setStatus(importId, userId, 'needs_manual', jobId);
        return {
          ok: true,
          result: { op: 'course_import', needsManual: true, reason: 'no_r2_key' },
        };
      }

      await deps.setStatus(importId, userId, 'running', jobId);
      const extracted = await deps.extract(row.r2Key);
      if (extracted.text.trim() === '') {
        // AD-1: OCR found nothing → manual completion, job still succeeds.
        await deps.setStatus(importId, userId, 'needs_manual', jobId);
        return {
          ok: true,
          result: { op: 'course_import', needsManual: true, reason: 'empty_extraction' },
        };
      }

      const documentIds = await deps.ingestKnowledge(
        userId,
        row.courseId,
        extracted.text,
      );
      await deps.setStatus(importId, userId, 'done', jobId);
      const outcome: ImportOutcome = {
        textLength: extracted.text.length,
        documentIds,
        needsManual: false,
      };
      return { ok: true, result: { op: 'course_import', ...outcome } };
    },
  };
}

/** The handlers Learning provides to the dispatcher's global switch. */
export const LEARNING_JOB_HANDLERS: readonly RegisteredHandler[] = [
  buildFsrsTickHandler({
    getDueCards: async () => [],
    saveSchedule: async () => {},
    now: () => Date.now(),
  }),
  buildCourseImportHandler({
    getImport: async () => null,
    extract: async () => ({ text: '', pageCount: 0 }),
    ingestKnowledge: async () => [],
    setStatus: async () => {},
    now: () => new Date().toISOString(),
  }),
];

/** The JobKinds this module registers handlers for (for ORION's switch). */
export const LEARNING_JOB_KINDS: readonly JobKind[] = [
  ...new Set(LEARNING_JOB_HANDLERS.map((h) => h.jobKind)),
];
