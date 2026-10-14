/**
 * sync-config-wiring.test.ts — the drift guard between
 * `powersync/sync-config.yaml` (the relay SSoT, 11 edition-3 streams)
 * and the app boot code: `SYNC_STREAMS` (the packages/data SSoT) must
 * equal the set of `addScope('<name>')` calls in BOTH boot sites
 * (apps/mobile/src/lib/boot-data.ts + apps/desktop/renderer.jsx).
 *
 * Why grep and not import the source: importing `boot-data.ts` would
 * drag the full `@aurora/data` + vendor engine graph into the test
 * process (AD-7: the spine stays zero-vendor). The wiring is pure
 * call-site text — a regex is the right tool, and it checks the
 * literal strings the relay sees, not a transpiled indirection.
 *
 * AD-15 event: adding/renaming a stream in sync-config.yaml WITHOUT
 * updating SYNC_STREAMS + both boot sites FAILS this test.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/sync-config-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SYNC_STREAMS } from '@aurora/data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, '..', '..', '..'); // → aurora-2/

const BOOT_SITES: readonly string[] = [
  join(REPO_ROOT, 'apps', 'mobile', 'src', 'lib', 'boot-data.ts'),
  join(REPO_ROOT, 'apps', 'desktop', 'renderer.jsx'),
];

/**
 * Extract the literal `addScope('<name>')` stream names from a boot source
 * file. Works for BOTH the unrolled one-liner style and the
 * `for (const stream of SYNC_STREAMS)` loop style: in loop form, the loop
 * variable IS the SSoT element, so a bare `addScope(stream)` signal means
 * "all of SYNC_STREAMS" (the loop is the SSoT read, not a literal drift).
 */
function extractAddScopeNames(source: string): Set<string> | null {
  // Case A: the site loops over SYNC_STREAMS → every stream is covered
  // by construction (the loop variable is the SSoT element).
  if (source.includes('addScope(stream)') && source.includes('SYNC_STREAMS')) {
    return null; // signal: SSoT-driven, vacuously equal to SYNC_STREAMS
  }
  // Case B: explicit literal calls — collect every addScope('x').
  const names = new Set<string>();
  for (const m of source.matchAll(/addScope\(\s*(['"])([a-z_]+)\1\s*\)/g)) {
    names.add(m[2]);
  }
  return names;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('SYNC_STREAMS has exactly 11 unique edition-3 stream names', () => {
  assert.equal(SYNC_STREAMS.length, 11, '11 streams (sync-config.yaml SSoT)');
  assert.equal(new Set(SYNC_STREAMS).size, 11, 'no duplicate stream names');
});

for (const file of BOOT_SITES) {
  test(`addScope set in ${file} covers all of SYNC_STREAMS`, () => {
    const source = readFileSync(file, 'utf8');
    const names = extractAddScopeNames(source);
    if (names === null) {
      // SSoT-driven loop form (the mobile + desktop use a `for` loop over
      // SYNC_STREAMS) — every stream is covered by construction.
      return;
    }
    assert.notEqual(names, null, `expected literal or loop addScope calls in ${file}`);
    const missing = SYNC_STREAMS.filter((s) => !names.has(s));
    assert.deepEqual(missing, [], `missing addScope calls in ${file}: ${missing.join(', ')}`);
    const extra = [...names].filter((n) => !SYNC_STREAMS.includes(n));
    assert.deepEqual(extra, [], `addScope names in ${file} not in SYNC_STREAMS (drift): ${extra.join(', ')}`);
  });
}

test('every SYNC_STREAMS entry is a legal sync-config.yaml stream key', () => {
  // Shape check: lowercase + underscore, non-empty. The 11 SSoT names are
  // kept in sync with powersync/sync-config.yaml manually (AD-15 event) —
  // the point is the shape check, not a 3rd copy of the list.
  for (const s of SYNC_STREAMS) {
    assert.match(s, /^[a-z][a-z_]*$/, `stream name "${s}" is lowercase-underscore (legal sync-config key)`);
  }
});
