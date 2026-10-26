/**
 * Live-only DB functions — the guard against un-versioned database objects.
 *
 * Measured 2026-10-24: the live database carried 3 functions the repository
 * had never versioned. A `db reset` would have erased them in silence, and
 * every subsequent signup would break — the GoTrue user stays unconfirmed and
 * the user cannot log in. Nothing in the gate could see it: the static RLS
 * scan reads migrations (it cannot miss what is absent), and no test compared
 * the live catalog to the repo.
 *
 * This test asserts the two invariants that were violated:
 *
 *   1. The Aurora auto-confirm functions + their triggers ARE versioned, and
 *      their EXECUTE is revoked (they are SECURITY DEFINER; a trigger needs no
 *      EXECUTE grant to fire, so revoking costs nothing and removes two
 *      privileged functions from anonymous reach).
 *
 *   2. Every SECURITY DEFINER function the repo defines has a frozen
 *      `search_path`. The advisor `function_search_path_mutable` flagged 3
 *      functions, one of which was debt introduced by migration 0028. A
 *      SECURITY DEFINER function with a caller-dependent search_path is a
 *      privilege-escalation vector, not a style nit.
 *
 * It also PINS the deliberate non-versioning of `rls_auto_enable` +
 * `ensure_rls`: those are the official Supabase recipe for auto-enabling RLS,
 * reproduced verbatim and maintained by the platform. Someone "finishing the
 * job" by versioning them would freeze platform infrastructure and fight it on
 * every upgrade. The plan itself said "version the 3" — that was wrong.
 *
 * Run: node --experimental-strip-types --no-warnings tests/db/live-only-functions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

/** All migration SQL, concatenated (a definition may live in any of them). */
function allMigrations(): string {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .join('\n');
}

test('db: the auto-confirm functions are versioned (they existed live only)', () => {
  const sql = allMigrations();

  for (const fn of ['auto_confirm_new_user', 'auto_confirm_email_identity']) {
    assert.match(
      sql,
      new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(\\)`),
      `${fn} is NOT versioned — a db reset would erase it and break every signup`,
    );
  }

  // The triggers are what make the functions do anything. Versioning the
  // function without its trigger leaves a reset silently inoperative — the
  // worst outcome, because it looks versioned.
  assert.match(
    sql,
    /CREATE TRIGGER auto_confirm_new_user\s+AFTER INSERT ON auth\.users/,
    'the auto_confirm_new_user trigger is not versioned (AFTER INSERT ON auth.users)',
  );
  assert.match(
    sql,
    /CREATE TRIGGER auto_confirm_email_identity\s+BEFORE INSERT ON auth\.identities/,
    'the auto_confirm_email_identity trigger is not versioned (BEFORE INSERT ON auth.identities)',
  );
});

test('db: the auto-confirm functions are not reachable over the REST API', () => {
  const sql = allMigrations();
  for (const fn of ['auto_confirm_new_user', 'auto_confirm_email_identity']) {
    assert.match(
      sql,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${fn}\\(\\) FROM anon, authenticated`,
      ),
      `${fn} is SECURITY DEFINER and still executable by anon/authenticated ` +
        'via /rest/v1/rpc/ — revoke EXECUTE (a trigger fires without it)',
    );
  }
});

test('db: every SECURITY DEFINER function freezes its search_path', () => {
  const sql = allMigrations();

  // The three functions the advisor flagged. All three must carry an explicit
  // `SET search_path`. `wake_job_dispatcher` was introduced by 0028 and fixed
  // by 0030 — its absence here would mean the debt came back.
  const hardened = [
    'set_updated_at',
    'notify_job_dispatcher',
    'wake_job_dispatcher',
  ];
  for (const fn of hardened) {
    // The LAST definition wins in a migration sequence: 0028 defined
    // `wake_job_dispatcher` WITHOUT a frozen search_path and 0030 redefined it
    // with one. Taking the first occurrence would assert against the
    // superseded definition and report a fixed defect as still present.
    const at = sql.lastIndexOf(`CREATE OR REPLACE FUNCTION public.${fn}()`);
    assert.ok(at > -1, `the definition of ${fn} was not found in any migration`);
    const block = sql.slice(at, at + 2000);
    assert.match(
      block,
      /SET search_path TO/,
      `${fn} has a mutable search_path (advisor lint 0011). A SECURITY DEFINER ` +
        'function with a caller-dependent search_path is a privilege-escalation ' +
        "vector: an unqualified name resolves against the caller's schema.",
    );
  }
});

test('db: rls_auto_enable stays UN-versioned (it is Supabase infrastructure)', () => {
  const sql = allMigrations();

  // The official Supabase recipe "Auto-enable RLS for new tables" + its event
  // trigger. Reproduced verbatim by the platform, sitting beside the
  // platform's own event triggers (pgrst_ddl_watch, issue_pg_cron_access,
  // grant_pg_net_access, …). Versioning it would freeze platform
  // infrastructure; the plan's "version the 3" was wrong for this one.
  assert.doesNotMatch(
    sql,
    /CREATE OR REPLACE FUNCTION public\.rls_auto_enable\(\)/,
    'rls_auto_enable must NOT be versioned — it is the Supabase platform ' +
      'recipe (docs: row-level-security § "Auto-enable RLS for new tables"), ' +
      'not Aurora code. Freezing it fights the platform on every upgrade. ' +
      'If you believe this changed, update the plan first, not just this test.',
  );
  assert.doesNotMatch(
    sql,
    /CREATE EVENT TRIGGER ensure_rls/,
    'the ensure_rls event trigger is platform-managed — do not version it',
  );

  // The decision must be RECORDED, so a future reader finds the reason
  // instead of "helpfully" versioning it.
  assert.match(
    sql,
    /rls_auto_enable/,
    'the deliberate exclusion of rls_auto_enable must be documented in a migration',
  );
});
