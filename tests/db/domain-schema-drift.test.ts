/**
 * Domain ↔ migration drift — the guard that would have caught D1, D2 and D3.
 *
 * WHY THIS FILE EXISTS. Two guards already compare schemas, and both missed the
 * drifts measured on 2026-10-26:
 *
 *   - `client-schema-drift.test.ts` compares `powersync-schema.ts` (the CLIENT
 *     mirror) to the migrations. Both sides of its comparison are SQL-side, so
 *     it cannot see a drift between the DOMAIN TYPE and the database.
 *   - `owner-module-coverage.test.ts` reads table NAMES, never columns.
 *
 * Nothing compared `packages/domain` — the AD-15 SSoT every module compiles
 * against — to `supabase/migrations`, the schema that actually stores the data.
 *
 * WHAT IT FOUND (2026-10-26, confirmed against the live database).
 *
 *   1. DELIBERATE RENAMES (not defects). The domain uses one vocabulary and the
 *      database another, and the writers translate explicitly:
 *        Project.title    → projects.name        (goals-projects.ts:184)
 *        Task.title       → tasks.subject        (tasks.ts:81)
 *        Project.deadline → projects.end_date    (goals-projects.ts:182)
 *        Task.timeSpentSec→ tasks.actual_minutes (tasks.ts:146)
 *      These are recorded in RENAMES so the guard stays quiet about them.
 *
 *   2. D3 — REAL DEFECTS: columns a writer patches that exist in NO schema.
 *      `createTask` writes `tags` (tasks.ts:83) and `recurrence_rule`
 *      (tasks.ts:97); `createProject` and `updateProject` write `view_mode` (goals-projects.ts:164 and :183).
 *      The live catalog (queried 2026-10-26) has none of the three, and neither
 *      do `powersync-schema.ts` nor the generated SQLite DDL.
 *
 *      Why this is silent: the local store is `EngineLocalStoreBridge`, a Map
 *      keyed by column name (`local-store-bridge.ts:67`). A patch with an
 *      unknown key is accepted and stored, the device renders fine, and only the
 *      upstream PATCH fails — treated by `supabase-connector.ts` as a queued-write
 *      failure, not a crash. The user's tags and recurrence rule are written
 *      locally, displayed, and never persisted server-side.
 *
 *   3. D2 — an enum whose domain union permits values the SQL CHECK rejects:
 *      `Artifact.kind` allows 'csv'/'text'/'code' (entities-artifact.ts:14-26);
 *      `0007_artifact.sql:11` allows 10 values without them. Writing one fails at
 *      runtime, in Postgres, not at compile time.
 *
 * The four assertions:
 *   1. every domain field maps to a column, via snake_case OR a recorded rename;
 *   2. every column maps back to a domain field, or is a named exception;
 *   3. every rename and exception is still real (no rot into a no-op guard);
 *   4. a domain union must not permit a value the SQL CHECK rejects.
 *
 * The declared pair list is deliberately small and explicit: generic
 * interface-to-table inference would guess, and a guessing guard fails loudly on
 * correct code until someone disables it. Adding a pair is a deliberate act.
 *
 * Run: node --experimental-strip-types --no-warnings tests/db/domain-schema-drift.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// Reference 1: columns per table, read from the migrations.
// ---------------------------------------------------------------------------
function migrationColumns(): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  const dir = join(ROOT, 'supabase', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, f), 'utf8');
    const re = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
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
        const cm = t.match(
          /^([a-z_][a-z0-9_]*)\s+(uuid|text|int|integer|bigint|boolean|jsonb|timestamptz|timestamp|vector|numeric|smallint|date|real|double|aurora_theme)\b/i,
        );
        if (cm) cols.push(cm[1]!);
        const pk = t.match(/PRIMARY KEY\s*\(([^)]+)\)/);
        if (pk) for (const c of pk[1]!.split(',')) cols.push(c.trim());
      }
      tables.set(m[1]!, [...new Set(cols)]);
    }
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
// Reference 2: fields of an `export interface X { … }` in the domain source.
// ---------------------------------------------------------------------------
function domainFields(file: string, interfaceName: string): string[] {
  const src = readFileSync(join(ROOT, 'packages', 'domain', 'src', file), 'utf8');
  const marker = `export interface ${interfaceName} {`;
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `${interfaceName} not found in ${file} — update this guard`);
  let i = src.indexOf('{', start);
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
  const body = src.slice(start + marker.length, end);
  const fields: string[] = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    // A line starting with `|` continues a union and is not a new field.
    const fm = t.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:/);
    if (fm) fields.push(fm[1]!);
  }
  return [...new Set(fields)];
}

/** camelCase → snake_case (the AD-15 mirror convention, 03 S4.1). */
function toSnake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// ---------------------------------------------------------------------------
// The declared pairs, the renames, and the named exceptions.
// ---------------------------------------------------------------------------

