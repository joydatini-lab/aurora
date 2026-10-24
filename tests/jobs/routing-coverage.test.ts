/**
 * Dispatcher routing coverage — the guard that would have caught the
 * `skill_recompute` hole.
 *
 * `fn-job-dispatcher` routes a due job by (jobKind, module). When no handler
 * matches, it `skip`s the job silently (`index.ts`: `if (handler === null)
 * { skipped += 1; continue; }`) and the job stays `pending` forever. Nothing
 * failed, nothing logged: 17 `skill_recompute` jobs sat pending for 16 days
 * while `PROGRESS_JOB_HANDLERS` was an empty array and
 * `buildSkillRecomputeHandler` existed, tested, and was never called.
 *
 * A green gate could not see it: `supabase/functions/**` is in no tsconfig, so
 * `pnpm -r typecheck` never reads the dispatcher. `check-ef-imports.mjs`
 * catches dead IMPORTS, but `PROGRESS_JOB_HANDLERS` was a live import of an
 * empty array — resolvable, and useless.
 *
 * This test asserts the property that actually matters: every `JobKind` the
 * system can enqueue has at least one handler registered for it. Kinds that are
 * deliberately unhandled must be listed in `KNOWN_UNHANDLED` with a reason, so
 * adding a kind to the vocabulary forces a conscious decision instead of
 * another silent skip.
 *
 * Run: node --experimental-strip-types --no-warnings tests/jobs/routing-coverage.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const DISPATCHER = join(ROOT, 'supabase', 'functions', 'fn-job-dispatcher', 'index.ts');

/**
 * Kinds present in the `JobKind` vocabulary (packages/domain/src/jobs.ts) with
 * NO handler anywhere. Each needs a reason, and each is a job that can be
 * enqueued and will then sit `pending` forever.
 *
 * Keep this list SHORT and shrinking. An entry here is a known defect, not a
 * design choice, unless the reason says otherwise.
 */
const KNOWN_UNHANDLED: Record<string, string> = {
  transcription:
    'no provider chosen (the perimeter names speech→transcription but no vendor); ' +
    'mirror-cognitive documents the degradation instead of faking a result (AD-1)',
};

/** Every JobKind the closed vocabulary (AD-15) declares. */
function jobKindVocabulary(): string[] {
  const src = readFileSync(join(ROOT, 'packages', 'domain', 'src', 'jobs.ts'), 'utf8');
  const block = src.match(/export type JobKind =([\s\S]*?);/);
  assert.ok(block, 'JobKind union not found in packages/domain/src/jobs.ts');
  return [...block[1].matchAll(/'([a-z_-]+)'/g)].map((m) => m[1]);
}

/**
 * Tracked `.ts` sources under `packages/` — enumerated via `git ls-files`, the
 * same convention as `check-view-joins.ts`. Walking the tree directly is not an
 * option: pnpm's workspace links form `node_modules` symlink cycles
 * (engineering-adapters ↔ scientific-engine) and `statSync` dies with ELOOP.
 */
function trackedPackageSources(): string[] {
  const out = execFileSync('git', ['ls-files', 'packages'], { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.includes('/dist/') && !f.includes('/test/') && !f.includes('/node_modules/'))
    .map((f) => join(ROOT, f));
}

/** jobKind values declared by handlers across the module packages + the dispatcher. */
function declaredJobKinds(): Set<string> {
  const kinds = new Set<string>();
  for (const f of [...trackedPackageSources(), DISPATCHER]) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/jobKind:\s*["']([a-z_-]+)["']/g)) kinds.add(m[1]);
  }
  return kinds;
}

test('routing: every JobKind in the vocabulary has a handler (or a documented reason)', () => {
  const vocabulary = jobKindVocabulary();
  const handled = declaredJobKinds();
  const missing = vocabulary.filter((k) => !handled.has(k) && !(k in KNOWN_UNHANDLED));
  assert.deepEqual(
    missing,
    [],
    `JobKind(s) with no handler: ${missing.join(', ')}. ` +
      'Either register a handler, or add the kind to KNOWN_UNHANDLED with a reason. ' +
      'An unhandled kind is skipped SILENTLY by the dispatcher and stays pending forever.',
  );
});

test('routing: the dispatcher registers the Progress and Learning handler builders', () => {
  const src = readFileSync(DISPATCHER, 'utf8');
  assert.match(src, /buildProgressHandlers\(\)/, 'buildProgressHandlers() is not registered');
  assert.match(src, /buildLearningHandlers\(\)/, 'buildLearningHandlers() is not registered');
  // The shadowing trap: a no-op table spread BEFORE its REST-wired counterpart
  // wins by (module, jobKind), because registerHandlers is first-wins.
  const progressWired = src.indexOf('...buildProgressHandlers()');
  const progressTable = src.indexOf('...PROGRESS_JOB_HANDLERS');
  assert.ok(progressWired !== -1, 'buildProgressHandlers() spread not found');
  assert.ok(progressTable !== -1, 'PROGRESS_JOB_HANDLERS spread not found');
  assert.ok(
    progressWired < progressTable,
    'buildProgressHandlers() must be spread BEFORE PROGRESS_JOB_HANDLERS: registerHandlers is ' +
      'first-wins, so the no-op table would shadow the REST-wired handler.',
  );
});

test('routing: PROGRESS_JOB_HANDLERS is not an empty array (skill_recompute was unreachable)', () => {
  const src = readFileSync(join(ROOT, 'packages', 'progress', 'src', 'jobs.ts'), 'utf8');
  assert.doesNotMatch(
    src,
    /PROGRESS_JOB_HANDLERS[^=]*=\s*\[\s*\]/,
    'PROGRESS_JOB_HANDLERS is an empty array — skill_recompute would have no handler and its ' +
      'jobs would be skipped silently, exactly as they were for 16 days.',
  );
});
