#!/usr/bin/env sh
# scripts/rls-live-check.sh — RLS live verification (Phase 0 exit gate).
#
# The static gate (scripts/check-rls.sh) proves the SHAPE of the policies:
# every user-scoped table has RLS enabled, FORCEd, and a user_id predicate.
# It cannot prove the policies actually ISOLATE two real users. That is what
# this script does, on a real Postgres carrying the 28 migrations.
#
#   ./scripts/rls-live-check.sh
#
# It spins up supabase/postgres (the same image family as the live project,
# so auth/cron/vault/vector all exist), applies every migration in order,
# creates two auth users, runs tests/rls-penetration.sql, then runs the SAME
# test with RLS disabled on one table — a negative control proving the test
# can fail. A test that only ever passes proves nothing.
#
# Requires: docker. No credentials, no network to Supabase.
set -eu

IMAGE="supabase/postgres:15.8.1.085"
C="aurora-rls-check-$$"
PSQL="psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() { docker rm -f "$C" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

echo "[rls-live] starting $IMAGE"
docker run -d --name "$C" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
i=0
until docker exec "$C" pg_isready -U postgres >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -gt 60 ] && { echo "[rls-live] FAIL: db never became ready"; exit 1; }
  sleep 2
done

# pg_isready can succeed on the unix socket before TCP accepts connections.
i=0
until docker exec -e PGPASSWORD=postgres "$C" \
        psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc 'select 1' >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -gt 60 ] && { echo "[rls-live] FAIL: TCP never became ready"; exit 1; }
  sleep 2
done

echo "[rls-live] applying migrations"
n=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  docker exec -i -e PGPASSWORD=postgres "$C" $PSQL < "$f"
  n=$((n+1))
done
echo "[rls-live] $n migrations applied"

echo "[rls-live] creating two auth users"
docker exec -i -e PGPASSWORD=postgres "$C" $PSQL <<'SQL'
insert into auth.users (id, email, instance_id, aud, role, confirmed_at, created_at, updated_at)
values
 ('00000000-0000-0000-0000-00000000000a','a@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), now()),
 ('00000000-0000-0000-0000-00000000000b','b@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), now())
on conflict (id) do nothing;
SQL

echo "[rls-live] running the penetration test"
docker exec -i -e PGPASSWORD=postgres "$C" $PSQL < "$ROOT/tests/rls-penetration.sql"

echo "[rls-live] negative control: disable RLS on tasks, expect a FAIL"
docker exec -e PGPASSWORD=postgres "$C" \
  psql -h 127.0.0.1 -U supabase_admin -d postgres -q \
  -c "alter table tasks disable row level security"
if docker exec -i -e PGPASSWORD=postgres "$C" $PSQL < "$ROOT/tests/rls-penetration.sql" 2>&1 \
   | grep -q 'RLS PENETRATION'; then
  echo "[rls-live] negative control OK — the test detects a missing policy"
else
  echo "[rls-live] FAIL: the negative control did NOT trip. The test is blind."
  exit 1
fi

echo "[rls-live] OK"