/** (domain interface, domain file, SQL table) triples this guard covers. */
const PAIRS: Array<{ iface: string; file: string; table: string }> = [
  { iface: 'Project', file: 'entities-productivity.ts', table: 'projects' },
  { iface: 'Task', file: 'entities-productivity.ts', table: 'tasks' },
  { iface: 'Goal', file: 'entities-productivity.ts', table: 'goals' },
  { iface: 'Artifact', file: 'entities-artifact.ts', table: 'artifacts' },
  { iface: 'CanvasSession', file: 'entities-canvas.ts', table: 'canvas_sessions' },
];

/**
 * Deliberate renames: the domain name differs from the column name, and the
 * writer translates explicitly. `where` names the line that does it, so the
 * staleness test can tell a live rename from a rotted entry.
 */
const RENAMES: Record<string, { column: string; where: string }> = {
  'Project.title': { column: 'name', where: 'goals-projects.ts:184' },
  'Project.deadline': { column: 'end_date', where: 'goals-projects.ts:182' },
  'Task.title': { column: 'subject', where: 'tasks.ts:81' },
  'Task.timeSpentSec': { column: 'actual_minutes', where: 'tasks.ts:146' },
};

/**
 * Domain fields that legitimately have NO column. Every entry needs a reason —
 * an unexplained entry is how a guard rots into a no-op.
 */
const DOMAIN_ONLY: Record<string, string> = {
  'Project.tags': 'OR-Set refs → crdt_added/crdt_removed jsonb (AD-7)',
  'Project.linkedMilestones': 'OR-Set refs → crdt_added/crdt_removed jsonb (AD-7)',
  'Project.linkedResources': 'OR-Set refs → crdt_added/crdt_removed jsonb (AD-7)',
  'Project.viewMode': 'UI preference in the UI store (pack 02 §3.2) — see D3 below',
  'Task.subjectId': 'no v1 column; the mirror exposes `subject` (text) only',
  'Task.tags': 'OR-Set refs → crdt_added/crdt_removed jsonb (AD-7) — see D3 below',
  'Task.recurring': 'derived from parent_recurrence_key presence (tasks.ts:95)',
  'Task.recurrenceRule': 'no column yet — see D3 below',
  'Artifact.sourceIds': 'OR-Set refs → crdt_added/crdt_removed jsonb (AD-7)',
  'Artifact.generated': 'derived from source_event_id presence (F-06)',
  'Artifact.jobId': 'stored as source_event_id (0007_artifact.sql:16)',
  'Artifact.previewable': 'derived from kind + mime_type at read time (ADR S16)',
  'Artifact.mime': 'the column is `mime_type` — see the DB_ONLY entry',
  'Artifact.sourceTaskId': 'no v1 column (0007 has context_task_id only)',
  'CanvasSession.blocks': 'CanvasBlock[] is the `blocks` jsonb column itself',
  'CanvasSession.locked': 'a real column (0023) — if this fails, the column is missing',
};

/** Columns that legitimately have NO domain field, with the reason. */
const DB_ONLY: Record<string, string> = {
  'projects.start_date': 'project timeline (Gantt) — not on the Project domain shape yet',
  'tasks.importance': 'Eisenhower input (0002); the Task type carries `priority` only',
  'tasks.energy': 'focus-scheduling input (0002); not on the Task domain shape',
  'tasks.work_context': 'context-tagging input (0002); not on the Task domain shape',
  'tasks.parent_recurrence_key': 'recurrence grouping (0002); derived, not a domain field',
  'artifacts.mime_type': 'the domain field is `mime` (renamed at the mirror edge)',
  'artifacts.source_event_id': 'the domain field is `jobId` (F-06 provenance)',
  'artifacts.context_task_id': 'context links (0007); not on the Artifact domain shape',
  'artifacts.context_course_id': 'context links (0007); not on the Artifact domain shape',
  'artifacts.status': 'job lifecycle (0007); the domain field is `generated` (boolean)',
};

