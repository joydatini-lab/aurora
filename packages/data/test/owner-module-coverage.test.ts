/**
 * Owner-module coverage — the guard that would have caught tranche 3.
 *
 * `OWNER_MODULE_BY_ENTITY` (commands.ts) declares, for every entity, WHICH module
 * may write its rows. Nothing checked that those modules EXIST. Measured
 * 2026-10-24: `knowledge` (7 entities), `artifact` (1), and `identity` (1) were
 * declared owners of tables that already existed — with the read path fully
 * wired (relay views + PowerSync streams) — but no package implemented them. So
 * every write was a missing seam: `SqliteCommandRepository.apply('knowledge', …)`
 * had no builder to call, and the agent kernel emitted `identity.set_theme`
 * commands to nobody.
 *
 * A declared owner with no implementation is invisible to the existing gate:
 * `check-rls.sh` reads migrations (tables exist, so it passes), the PowerSync
 * wiring test reads the sync config (streams are declared, so it passes), and
 * `single-writer.test.ts` checks that the OWNER TABLE rejects a wrong module —
 * never that the declared module exists.
 *
 * TWO invariants, deliberately separated:
 *   1. every declared module has a PACKAGE (hard — all 9 hold today);
 *   2. a module that declares a `*_OWNED_TABLES` inventory must match the routing
 *      table EXACTLY (hard — drift is a defect).
 * Modules with NO inventory are reported, not failed: `learning`, `progress`,
 * `discovery`, `integrations` build no local command at all today, and inventing
 * an inventory for them would fabricate a contract the code does not honour.
 * That is a genuine finding (see the module-gap assertion at the bottom), not a
 * green check.
 *
 * Run: node --experimental-strip-types --no-warnings packages/data/test/owner-module-coverage.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWNER_MODULE_BY_ENTITY } from '../src/commands.ts';

// Resolve the repo root from THIS file, not process.cwd(): the data test runner
// spawns each file with cwd = packages/data.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

/** Distinct module names the routing table declares. */
function declaredModules(): string[] {
  return [...new Set(Object.values(OWNER_MODULE_BY_ENTITY))].sort();
}

/** Tables the routing table assigns to one module. */
function tablesOf(module: string): string[] {
  return Object.entries(OWNER_MODULE_BY_ENTITY)
    .filter(([, m]) => m === module)
    .map(([t]) => t)
    .sort();
}

/**
 * The `<MODULE>_OWNED_TABLES` inventory a package declares, read from its SOURCE
 * text. Importing every package here would couple this test to each one's build
 * order, and the packages that matter are pure TypeScript with no build step.
 * Returns `null` when the package declares no inventory.
 */
function inventoryOf(module: string): string[] | null {
  const srcDir = join(ROOT, 'packages', module, 'src');
  if (!existsSync(srcDir)) return null;

  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
  const text = files.map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');

  const m = text.match(
    new RegExp(`${module.toUpperCase()}_OWNED_TABLES\\s*=\\s*\\[([\\s\\S]*?)\\]`),
  );
  if (!m) return null;
  return [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!).sort();
}

test('owner coverage: every declared owner module has a package', () => {
  const missing = declaredModules().filter(
    (m) => !existsSync(join(ROOT, 'packages', m, 'package.json')),
  );
  assert.deepEqual(
    missing,
    [],
    `these modules own tables in OWNER_MODULE_BY_ENTITY but have no package: ` +
      `${missing.join(', ')}. A declared owner with no implementation means no ` +
      'code can legally write its rows — every write is a missing seam (AD-7).',
  );
});

test('owner coverage: a declared inventory must match the routing table exactly', () => {
  const mismatches: string[] = [];
  for (const m of declaredModules()) {
    const inv = inventoryOf(m);
    if (inv === null) continue; // no inventory -> reported by the test below
    const expected = tablesOf(m);
    if (inv.join(',') !== expected.join(',')) {
      mismatches.push(
        `${m}: routing table says [${expected.join(', ')}] but the package declares [${inv.join(', ')}]`,
      );
    }
  }
  assert.deepEqual(
    mismatches,
    [],
    `routing table and owner packages disagree:\n  ${mismatches.join('\n  ')}`,
  );
});

test('owner coverage: the 3 modules tranche 3 closed are present AND inventoried', () => {
  for (const m of ['knowledge', 'artifact', 'identity']) {
    assert.equal(
      existsSync(join(ROOT, 'packages', m, 'package.json')),
      true,
      `@aurora/${m} is missing`,
    );
    assert.notEqual(inventoryOf(m), null, `@aurora/${m} declares no *_OWNED_TABLES inventory`);
  }
});

test('owner coverage: exactly these modules declare no *_OWNED_TABLES inventory', () => {
  // Measured 2026-10-24, asserted so the set cannot silently grow. This is a
  // precision statement, not a claim that all five are broken:
  //   - `productivity` HAS a write path — a `ProductivityCommand` with a `table`
  //     union — it simply does not export a machine-readable inventory, so this
  //     test cannot cross-check it;
  //   - `learning`, `progress`, `discovery`, `integrations` build no local
  //     command at all, so the routing table is aspirational for them.
  // When one gains an inventory, this list shrinks and the test says so — which
  // is the point. A GROWING list is a regression.
  const withoutInventory = declaredModules().filter((m) => inventoryOf(m) === null);
  assert.deepEqual(
    withoutInventory,
    ['discovery', 'integrations', 'learning', 'productivity', 'progress'],
    'the set of modules without an inventory changed — update this list ' +
      'deliberately (a shrinking list is progress; a growing one is a regression)',
  );
});

test('owner coverage: the routing table is not empty (the test is not vacuous)', () => {
  assert.ok(declaredModules().length >= 8, 'expected at least 8 owner modules');
  assert.ok(Object.keys(OWNER_MODULE_BY_ENTITY).length >= 25, 'expected >=25 owned entities');
});
