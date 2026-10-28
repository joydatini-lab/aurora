// mirror-column-alias.test.ts — the domain↔mirror column divergence guard.
//
// WHY THIS TEST EXISTS
// `TaskCreateCommand.patch` documents `title` (packages/data/src/commands.ts)
// and the domain type `Task` carries `title`
// (packages/domain/src/entities-productivity.ts:13), but BOTH mirror schemas
// name the column `subject`:
//   - packages/data/src/sqlite-schema.ts   → 'subject TEXT NOT NULL'
//   - packages/data/src/powersync-schema.ts → subject: column.text
//   - supabase/migrations/0002_productivity.sql:57 → subject
//
// `SqliteCommandRepository.apply()` normalizes camelCase → snake_case, which
// mapped `title` → `title` — a column that does not exist. A kernel
// `task.create` therefore seeded a row whose `subject` was undefined, i.e. a
// task with no title, with no error raised. Silent data loss.
//
// The pre-existing `single-writer.test.ts` already applies
// `patch: { title: 'Waves' }` but only asserts the row EXISTS — never that the
// title landed in `subject`. That is why the defect was invisible to the gate.
//
// Run: node --experimental-strip-types --no-warnings packages/data/test/mirror-column-alias.test.ts

import {
  InMemoryLocalStore,
  SqliteCommandRepository,
  UpsyncQueue,
} from '../src/index.ts';

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

async function main(): Promise<void> {
  const store = new InMemoryLocalStore();
  const queue = new UpsyncQueue();
  const tasks = new SqliteCommandRepository(store, queue);

  // 1. A kernel `task.create` carrying the DOMAIN field name (`title`)
  //    must land in the MIRROR column (`subject`).
  await tasks.apply('productivity', {
    op: 'task.create',
    id: 'task-alias-1',
    userId: 'u1',
    patch: { title: 'Réviser les dérivées' },
  });

  const row = store.row('tasks', 'task-alias-1');
  check(row !== undefined, 'the row is seeded locally');
  check(
    row?.subject === 'Réviser les dérivées',
    'title lands in the `subject` mirror column (not a phantom `title` column)',
  );
  check(
    row?.title === undefined,
    'no stray `title` column is written on the tasks mirror',
  );

  // 2. The upserted row is exactly the partial intent — no full-entity PUT
  //    (F-03): only the fields the caller named, plus the envelope.
  check(row?.user_id === 'u1', 'the mirror `user_id` column is written');
  check(row?.userId === 'u1', 'the `LocalRow.userId` reference field is kept');
  check(row?.status === undefined, 'a field the caller did not name is not invented');

  // 3. The alias is scoped to `tasks`: another entity carrying a `title`
  //    field must NOT be renamed to `subject`.
  await tasks.apply('knowledge', {
    op: 'resource.update',
    id: 'res-1',
    userId: 'u1',
    patch: { title: 'Article' },
  });
  const resource = store.row('resources', 'res-1');
  check(
    resource?.title === 'Article',
    'the alias does not leak: `title` on another entity stays `title`',
  );
  check(
    resource?.subject === undefined,
    'the alias does not leak: no `subject` invented on another entity',
  );

  // 4. The upsync payload carries the MIRROR column names, so the relay and
  //    the server never see the phantom `title` column either.
  const taskEntry = queue.pending().find((e) => e.id === 'task-alias-1');
  check(taskEntry !== undefined, 'the mutation is queued for upsync');
  const payload = taskEntry?.patch as Record<string, unknown> | undefined;
  check(
    payload?.subject === 'Réviser les dérivées',
    'the queued upsync patch carries `subject`, not `title`',
  );
  check(
    payload?.user_id === 'u1',
    'the queued upsync patch carries the mirror `user_id` column',
  );

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nmirror-column-alias: all checks passed');
}

void main();