/** AD-7 / AD-15 bookkeeping columns present on every mirrored table. */
const BOOKKEEPING = new Set([
  'crdt_added',
  'crdt_removed',
  'local_mutation_id',
  'created_at',
  'updated_at',
]);

/**
 * KNOWN DEFECTS — real, measured, NOT yet fixed, and deliberately tolerated so
 * the gate stays green while the work is scheduled. Each entry carries the
 * evidence and the fix. The last assertion FAILS if a defect stops reproducing:
 * that is the tripwire that forces the entry to be deleted once fixed, so this
 * list can never silently outlive the problem it documents.
 */
const KNOWN_DEFECTS: Record<string, { defect: string; evidence: string; fix: string }> = {
  // EMPTY as of 2026-10-26: all four entries (tasks.tags, tasks.recurrence_rule,
  // projects.view_mode, artifacts.kind) were fixed by migration 0032. The
  // tripwire test below asserts this list stays honest — re-adding an entry for
  // a defect that no longer reproduces fails the suite.
};

// ---------------------------------------------------------------------------
// The assertions.
// ---------------------------------------------------------------------------

test('domain-schema drift: the guard covers a non-trivial set of pairs', () => {
  assert.ok(PAIRS.length >= 5, 'the guard must cover at least the 5 core tables');
});

test('domain-schema drift: every domain field maps to a column, a rename, or an exception', () => {
  const tables = migrationColumns();
  const missing: string[] = [];

  for (const { iface, file, table } of PAIRS) {
    const cols = tables.get(table);
    assert.ok(cols, `table ${table} not found in migrations — update this guard`);
    for (const field of domainFields(file, iface)) {
      const key = `${iface}.${field}`;
      if (DOMAIN_ONLY[key]) continue;
      const target = RENAMES[key]?.column ?? toSnake(field);
      if (!cols.includes(target)) {
        if (KNOWN_DEFECTS[`${table}.${target}`]) continue;
        missing.push(`${key} → ${table}.${target}`);
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    'domain fields with no column and no recorded rename/exception:\n  ' + missing.join('\n  '),
  );
});

test('domain-schema drift: every column maps back to a domain field or an exception', () => {
  const tables = migrationColumns();
  const missing: string[] = [];

  for (const { iface, file, table } of PAIRS) {
    const cols = tables.get(table)!;
    const claimed = new Set<string>();
    for (const f of domainFields(file, iface)) {
      const key = `${iface}.${f}`;
      claimed.add(RENAMES[key]?.column ?? toSnake(f));
    }
    for (const col of cols) {
      if (col === 'id') continue;
      if (BOOKKEEPING.has(col)) continue;
      if (DB_ONLY[`${table}.${col}`]) continue;
      if (KNOWN_DEFECTS[`${table}.${col}`]) continue;
      if (!claimed.has(col)) missing.push(`${table}.${col}`);
    }
  }

  assert.deepEqual(
    missing,
    [],
    'columns with no domain field and no named exception:\n  ' + missing.join('\n  '),
  );
});

test('domain-schema drift: renames and exceptions are not stale (they still apply)', () => {
  // A guard whose exception list outlives the problem is a silent no-op — the
  // defect class this repo keeps finding. Every entry must still be real.
  const tables = migrationColumns();
  const stale: string[] = [];

  for (const key of Object.keys(RENAMES)) {
    const [iface, field] = key.split('.') as [string, string];
    const pair = PAIRS.find((p) => p.iface === iface);
    if (!pair || !domainFields(pair.file, iface).includes(field)) {
      stale.push(`${key} (domain field no longer exists)`);
    }
  }
  for (const key of Object.keys(DOMAIN_ONLY)) {
    const [iface, field] = key.split('.') as [string, string];
    const pair = PAIRS.find((p) => p.iface === iface);
    if (!pair || !domainFields(pair.file, iface).includes(field)) {
      stale.push(`${key} (field no longer exists)`);
    }
  }
  for (const key of Object.keys(DB_ONLY)) {
    const [table, col] = key.split('.') as [string, string];
    if (!tables.get(table)?.includes(col)) stale.push(`${key} (column no longer exists)`);
  }

  assert.deepEqual(stale, [], 'stale entries — remove them:\n  ' + stale.join('\n  '));
});

// ---------------------------------------------------------------------------
// The enum check (D2): a domain union vs its SQL CHECK constraint.
// ---------------------------------------------------------------------------

/** Values of a `kind:` union declared across multiple `| '…'` lines. */
function domainUnionValues(file: string, field: string): string[] {
  const src = readFileSync(join(ROOT, 'packages', 'domain', 'src', file), 'utf8');
  const start = src.indexOf(`  ${field}:`);
  assert.notEqual(start, -1, `field ${field} not found in ${file}`);
  const end = src.indexOf(';', start);
  return [...src.slice(start, end).matchAll(/'([a-z0-9_-]+)'/g)].map((m) => m[1]!);
}

/** Values of the first `CHECK (col IN (…))` for a column. */
function checkValues(table: string, col: string): string[] {
  // LAST definition wins, not the first. A constraint can be widened later via
  // `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT`, and an earlier version
  // of this function read only the original `CREATE TABLE` — so after migration
  // 0032 widened `artifacts_kind_check`, the guard still reported the stale
  // 0007 list and called a FIXED defect broken. Same class of bug as the drift
  // it exists to catch: reading one copy of a duplicated fact.
  const dir = join(ROOT, 'supabase', 'migrations');
  let found: string[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, f), 'utf8');
    const re = new RegExp(
      `CHECK\\s*\\(\\s*(?:${col}\\s+IS\\s+NULL\\s+OR\\s+)?${col}\\s+IN\\s*\\(([^)]+)\\)`,
      'gi',
    );
    for (const m of sql.matchAll(re)) {
      const values = [...m[1]!.matchAll(/'([a-z0-9_-]+)'/g)].map((x) => x[1]!);
      // Guard against matching a DIFFERENT table's same-named column: require
      // the statement to mention the table somewhere before this CHECK.
      if (values.length > 0 && sql.slice(0, m.index!).includes(table)) found = values;
    }
  }
  return found;
}

