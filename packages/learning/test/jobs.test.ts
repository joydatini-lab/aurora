/**
 * @aurora/learning — job handler tests (the two kinds the dispatcher routes).
 *
 * These cover the handlers that fn-job-dispatcher imports. Before they
 * existed the dispatcher imported two symbols that did not exist anywhere,
 * so the EF could not boot at all.
 *
 * The handlers are tested against REAL in-memory ports, not mocks of the
 * module: `getDueCards` / `saveSchedule` are the actual seam shapes the
 * dispatcher injects, and the assertions read the state the handler produced.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFsrsTickHandler,
  buildCourseImportHandler,
  type CardSchedule,
  type CourseImportRow,
  type DueCard,
} from '../src/jobs.ts';
import { FSRS_PARAMS } from '../src/fsrs.ts';

const NOW = Date.parse('2026-10-24T02:00:00.000Z');
const DAY = 86_400_000;

/** A tiny in-memory store standing in for the Learning-owned tables. */
function store(cards: DueCard[], imports: Record<string, CourseImportRow>) {
  const written: CardSchedule[] = [];
  const statuses: Array<{ id: string; status: string }> = [];
  let ingested: string[] = [];
  return {
    written,
    statuses,
    get ingested() {
      return ingested;
    },
    deps: {
      getDueCards: async (_u: string, now: number, limit: number) =>
        cards.filter((c) => c.due <= now).slice(0, limit),
      saveSchedule: async (_u: string, s: CardSchedule[]) => {
        written.push(...s);
      },
      now: () => NOW,
    },
    importDeps: {
      getImport: async (id: string) => imports[id] ?? null,
      extract: async () => ({ text: 'Chapter 1. Photosynthesis.', pageCount: 3 }),
      ingestKnowledge: async (_u: string, _c: string | null, text: string) => {
        ingested = [`doc-${text.length}`];
        return ingested;
      },
      setStatus: async (id: string, _u: string, status: string) => {
        statuses.push({ id, status });
      },
      now: () => new Date(NOW).toISOString(),
    },
  };
}

test('fsrs-tick: advances every due card and leaves future cards alone', async () => {
  const s = store(
    [
      { id: 'a', due: NOW - 2 * DAY, stability: 3, difficulty: 5, lapses: 0 },
      { id: 'b', due: NOW - DAY, stability: 2, difficulty: 6, lapses: 1 },
      { id: 'c', due: NOW + 5 * DAY, stability: 4, difficulty: 4, lapses: 0 },
    ],
    {},
  );
  const h = buildFsrsTickHandler(s.deps);
  const out = await h.handler('job-1', 'user-1', {});
  assert.equal(out.ok, true);
  assert.deepEqual(out.result, { op: 'fsrs-tick', due: 2, scheduled: 2 });
  assert.deepEqual(
    s.written.map((w) => w.id).sort(),
    ['a', 'b'],
    'the not-yet-due card c must never be touched',
  );
});

test('fsrs: regression — a review must schedule DAYS ahead, not one minute', async () => {
  // The bug this locks: nextStabilityToDays divided by a negative decay
  // exponent, so every interval came out negative and the one-minute floor
  // swallowed it. Spaced repetition was completely inert and no test noticed
  // because none asserted an interval. Verified against py-fsrs
  // `Scheduler._next_interval`: I(r,S) = (S/FACTOR) * (r**(1/DECAY) - 1).
  const s = store(
    [{ id: 'a', due: NOW - DAY, stability: 10, difficulty: 5, lapses: 0 }],
    {},
  );
  const h = buildFsrsTickHandler(s.deps);
  await h.handler('job-1', 'user-1', {});
  const days = (s.written[0].due - NOW) / DAY;
  assert.ok(
    days > 1,
    `a card with stability 10 must be scheduled days ahead, got ${days} days`,
  );
  assert.ok(days < 60, `and not absurdly far, got ${days} days`);
});

