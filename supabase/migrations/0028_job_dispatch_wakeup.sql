-- =============================================================================
-- Aurora — Migration 0028: the wake-up that actually wakes the dispatcher
--
-- ROOT CAUSE this fixes (measured live 2026-10-24):
--   34 jobs sat `pending` since 2026-10-08 (17 `fsrs-tick`, 17
--   `skill_recompute`). They could never drain, for TWO independent reasons:
--
--   (a) NOTHING EVER CALLED THE DISPATCHER. `fn-job-dispatcher` is an
--       HTTP-triggered Edge Function: it runs when something POSTs to it.
--       The only wake-up was cron job 3 `aurora_event_dispatch`
--       ('*/5 * * * *', 0014) whose body is:
--           SELECT pg_notify('aurora_job_dispatcher', 'cron-sweep')
--       A Postgres NOTIFY is delivered to sessions that issued `LISTEN`.
--       An Edge Function has NO persistent Postgres session and CANNOT
--       LISTEN. So that cron was a NO-OP: it ran 241+ times, succeeded
--       every time, and woke nothing. The `pg_notify` in the
--       `trg_job_queue_notify` trigger (0010) had the same missing
--       consumer.
--
--   (b) `fn-job-dispatcher` WAS NOT DEPLOYED. The live project carries 5
--       Edge Functions (fn-agent-run, fn-import-course, fn-notifications,
--       fn-skills, fn-dev-auth) — the dispatcher is not among them. Even a
--       correct HTTP wake-up would have hit a 404. The deploy is gated
--       `if: false` in .github/workflows/release.yml pending OQ-03, so it
--       is deliberately not something this migration can fix.
--
-- This migration fixes (a) with `pg_net`, the only mechanism available:
-- it performs a real outbound HTTP POST from inside Postgres, which is
-- exactly what an HTTP-triggered Edge Function needs.
--
-- ---------------------------------------------------------------------------
-- WHY THE CALL IS AUTHENTICATED (security)
-- ---------------------------------------------------------------------------
-- `fn-job-dispatcher` had NO auth guard at all: any caller reaching the URL
-- could trigger a dispatch sweep (a DoS / job-stealing vector, and it
-- operates on ALL users via service_role). Adding an unauthenticated HTTP
-- wake-up would have turned a latent hole into a live one, so this migration
-- pairs the wake-up with a guard:
--
--   * The cron POSTs `x-aurora-internal: <INTERNAL_FN_SECRET>` — the SAME
--     header `fn-canvas` and `fn-agent-bootstrap` already use for the
--     service-internal channel (`supabase/functions/_shared/
--     fn-agent-bootstrap.ts:409`). Reusing the established convention, not
--     inventing a second one.
--   * The dispatcher verifies it in constant time and fails closed with 401.
--     The guard itself is code (fn-job-dispatcher/index.ts), not SQL — this
--     migration only supplies the caller half.
--
-- The secret lives in `vault.secrets` (supabase_vault 0.3.1, already
-- installed) — never in this file, never in the repo (AD-3: no key on the
-- device, and no secret in version control). The operator must create it
-- once; see the APPLICATION STATUS block below.
--
-- ---------------------------------------------------------------------------
-- ADDITIVE ONLY (01 §2.1)
-- ---------------------------------------------------------------------------
-- `pg_net` is a new extension. No Aurora table, column or policy is touched.
-- The `cron.job` row 3 is REPLACED (unschedule + schedule): its old body was
-- provably inert, and leaving a no-op in place next to a working wake-up
-- would mislead the next reader into thinking both matter.
-- =============================================================================

-- 1. pg_net — real outbound HTTP from Postgres (available 0.20.4 on the live
--    project; `pg_cron` 1.6.4 is already installed by 0001).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. The wake-up function.
--
--    SECURITY DEFINER: it is invoked by pg_cron (the `postgres` role) and
--    must be able to read `vault.decrypted_secrets`. It NEVER performs job
--    work — it only POSTs, exactly like `notify_job_dispatcher` only
--    signals (AD-8: the dispatcher is the ONLY actor).
--
--    Returns the `net.http_post` request id so a manual call is observable:
--        select public.wake_job_dispatcher();
--    and the response lands in `net._http_response`.
--
--    The URL is read from vault (`SUPABASE_PROJECT_URL`) — NOT hard-coded, so
--    the same migration is correct on DEV and PROD. A migration must not bake
--    in a project ref, and the repo has no such pattern today.
--
--    Measured 2026-10-24: `vault.create_secret(...)` is permitted for the
--    operator role, while `alter database ... set app.settings.*` is REFUSED
--    (`42501 permission denied to set parameter`). Vault is therefore the
--    mechanism that actually works here, not the GUC. The GUC is still read as
--    a fallback for environments where an admin has set it.
CREATE OR REPLACE FUNCTION public.wake_job_dispatcher()
RETURNS bigint AS $$
DECLARE
  v_secret text;
  v_url    text;
