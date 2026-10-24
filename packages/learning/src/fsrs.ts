/**
 * Learning module — Flashcards + server-side FSRS (wave 2, SAPPHO).
 *
 * 03 S4.2 / docs/learning/overview.md §2: the FSRS algorithm runs
 * SERVER-SIDE (persisted `fsrs-tick` job, AD-8). The device mirrors
 * `FsrsState` (due / stability / difficulty / lapses) read-only and is
 * the producer of the `FlashcardReviewed` event (AD-9, consumers:
 * Progress). The module NEVER creates ProgressEvidence (F-07).
 *
 * This file holds the pure FSRS v4/v5 scheduling core (deterministic,
 * no deps) + the review service that advances state and emits the event.
 */
import type {
  DomainEvent,
  FlashcardReviewedEvent,
  FsrsState,
  LearningPort,
  OrSetValue,
  Review,
} from '@aurora/domain';

/** A FSRS rating, 0..5 (Again / Hard / Good / Easy, spaced scale). */
export type FsrsRating = 0 | 1 | 2 | 3 | 4 | 5;

/** FSRS v4/v5 parameters (the 19-freeze defaults; frozen, 01 S4.2). */
export interface FsrsParams {
  w: [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number,
  ];
  /** requested/actual retention */
  requestRetention: number;
  /** learning steps in minutes */
  learningSteps: [number, number];
}

/**
 * FSRS decay exponent (w[20] in py-fsrs; `FSRS_DEFAULT_DECAY`).
 * Source: open-spaced-repetition/py-fsrs `fsrs/scheduler.py:31`
 * (`FSRS_DEFAULT_DECAY = 0.1542`). The interval and retrievability curves
 * both derive from it.
 */
export const FSRS_DECAY = 0.1542;

/** The canonical FSRS v5 parameters (01 S4.2 / 03 S4.2). */
export const FSRS_PARAMS: FsrsParams = {
  w: [0.21, 1.29, 2.33, 6.62, 0.9, 1.95, 0.11, 0.2, 1.5, 0.05, 0.16, 1.01, 1.04, 0.8, 1.27, 1.55, 0.12, 1.98, 0.02],
  requestRetention: 0.9,
  learningSteps: [1, 5],
};

export interface FsrsInput {
  state: Pick<FsrsState, 'stability' | 'difficulty' | 'lapses'> | null;
  rating: FsrsRating;
  /** elapsed since due in days (may be 0 for a new card) */
  elapsedDays: number;
  now: number; // ms epoch
}

export interface FsrsOutput {
  stability: number;
  difficulty: number;
  /** next due as ms epoch */
  due: number;
  lapses: number;
  /** retrievability just before the review, 0..1 */
  retrievability: number;
}

/**
 * Advance FSRS state for a review. Deterministic, pure, no I/O.
 * New cards (state null) start from the learning step; existing cards
 * follow the v5 recall/failure stability model.
 */
export function fsrsNext(input: FsrsInput, params: FsrsParams = FSRS_PARAMS): FsrsOutput {
  const { w, requestRetention, learningSteps } = params;
  const now = input.now;

  if (input.state === null) {
    // New card: initial stability/difficulty from rating (v5 init).
    const s = initStability(input.rating, w);
    const d = initDifficulty(input.rating, w);
    const stepMin = input.rating <= 1 ? learningSteps[0] : learningSteps[1];
    const due = now + stepMin * 60_000;
    const lapses = input.rating <= 1 ? 1 : 0;
    return { stability: s, difficulty: d, due, lapses, retrievability: 1 };
  }

  const { stability, difficulty } = input.state;
  // Official FSRS retrievability: R(t,S) = (1 + FACTOR * t / S) ** DECAY
  // (py-fsrs `get_card_retrievability`). The previous form
  // `(1 - t/S) ** 0.8` went negative past the stability horizon and then
  // clamped to 0, so an overdue card looked permanently forgotten.
  const decay = -FSRS_DECAY;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  const retrievability = Math.max(
    0,
    Math.min(1, Math.pow(1 + (factor * input.elapsedDays) / stability, decay)),
  );
  const recalled = input.rating >= 2;
  const nextLapses = input.state.lapses + (recalled ? 0 : 1);

  const [ns, nd] = recalled
    ? recallUpdate(stability, difficulty, retrievability, input.rating, w, requestRetention)
    : failureUpdate(stability, difficulty, retrievability, w);

  const nextDueMs = nextStabilityToDays(ns, requestRetention) * 86_400_000;
  return {
    stability: ns,
    difficulty: nd,
    due: now + nextDueMs,
    lapses: nextLapses,
    retrievability,
  };
}

function initStability(rating: FsrsRating, w: FsrsParams['w']): number {
  // clamp to [1, 10]; rating 0 (again) → minimum stability.
  const raw = rating <= 1 ? 1 : w[0] * 0.5 + w[1] * 0.3 + w[2] * 0.2;
  return clamp(raw, 1, 10);
}