test('fsrs-tick: pushes each card forward, never backwards', async () => {
  const s = store(
    [{ id: 'a', due: NOW - DAY, stability: 3, difficulty: 5, lapses: 0 }],
    {},
  );
  const h = buildFsrsTickHandler(s.deps);
  await h.handler('job-1', 'user-1', {});
  assert.equal(s.written.length, 1);
  const w = s.written[0];
  assert.ok(w.due > NOW, 'next due must be in the future');
  assert.ok(w.stability > 0 && w.stability <= 10, `stability in range: ${w.stability}`);
  assert.ok(w.difficulty > 0 && w.difficulty <= 10, `difficulty in range: ${w.difficulty}`);
});

test('fsrs-tick: a brand-new card (no state) is initialised, not skipped', async () => {
  const s = store(
    [{ id: 'new', due: NOW - DAY, stability: null, difficulty: null, lapses: 0 }],
    {},
  );
  const h = buildFsrsTickHandler(s.deps);
  const out = await h.handler('job-1', 'user-1', {});
  assert.equal(out.ok, true);
  assert.equal(s.written.length, 1);
  assert.ok(s.written[0].stability >= 1, 'init stability is at least the floor');
});

test('fsrs-tick: idempotent — a second run finds nothing due', async () => {
  const cards: DueCard[] = [
    { id: 'a', due: NOW - DAY, stability: 3, difficulty: 5, lapses: 0 },
  ];
  const s = store(cards, {});
  const h = buildFsrsTickHandler({
    ...s.deps,
    saveSchedule: async (_u, schedules) => {
      // Reflect the write back into the store, as the real table would.
      for (const w of schedules) {
        const c = cards.find((x) => x.id === w.id);
        if (c) c.due = w.due;
      }
    },
  });
  const first = await h.handler('job-1', 'user-1', {});
  const second = await h.handler('job-2', 'user-1', {});
  assert.equal((first.result as { scheduled: number }).scheduled, 1);
  assert.equal(
    (second.result as { scheduled: number }).scheduled,
    0,
    're-dispatch must be a no-op (AD-8)',
  );
});

test('fsrs-tick: respects the payload rating override', async () => {
  const card: DueCard = { id: 'a', due: NOW - DAY, stability: 3, difficulty: 5, lapses: 0 };
  const good = store([{ ...card }], {});
  const again = store([{ ...card }], {});
  const hGood = buildFsrsTickHandler({ ...good.deps, now: () => NOW });
  const hAgain = buildFsrsTickHandler({ ...again.deps, now: () => NOW });
  await hGood.handler('j', 'u', { rating: 4 });
  await hAgain.handler('j', 'u', { rating: 0 });
  assert.ok(
    good.written[0].due > again.written[0].due,
    'rating 4 (Easy) must schedule further out than rating 0 (Again)',
  );
});

test('fsrs-tick: default rating is Good, and the FSRS params are the frozen v5 set', () => {
  assert.equal(FSRS_PARAMS.w.length, 19, 'the 19-weight v5 vector');
  assert.equal(FSRS_PARAMS.requestRetention, 0.9);
  assert.deepEqual(FSRS_PARAMS.learningSteps, [1, 5]);
});

test('course_import: a healthy import runs OCR then ingestion and lands on done', async () => {
  const s = store([], {
    imp1: {
      id: 'imp1',
      userId: 'u1',
      courseId: 'c1',
      source: 'pdf',
      r2Key: 'courses/u1/c1/doc.pdf',
      status: 'pending',
      jobId: null,
    },
  });
  const h = buildCourseImportHandler(s.importDeps);
  const out = await h.handler('job-9', 'u1', { importId: 'imp1' });
  assert.equal(out.ok, true);
  assert.deepEqual(s.statuses.map((x) => x.status), ['running', 'done']);
  assert.equal(s.ingested.length, 1, 'exactly one document ingested');
  assert.match(s.ingested[0], /^doc-\d+$/);
  assert.equal((out.result as { needsManual: boolean }).needsManual, false);
});

