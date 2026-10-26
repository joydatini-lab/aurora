/**
 * Client-schema drift — the guard that would have caught tranche 4 / A.7.
 *
 * `packages/data/src/powersync-schema.ts` is the PowerSync CLIENT schema: the
 * declaration that tells the SDK which synced tables and columns exist. It is
 * consumed by `PowerSyncClientEngine` (`powersync-client.ts`) — the runtime
 * engine. Measured 2026-10-26 against the live database AND the migrations:
 *
 *   - 28 of the 31 mirrored tables declared at least one column that DOES NOT
 *     EXIST in the database, and omitted at least one that does. `habits`
 *     declared `title`/`description`/`active` while the table has
 *     `name`/`target`/`status`/`streak`.
 *   - 2 tables the sync config actually syncs (`focus_profiles`,
 *     `discovery_vault`) were absent from the client schema entirely.
 *
 * Why this is a DEFECT and not a style difference — the official rule:
 *   "If tables/collections not described by the client-side schema are synced,
 *    it is stored internally, but not accessible. Same applies for
 *    columns/fields not described by the client-side schema."
 *   — https://docs.powersync.com/maintenance-ops/implementing-schema-changes
 * So `habits.name` arrives from the relay and is stored, but NO application
 * code can read it; and `habits.title` is declared, so reads return undefined
 * without error. The `/habits` page renders empty titles, silently.
 *
 * Why the existing gate could not see it: every mobile test seeds an
 * `InMemoryLocalStore` with rows shaped like the CLIENT schema, while the relay
 * delivers rows shaped like the DATABASE. The two never met in a test. The
 * PowerSync round-trip test (`powersync-roundtrip.test.ts`) is the only one
 * that would, and it SKIPS without a live relay.
 *
 * The three invariants asserted here:
 *   1. every table the sync config streams is declared in the client schema;
 *   2. every column the client schema declares EXISTS in the migrations;
 *   3. every column the database has (except `id`, which PowerSync creates
 *      itself, and `embedding`, excluded by design — 03 S4.2 / AD-12) is
 *      declared in the client schema.
 *
 * The migration SQL is the reference, not the live database: the repo is the
 * SSoT, and the migrations were verified to match the live catalog on
 * 2026-10-26 for all 33 tables.
 *
 * Run: node --experimental-strip-types --no-warnings tests/db/client-schema-drift.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Columns excluded from the mirror BY DESIGN (03 S4.2 / AD-12). */
const INTENTIONALLY_EXCLUDED: Record<string, string> = {
  embedding:
    '03 S4.2 / AD-12: the vector(768) never reaches the device — retrieval is server-only (F-09)',
};

/** PowerSync auto-creates `id` on every table — never declared. */
const SDK_CREATED = new Set(['id']);

// ---------------------------------------------------------------------------
// Reference 1: the columns the MIGRATIONS define.
// ---------------------------------------------------------------------------
function migrationColumns(): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  const dir = join(ROOT, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');

    const re = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      // Balanced-paren scan: a column default can itself contain parentheses.
      let i = re.lastIndex - 1;
      let depth = 0;
      let end = i;
      for (; i < sql.length; i++) {
        if (sql[i] === '(') depth++;
        else if (sql[i] === ')') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const body = sql.slice(re.lastIndex, end);
      const cols: string[] = [];
      for (const line of body.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('--')) continue;
        // A column line starts with an identifier then a SQL type. Table-level
        // constraints (CONSTRAINT / PRIMARY KEY / UNIQUE / CHECK / FOREIGN) are
        // skipped by requiring a known type token.
        const cm = t.match(
          /^([a-z_][a-z0-9_]*)\s+(uuid|text|int|integer|bigint|boolean|jsonb|timestamptz|timestamp|vector|numeric|smallint|date|real|double|aurora_theme)\b/i,
        );
        if (cm) cols.push(cm[1]!);
        const pk = t.match(/PRIMARY KEY\s*\(([^)]+)\)/);
        if (pk) for (const c of pk[1]!.split(',')) cols.push(c.trim());
      }
      tables.set(m[1]!, [...new Set(cols)]);
    }

    // Late columns (0021 adds two via ALTER TABLE).
    for (const a of sql.matchAll(
      /ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)/g,
    )) {
      const existing = tables.get(a[1]!);
      if (existing && !existing.includes(a[2]!)) existing.push(a[2]!);
    }
  }
  return tables;
}