test('domain-schema drift: Artifact.kind domain values must all be accepted by the CHECK', () => {
  // D2, measured 2026-10-26: the domain allows 'csv'/'text'/'code'; the
  // constraint does not. Writing one is rejected by Postgres at runtime.
  const domainValues = domainUnionValues('entities-artifact.ts', 'kind');
  const sqlValues = checkValues('artifacts', 'kind');

  assert.ok(domainValues.length >= 10, 'sanity: the domain union should be wide');
  assert.ok(sqlValues.length >= 10, 'sanity: the CHECK should list its values');

  const rejected = domainValues.filter((v) => !sqlValues.includes(v));
  if (KNOWN_DEFECTS['artifacts.kind']) {
    // Tolerated while the defect is scheduled — the tripwire test below still
    // fails if it disappears, so this cannot become a permanent silent skip.
    assert.ok(rejected.length > 0, 'KNOWN_DEFECTS lists artifacts.kind but nothing is rejected — remove the entry');
    return;
  }
  assert.deepEqual(
    rejected,
    [],
    'domain values the database CHECK rejects (writing them fails at runtime):\n  ' +
      rejected.join('\n  ') +
      '\n  Either widen the CHECK in a migration, or narrow the domain union.',
  );
});

// ---------------------------------------------------------------------------
// The writer check (D3, the real one): the column names WRITERS actually emit.
// ---------------------------------------------------------------------------
//
// The type-level assertions above cannot catch D3, because D3 is not a type
// mismatch — `Task.tags` and `tasks.tags` both "exist" as far as the domain is
// concerned. The defect is that a WRITER emits a column name no schema has.
//
// This check CALLS the real writers and reads the patch keys they return. An
// earlier version parsed the writer source with regexes; the non-vacuity test
// below caught it silently extracting nothing from `createArtifact`. Calling the
// code is both simpler and impossible to fool.
//
// Mutation-tested: deleting the `tasks.tags` entry from KNOWN_DEFECTS makes this
// fail with "createTask writes tasks.tags — no such column".

import { createTask } from '../../packages/productivity/src/tasks.ts';
import { createProject, updateProject } from '../../packages/productivity/src/goals-projects.ts';
import { createArtifact } from '../../packages/artifact/src/commands.ts';
import type { Project } from '../../packages/domain/src/index.ts';