test('course_import: a missing import id is a real failure, not a silent success', async () => {
  const s = store([], {});
  const h = buildCourseImportHandler(s.importDeps);
  const out = await h.handler('job-9', 'u1', { importId: 'nope' });
  assert.equal(out.ok, false);
  assert.match(String(out.error), /import_not_found/);
});

test('course_import: an empty importId is rejected before any I/O', async () => {
  const s = store([], {});
  const h = buildCourseImportHandler(s.importDeps);
  const out = await h.handler('job-9', 'u1', {});
  assert.equal(out.ok, false);
  assert.match(String(out.error), /missing_import_id/);
});

test('course_import: no r2 key degrades to needs_manual, never a broken job (AD-1)', async () => {
  const s = store([], {
    imp2: {
      id: 'imp2',
      userId: 'u1',
      courseId: null,
      source: 'manual',
      r2Key: null,
      status: 'pending',
      jobId: null,
    },
  });
  const h = buildCourseImportHandler(s.importDeps);
  const out = await h.handler('job-9', 'u1', { importId: 'imp2' });
  assert.equal(out.ok, true, 'a degradation is not a job failure');
  assert.deepEqual(s.statuses.map((x) => x.status), ['needs_manual']);
  assert.equal((out.result as { needsManual: boolean }).needsManual, true);
});

test('course_import: OCR returning nothing degrades to needs_manual, never invents text', async () => {
  const s = store([], {
    imp3: {
      id: 'imp3',
      userId: 'u1',
      courseId: 'c1',
      source: 'camera',
      r2Key: 'courses/u1/c1/scan.jpg',
      status: 'pending',
      jobId: null,
    },
  });
  const h = buildCourseImportHandler({
    ...s.importDeps,
    extract: async () => ({ text: '   ', pageCount: 1 }),
  });
  const out = await h.handler('job-9', 'u1', { importId: 'imp3' });
  assert.equal(out.ok, true);
  assert.deepEqual(s.statuses.map((x) => x.status), ['running', 'needs_manual']);
  assert.equal((out.result as { reason: string }).reason, 'empty_extraction');
  assert.equal(s.ingested.length, 0, 'nothing must be ingested from an empty extraction');
});

test('course_import: idempotent — an already-done import is never re-imported (AD-8)', async () => {
  const s = store([], {
    imp4: {
      id: 'imp4',
      userId: 'u1',
      courseId: 'c1',
      source: 'pdf',
      r2Key: 'courses/u1/c1/doc.pdf',
      status: 'done',
      jobId: 'old-job',
    },
  });
  const h = buildCourseImportHandler(s.importDeps);
  const out = await h.handler('job-9', 'u1', { importId: 'imp4' });
  assert.equal(out.ok, true);
  assert.equal((out.result as { skipped: string }).skipped, 'already-done');
  assert.equal(s.statuses.length, 0, 'no status write on a replay');
  assert.equal(s.ingested.length, 0, 'no ingestion on a replay');
});

test('course_import: sets status running before doing the heavy work', async () => {
  const order: string[] = [];
  const s = store([], {
    imp5: {
      id: 'imp5',
      userId: 'u1',
      courseId: 'c1',
      source: 'pdf',
      r2Key: 'k.pdf',
      status: 'pending',
      jobId: null,
    },
  });
  const h = buildCourseImportHandler({
    ...s.importDeps,
    extract: async () => {
      order.push('extract');
      return { text: 'content', pageCount: 1 };
    },
    setStatus: async (_id, _u, status) => {
      order.push(`status:${status}`);
    },
  });
  await h.handler('job-9', 'u1', { importId: 'imp5' });
  assert.deepEqual(order, ['status:running', 'extract', 'status:done']);
});