// ---------------------------------------------------------------------------
// Reference 2: the tables the SYNC CONFIG actually streams (the runtime truth).
// ---------------------------------------------------------------------------
function syncedTables(): string[] {
  const y = readFileSync(join(ROOT, 'powersync', 'sync-config.yaml'), 'utf8');
  const set = new Set<string>();
  for (const m of y.matchAll(/SELECT \* FROM (\w+)/g)) set.add(m[1]!);
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// Subject: the CLIENT schema's declared columns.
// ---------------------------------------------------------------------------
function clientSchema(): Map<string, string[]> {
  const src = readFileSync(
    join(ROOT, 'packages', 'data', 'src', 'powersync-schema.ts'),
    'utf8',
  );
  const out = new Map<string, string[]>();
  const re = /^ {2}(\w+): new Table\(\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const braceStart = src.indexOf('{', m.index + m[0].length - 1);
    let i = braceStart;
    let depth = 0;
    let end = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = src.slice(braceStart, end + 1);
    out.set(
      m[1]!,
      [...body.matchAll(/^\s*(\w+):\s*column\./gm)].map((x) => x[1]!),
    );
  }
  return out;
}

const MIGRATIONS = migrationColumns();
const SYNCED = syncedTables();
const CLIENT = clientSchema();

test('drift: every table the sync config streams is declared in the client schema', () => {
  const missing = SYNCED.filter((t) => !CLIENT.has(t));
  assert.deepEqual(
    missing,
    [],
    `these tables are synced but absent from the client schema, so they are ` +
      `stored on the device and UNREADABLE by any code (PowerSync: "not ` +
      `accessible"): ${missing.join(', ')}`,
  );
});

test('drift: the client schema declares no column the database does not have', () => {
  const problems: string[] = [];
  for (const [table, cols] of CLIENT) {
    const db = MIGRATIONS.get(table);
    if (!db) {
      problems.push(`${table}: declared in the client schema but no CREATE TABLE exists`);
      continue;
    }
    const dbSet = new Set(db);
    const ghosts = cols.filter((c) => !dbSet.has(c) && !SDK_CREATED.has(c));
    if (ghosts.length) {
      problems.push(
        `${table}: declares ${ghosts.join(', ')} — no such column exists, so reads silently return undefined`,
      );
    }
  }
  assert.deepEqual(problems, [], `client schema declares phantom columns:\n  ${problems.join('\n  ')}`);
});

test('drift: the client schema omits no column the database actually mirrors', () => {
  const problems: string[] = [];
  for (const table of SYNCED) {
    const cols = CLIENT.get(table);
    if (!cols) continue; // reported by the first test
    const db = MIGRATIONS.get(table);
    if (!db) continue;
    const declared = new Set(cols);
    const omitted = db.filter(
      (c) => !declared.has(c) && !SDK_CREATED.has(c) && !(c in INTENTIONALLY_EXCLUDED),
    );
    if (omitted.length) {
      problems.push(
        `${table}: omits ${omitted.join(', ')} — synced and stored, but unreadable by the app`,
      );
    }
  }
  assert.deepEqual(problems, [], `client schema omits mirrored columns:\n  ${problems.join('\n  ')}`);
});

test('drift: `embedding` is the ONLY deliberate exclusion, and it is documented', () => {
  // Pinned so a future reader sees the reason rather than "helpfully" adding
  // the vector column to the device mirror (AD-12 / F-09: retrieval is
  // server-only, the embedding never leaves the server).
  assert.deepEqual(Object.keys(INTENTIONALLY_EXCLUDED), ['embedding']);
  assert.match(INTENTIONALLY_EXCLUDED.embedding!, /AD-12/);
  assert.ok(
    MIGRATIONS.get('semantic_nodes')?.includes('embedding'),
    'semantic_nodes must still HAVE the embedding column — the exclusion is client-side only',
  );
});

test('drift: the guard is not vacuous', () => {
  assert.ok(SYNCED.length >= 30, `expected >=30 synced tables, saw ${SYNCED.length}`);
  assert.ok(CLIENT.size >= 30, `expected >=30 client tables, saw ${CLIENT.size}`);
  assert.ok(
    (MIGRATIONS.get('habits') ?? []).includes('name'),
    'the migrations must still define habits.name',
  );
});