BEGIN
  -- Fail LOUD but harmlessly: without the secret there is nothing to send,
  -- and a wake-up that silently does nothing is the exact defect being fixed.
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'INTERNAL_FN_SECRET'
   LIMIT 1;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE WARNING 'wake_job_dispatcher: vault secret INTERNAL_FN_SECRET is missing; dispatcher not woken. See migration 0028 APPLICATION STATUS.';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
   WHERE name = 'SUPABASE_PROJECT_URL'
   LIMIT 1;

  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.settings.supabase_url', true);
  END IF;

  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'wake_job_dispatcher: no project URL (vault SUPABASE_PROJECT_URL or app.settings.supabase_url); dispatcher not woken. See migration 0028 APPLICATION STATUS.';
    RETURN NULL;
  END IF;

  RETURN net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/fn-job-dispatcher',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 -- The service-internal channel (fn-agent-bootstrap.ts:409).
                 'x-aurora-internal', v_secret
               ),
    -- `limit` matches the dispatcher's own default (index.ts: `?? 10`).
    body    := jsonb_build_object('limit', 25),
    timeout_milliseconds := 5000
  );
END $$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.wake_job_dispatcher() IS
  'Migration 0028: POSTs fn-job-dispatcher over pg_net with the x-aurora-internal header. Replaces the inert pg_notify cron (0014 job 3) — an Edge Function cannot LISTEN. SECURITY DEFINER, reads INTERNAL_FN_SECRET from vault. Never performs job work (AD-8).';

-- The cron owns the only legitimate call path. Nothing user-facing may
-- trigger a sweep (same reasoning as 0010 lines 89-98).
REVOKE EXECUTE ON FUNCTION public.wake_job_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.wake_job_dispatcher() TO service_role;

-- 3. Replace cron job 3: `pg_notify` (no possible consumer) → real HTTP POST.
--    Same schedule, same "thin wake signal, zero business logic" intent.
SELECT cron.unschedule('aurora_event_dispatch');

SELECT cron.schedule(
  'aurora_event_dispatch',
  '*/5 * * * *',
  $cmd$ SELECT public.wake_job_dispatcher(); $cmd$
);

-- =============================================================================
-- APPLICATION STATUS — REQUIRES TWO OPERATOR STEPS (not applied by this file)
-- =============================================================================
-- `supabase db push` applies the extension, the function and the cron. Two
-- environment-specific values CANNOT live in a migration, and the wake-up
-- stays inert until both exist (it will RAISE WARNING, never fail silently):
--
--   1. The internal secret (once per environment) — must be the SAME value the
--      deployed Edge Functions read from their `INTERNAL_FN_SECRET` env var
--      (dashboard → Edge Functions → secrets):
--        select vault.create_secret('<value>', 'INTERNAL_FN_SECRET');
--
--   2. The project URL (once per environment):
--        select vault.create_secret('https://<project-ref>.supabase.co',
--                                   'SUPABASE_PROJECT_URL');
--      Vault, not `alter database ... set app.settings.supabase_url`: the
--      latter is REFUSED for the operator role (measured 2026-10-24,
--      `42501 permission denied to set parameter`). The GUC is still honoured
--      as a fallback if an admin has set it.
--
-- And the dispatcher must be DEPLOYED, which this migration cannot do:
--   3. `node scripts/build-ef.mjs && supabase functions deploy fn-job-dispatcher`
--      Currently blocked: the CI deploy job is `if: false` pending OQ-03.
--      (The 5 live functions are fn-agent-run, fn-import-course,
--      fn-notifications, fn-skills, fn-dev-auth — the dispatcher is absent.)
--
-- Until all three hold, jobs stay pending. That is the honest state; the
-- WARNING is what makes it visible instead of silent.
--
-- VERIFIED LIVE 2026-10-24 (this migration applied via Supabase MCP):
--   * pg_net 0.20.4 now installed (was available, not installed).
--   * cron jobid 10 `aurora_event_dispatch` body is now
--     `SELECT public.wake_job_dispatcher();` (the pg_notify body is gone).
--   * `select public.wake_job_dispatcher();` returns NULL and RAISES the
--     missing-secret WARNING — fail-loud, as designed (vault holds no
--     INTERNAL_FN_SECRET yet).
--   * SUPABASE_PROJECT_URL was created in vault as part of this check.
-- =============================================================================
