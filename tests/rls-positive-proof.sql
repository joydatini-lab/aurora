-- tests/rls-positive-proof.sql — RLS POSITIVE proof (the open L5 exit criterion).
--
-- The penetration test (rls-penetration.sql) proves the NEGATIVE: user A
-- cannot read/write user B's rows. It never proves the POSITIVE: user A CAN
-- read/write its OWN rows. A policy that denies EVERYTHING passes the negative
-- test perfectly — so the negative test alone cannot distinguish "isolated"
-- from "broken". This file closes that hole.
--
-- Run as a superuser (supabase_admin) against a database carrying every
-- migration. It impersonates the two marked test identities by setting the
-- JWT claims GoTrue would set, exactly as rls-penetration.sql does.
--
--   psql ... -f tests/rls-positive-proof.sql
--
-- Preconditions:
--   - auth.users holds the two marked test identities
--     (raw_user_meta_data->>'is_test_identity' = 'true').
--   - The tables under test have RLS ENABLED and FORCED.

-- The insert shape per probe: the columns NOT NULL with no default. Kept in
-- one place so a schema change surfaces here, not as a silent SKIP.
create temporary table if not exists rls_positive_probe (
  probe text primary key,
  payload jsonb
);
insert into rls_positive_probe values
  ('canvas_sessions', '{"title":"rls-positive-proof"}'::jsonb),
  -- `kind` carries a CHECK (0007); 'image' is the valid member closest to a
  -- Design Space deliverable (a LOGO is an image Artifact).
  ('artifacts',       '{"kind":"image"}'::jsonb),
  ('projects',        '{"name":"rls-positive-proof"}'::jsonb),
  ('tasks',           '{"subject":"rls-positive-proof"}'::jsonb)
on conflict (probe) do nothing;

create temporary table if not exists rls_positive_result (
  probe text, written uuid, a_reads_own int, b_sees_it int, verdict text
);
truncate rls_positive_result;

do $$
declare
  user_a   uuid;
  user_b   uuid;
  a_rows   int;
  b_rows   int;
  written  uuid;
  probe    text;
  payload  jsonb;
  keys     text;
  vals     text;
  k        text;
  checked  int := 0;
begin
  -- Resolve the two marked test identities by their MARKER, never by a
  -- hard-coded email: the marker is the contract.
  select id into user_a from auth.users
   where raw_user_meta_data->>'is_test_identity' = 'true'
     and raw_user_meta_data->>'purpose' = 'rls-positive-proof'
   order by id limit 1;
  select id into user_b from auth.users
   where raw_user_meta_data->>'is_test_identity' = 'true'
     and raw_user_meta_data->>'purpose' = 'rls-positive-proof'
   order by id desc limit 1;

  if user_a is null or user_b is null or user_a = user_b then
    raise exception 'RLS POSITIVE: the two marked test identities are missing (a=%, b=%)', user_a, user_b;
  end if;
  raise notice 'RLS POSITIVE: user A = %, user B = %', user_a, user_b;

  for probe, payload in select p.probe, p.payload from rls_positive_probe p order by p.probe loop
    -- Only tables that exist and are user-scoped.
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = probe and column_name = 'user_id'
    ) then
      raise notice 'RLS POSITIVE: SKIP % (no user_id column)', probe;
      continue;
    end if;

    -- Build `insert into <probe> (user_id, <payload keys>) select $1, r.<key>…`.
    keys := 'user_id';
    vals := '$1';
    for k in select jsonb_object_keys(payload) loop
      keys := keys || format(', %I', k);
      vals := vals || format(', r.%I', k);
    end loop;

    -- As user A: write a row A owns. RLS must ALLOW this.
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', user_a::text, false);
    perform set_config('request.jwt.claims', json_build_object('sub', user_a::text)::text, false);
    begin
      execute format(
        'insert into %I (%s) select %s from jsonb_populate_record(null::%I, $2) r returning id',
        probe, keys, vals, probe
      ) into written using user_a, payload;
    exception when others then
      raise exception 'RLS POSITIVE FAILED in %: user A cannot INSERT its own row: %', probe, sqlerrm;
    end;

    -- As user A: read it back. RLS must ALLOW this — THIS is the positive.
    execute format('select count(*) from %I where user_id = $1', probe)
      into a_rows using user_a;
    if a_rows < 1 then
      raise exception 'RLS POSITIVE FAILED in %: user A cannot read its OWN row', probe;
    end if;

    -- As user B: A's row must stay invisible (the negative, re-checked here
    -- so the two halves are proven in the same pass).
    perform set_config('request.jwt.claim.sub', user_b::text, false);
    perform set_config('request.jwt.claims', json_build_object('sub', user_b::text)::text, false);
    execute format('select count(*) from %I where id = $1', probe)
      into b_rows using written;
    if b_rows > 0 then
      raise exception 'RLS POSITIVE FAILED in %: user B sees A''s row', probe;
    end if;

    -- Cleanup as the table owner.
    reset role;
    execute format('delete from %I where id = $1', probe) using written;

    insert into rls_positive_result values (
      probe, written, a_rows, b_rows,
      case when a_rows >= 1 and b_rows = 0 then 'PASS' else 'FAIL' end
    );

    checked := checked + 1;
  end loop;

  if checked = 0 then
    raise exception 'RLS POSITIVE: nothing was checked — the proof is vacuous';
  end if;
end $$;

-- The verdict, as a result set so a runner can assert on it.
select probe, a_reads_own, b_sees_it, verdict from rls_positive_result order by probe;