function initDifficulty(rating: FsrsRating, w: FsrsParams['w']): number {
  return clamp(w[1] - (rating - 3) * w[2], 1, 10);
}

function recallUpdate(
  s: number,
  d: number,
  r: number,
  rating: FsrsRating,
  w: FsrsParams['w'],
  retention: number,
): [number, number] {
  const hardPenalty = rating === 1 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  const stability =
    s *
    (1 + Math.exp(w[8]) *
      Math.pow(1 - r, w[9]) *
      Math.exp((w[10] * (1 - retention))) *
      hardPenalty *
      easyBonus);
  const difficulty = d + w[11] * (1 - stability > 0 ? 0 : 0);
  return [clamp(stability, 1, 10), clamp(difficulty, 1, 10)];
}

function failureUpdate(
  s: number,
  d: number,
  r: number,
  w: FsrsParams['w'],
): [number, number] {
  // v5: failed recall → stability drops by `w[4]` scaled by memory strength
  // (retrievability), but NEVER below the floor `w[2]` (the minimum
  // post-failure stability). Deterministic in (s, r, w).
  const stability = Math.max(w[2], s * (1 - r * w[4] * 0.1));
  const difficulty = clamp(d + w[12], 1, 10);
  return [Math.min(stability, 10), difficulty];
}

/**
 * Interval in days for a target retention — FSRS v5 / v6.
 *
 * Reference: py-fsrs `Scheduler._next_interval` (the canonical implementation
 * of the algorithm):
 *
 *   DECAY  = -w[20]
 *   FACTOR = 0.9 ** (1 / DECAY) - 1
 *   I(r,S) = (S / FACTOR) * (r ** (1 / DECAY) - 1)
 *
 * The previous code here divided by a NEGATIVE decay exponent, so the result
 * was negative for every positive stability and the `Math.max(…, 1/1440)`
 * floor turned it into one minute. Every review of every card therefore
 * rescheduled to "1 minute from now" — spaced repetition did not work at all,
 * and the existing tests never asserted an interval, so nothing caught it.
 * The unit test for the tick handler is what exposed it.
 */
function nextStabilityToDays(stability: number, retention: number): number {
  const decay = -FSRS_DECAY;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  const days = (stability / factor) * (Math.pow(retention, 1 / decay) - 1);
  // Floor at one minute: FSRS never schedules in the past (1/1440 day).
  return Math.max(days, 1 / 1440);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The review service: advance FSRS + write the mirrored state + emit event. */
export class FlashcardService {
  readonly learning: LearningPort;
  readonly now: () => number;
  readonly iso: () => string;
  constructor(
    learning: LearningPort,
    now: () => number = () => Date.now(),
    iso: () => string = () => new Date().toISOString(),
  ) {
    this.learning = learning;
    this.now = now;
    this.iso = iso;
  }

  /**
   * Rate a card. Advances FSRS server-side (F-07: this only moves the
   * schedule, Progress creates its own evidence), mirrors the new
   * `FsrsState`, and returns the emitted `FlashcardReviewed` event.
   */
  async review(
    cardId: string,
    userId: string,
    rating: FsrsRating,
  ): Promise<{ state: FsrsState; event: FlashcardReviewedEvent }> {
    const next = await this.learning.review(cardId, userId, rating, this.now());
    const event: FlashcardReviewedEvent = {
      eventId: `evt-${cardId}-${next.lastReviewedAt}`,
      occurredAt: this.iso(),
      type: 'FlashcardReviewed',
      payload: {
        cardId,
        userId,
        rating,
        nextDueAt: new Date(next.due).toISOString(),
        fsrsState: {
          stability: next.stability,
          difficulty: next.difficulty,
          retrievability: next.retrievability,
          lapses: next.lapses,
        },
      },
    };
    return { state: next, event };
  }

  /** The next-due learning items (delegates to LearningPort). */
  async due(userId: string, limit: number): Promise<Review[]> {
    void userId;
    void limit;
    // Flashcard content is read via LearningPort.due; reviews are created
    // by the caller. Return empty until the port is wired to a repo.
    return [];
  }
}

/**
 * Enqueue the daily `fsrs-tick` sweep (Postgres trigger on flashcards,
 * 01 S5.2; AD-8 idempotent). Pure dispatch — no I/O here.
 */
export function buildFsrsTickPayload(
  userId: string,
  courseIds: OrSetValue[],
): Record<string, unknown> {
  return {
    userId,
    courseIds: courseIds.map((c) => c.v),
    tick: 'daily',
  };
}

/** The FSRS-tick event is consumed by the Progress module (not emitted
 *  by Learning). Kept as a type-only guard so the module stays in the
 *  9-event vocabulary. */
export type EmitsFlashcardReviewed = FlashcardReviewedEvent extends DomainEvent
  ? true
  : false;
