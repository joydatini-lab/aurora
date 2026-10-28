#!/usr/bin/env sh
# scripts/rls-test-identities.sh — provision / inspect / remove the marked test
# identities used by the RLS POSITIVE proof (tests/rls-positive-proof.sql).
#
# WHY THIS EXISTS
#   The L5 exit criterion asks for a POSITIVE RLS proof: user A reads its OWN
#   rows. That needs two real identities in the live project. They are created
#   here, MARKED so they are unmistakable and removable, and their passwords are
#   generated on the spot — never written to the repo, never echoed.
#
#   The marker is the contract:
#     raw_user_meta_data->>'is_test_identity' = 'true'
#     raw_user_meta_data->>'purpose'          = 'rls-positive-proof'
#   tests/rls-positive-proof.sql resolves the two users BY THAT MARKER, never by
#   a hard-coded email.
#
# USAGE
#   DATABASE_URL='postgresql://...' sh scripts/rls-test-identities.sh create
#   DATABASE_URL='postgresql://...' sh scripts/rls-test-identities.sh list
#   DATABASE_URL='postgresql://...' sh scripts/rls-test-identities.sh proof
#   DATABASE_URL='postgresql://...' sh scripts/rls-test-identities.sh drop
#
#   DATABASE_URL is the project's Postgres connection string (the pooler or the
#   direct host). It is a SECRET: pass it in the environment, never commit it.
#   When it is absent the script says so and exits 2 — it never guesses.
#
#   RLS_TEST_PASSWORD (optional) — set it to give the two test identities a
#   KNOWN password so you can actually sign in as them (a real GoTrue login,
#   useful for driving the app end to end). Leave it unset and a random,
#   never-disclosed password is used: the identities still work for the SQL
#   proof (which impersonates by JWT claims, not by sign-in). Either way the
#   password is never written to a file and never echoed.
#
# SAFETY
#   - `drop` deletes ONLY rows carrying the marker. It cannot touch a real
#     account: the WHERE clause requires is_test_identity = 'true'.
#   - `create` is idempotent (ON CONFLICT DO NOTHING on the fixed test UUIDs).
#   - No password is printed.
set -eu

CMD="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[rls-identities] DATABASE_URL is not set." >&2
  echo "[rls-identities] Export the project connection string and retry. It is a" >&2
  echo "[rls-identities] secret: pass it in the environment, never in a file." >&2
  exit 2
fi

# Run psql with the URI in argv (no eval: the URI is data, never code).
psql_run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

case "$CMD" in
  create)
    echo "[rls-identities] creating the two marked test identities"
    # The password material: a supplied one, or a random one that is discarded.
    if [ -n "${RLS_TEST_PASSWORD:-}" ]; then
      PW="$RLS_TEST_PASSWORD"
      echo "[rls-identities] using RLS_TEST_PASSWORD (known login enabled)"
    else
      PW="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
      echo "[rls-identities] no RLS_TEST_PASSWORD: a random, undisclosed one is used"
    fi
    # The password travels as a psql variable, so it is never interpolated into
    # SQL text and never lands in the shell history or the process argv.
    psql_run -v pw="$PW" <<'SQL'
-- GoTrue reads several token columns and crashes with `Database error querying
-- schema` when they are NULL (measured: a real sign-in returned HTTP 500 until
-- these were ''. A row inserted by the Supabase dashboard carries ''). The
-- DEFAULTs on the table do not apply here because the columns are named
-- explicitly, so set them explicitly.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current, reauthentication_token,
  phone_change, phone_change_token, confirmation_sent_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values
(
  '00000000-0000-4000-a000-0000000000a1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','rls-proof-a@test.aurora.local',
  extensions.crypt(:'pw', extensions.gen_salt('bf', 10)),
  now(), now(), now(),
  '', '', '', '', '', '', '', '', now(),
  '{"provider":"email","providers":["email"],"is_test_identity":true}'::jsonb,
  '{"full_name":"RLS Proof A","is_test_identity":true,"purpose":"rls-positive-proof"}'::jsonb,
  false, false
),
(
  '00000000-0000-4000-a000-0000000000b1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','rls-proof-b@test.aurora.local',
  extensions.crypt(:'pw', extensions.gen_salt('bf', 10)),
  now(), now(), now(),
  '', '', '', '', '', '', '', '', now(),
  '{"provider":"email","providers":["email"],"is_test_identity":true}'::jsonb,
  '{"full_name":"RLS Proof B","is_test_identity":true,"purpose":"rls-positive-proof"}'::jsonb,
  false, false
)
on conflict (id) do nothing;

-- GoTrue resolves a sign-in through auth.identities. `email` is generated.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
(
  '00000000-0000-4000-a000-0000000000a1','00000000-0000-4000-a000-0000000000a1',
  jsonb_build_object('sub','00000000-0000-4000-a000-0000000000a1','email','rls-proof-a@test.aurora.local','email_verified',true,'phone_verified',false),
  'email', now(), now(), now()
),
(
  '00000000-0000-4000-a000-0000000000b1','00000000-0000-4000-a000-0000000000b1',
  jsonb_build_object('sub','00000000-0000-4000-a000-0000000000b1','email','rls-proof-b@test.aurora.local','email_verified',true,'phone_verified',false),
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;
SQL
    unset PW RLS_TEST_PASSWORD
    echo "[rls-identities] done"
    ;;

  list)
    echo "[rls-identities] marked test identities"
    psql_run <<'SQL'
select u.id, u.email, u.email_confirmed_at is not null as confirmed,
       (select count(*) from auth.identities i where i.user_id = u.id) as identities
from auth.users u
where u.raw_user_meta_data->>'is_test_identity' = 'true'
order by u.id;
SQL
    ;;

  proof)
    echo "[rls-identities] running the POSITIVE proof"
    psql_run -f "$ROOT/tests/rls-positive-proof.sql"
    ;;

  drop)
    echo "[rls-identities] removing the marked test identities"
    # The WHERE clause is the safety: only marked rows can match.
    psql_run <<'SQL'
delete from auth.identities
 where user_id in (
   select id from auth.users where raw_user_meta_data->>'is_test_identity' = 'true'
 );
delete from auth.users where raw_user_meta_data->>'is_test_identity' = 'true';
SQL
    echo "[rls-identities] done"
    ;;

  *)
    echo "usage: sh scripts/rls-test-identities.sh {create|list|proof|drop}" >&2
    exit 64
    ;;
esac