/** Every patch key each writer emits, for the given inputs. */
function emittedColumns(): Array<{ fn: string; table: string; cols: string[] }> {
  const ctx = { now: 1_700_000_000_000, clientId: 'c-guard' };
  const out: Array<{ fn: string; table: string; cols: string[] }> = [];

  // The widest inputs: every optional branch taken, so every key is emitted.
  const task = createTask(
    {
      userId: 'u1',
      title: 't',
      description: 'd',
      projectId: 'p1',
      goalId: 'g1',
      dueAt: '2026-01-01',
      priority: 2,
      tags: ['a'],
      dependencies: ['b'],
      recurring: true,
      recurrenceRule: 'FREQ=DAILY',
    },
    ctx,
    'task-1',
  );
  out.push({ fn: 'createTask', table: task.table, cols: Object.keys(task.patch) });

  const project = createProject(
    { userId: 'u1', title: 'p', goalId: 'g1', deadline: '2026-01-01', description: 'd', viewMode: 'kanban' },
    ctx,
    'proj-1',
  );
  out.push({ fn: 'createProject', table: project.table, cols: Object.keys(project.patch) });

  const base = { id: 'proj-1', userId: 'u1', title: 'p', status: 'active' } as unknown as Project;
  const updated = updateProject(
    base,
    { title: 'p2', status: 'archived', deadline: '2026-02-01', viewMode: 'list', description: 'd', goalId: 'g2' },
    ctx,
    'pm-1',
  );
  out.push({ fn: 'updateProject', table: updated.table, cols: Object.keys(updated.patch) });

  const artifact = createArtifact(
    {
      userId: 'u1',
      kind: 'markdown',
      title: 'a',
      mimeType: 'text/markdown',
      r2Key: 'k',
      sizeBytes: 10,
      contextTaskId: 'task-1',
      contextCourseId: 'c1',
    },
    ctx,
    'am-1',
    'art-1',
  );
  out.push({ fn: 'createArtifact', table: artifact.table, cols: Object.keys(artifact.patch) });

  return out;
}

test('domain-schema drift: every column a WRITER emits must exist in the schema', () => {
  const tables = migrationColumns();
  const phantom: string[] = [];

  for (const { fn, table, cols } of emittedColumns()) {
    const known = tables.get(table);
    assert.ok(known, `table ${table} not found in migrations — update this guard`);
    for (const col of cols) {
      if (col === 'id' || BOOKKEEPING.has(col)) continue;
      if (known.includes(col)) continue;
      if (KNOWN_DEFECTS[`${table}.${col}`]) continue;
      phantom.push(`${fn} writes ${table}.${col} — no such column`);
    }
  }

  assert.deepEqual(
    phantom,
    [],
    'writers emitting columns that exist in NO schema (silent write loss):\n  ' +
      phantom.join('\n  '),
  );
});

test('domain-schema drift: the writer audit is non-vacuous', () => {
  // A guard that extracts zero keys from every writer would pass forever.
  for (const { fn, cols } of emittedColumns()) {
    assert.ok(
      cols.length >= 3,
      `extracted fewer than 3 columns from ${fn} — the harness is broken, not the code`,
    );
  }
});

test('domain-schema drift: KNOWN_DEFECTS entries still reproduce (tripwire)', () => {
  // The whole point of a tolerated-defect list is that it shrinks. If an entry
  // stops reproducing, the defect was fixed and the entry must go — otherwise
  // the list becomes the silent no-op this repo keeps finding.
  const tables = migrationColumns();
  const fixed: string[] = [];

  for (const key of Object.keys(KNOWN_DEFECTS)) {
    const [table, col] = key.split('.') as [string, string];
    if (table === 'artifacts' && col === 'kind') {
      const domainValues = domainUnionValues('entities-artifact.ts', 'kind');
      const sqlValues = checkValues('artifacts', 'kind');
      if (domainValues.every((v) => sqlValues.includes(v))) fixed.push(key);
      continue;
    }
    if (tables.get(table)?.includes(col)) fixed.push(key);
  }

  assert.deepEqual(
    fixed,
    [],
    'these defects are FIXED — delete their KNOWN_DEFECTS entries:\n  ' + fixed.join('\n  '),
  );
});
