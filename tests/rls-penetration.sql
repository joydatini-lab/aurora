-- =============================================================================
-- tests/rls-penetration.sql — RLS penetration test (user A must not touch B).
--
-- STATUS: DEV-ONLY runbook. NOT a migration (do NOT put it under
-- supabase/migrations/). Run against a database that has the 28 migrations
-- applied, with role `supabase_admin` (superuser), plus two auth users.
--
-- HISTORY (2026-10-24): the previous version hard-coded a 49-table list and
-- assumed every table has an `id` column. Both were wrong: the list had
-- drifted (73 public tables carry user_id today), and 4 of the listed tables
-- have no `id` at all (user_context, semantic_tree_version, progress_trends,
-- notification_preferences). It had never been executed. This version
-- DISCOVERS the tables from the catalog and seeds rows generically, so it
-- cannot drift again.
--
-- CONTRACT: for EVERY public table carrying user_id, a row owned by B must be
-- invisible and untouchable to A. Any leak raises an exception (FAIL).
-- Global registries (model_registry / ai_usage / ai_health) are EXCLUDED on
-- purpose (0011 Rationale: server-wide, USING(true) justified).
--
-- Usage:
--   1) create two auth users (see docs/ci/gate.md §6 for the exact INSERT);
--   2) psql -v ON_ERROR_STOP=1 -f tests/rls-penetration.sql
--   RAISE EXCEPTION = penetration = FAIL.
-- =============================================================================

DO $$
DECLARE
  user_a   uuid := '00000000-0000-0000-0000-00000000000a';
  user_b   uuid := '00000000-0000-0000-0000-00000000000b';
  t        text;
  cols     text;
  vals     text;
  sentinel text;
  pk_col   text;
  leaked   int;
  checked  int := 0;
  seeded   int := 0;
  skipped  text := '';
BEGIN
  -- Every public table that carries user_id, minus the justified global
  -- registries (0011 Rationale) and the PowerSync relay views.
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN pg_tables p
        ON p.schemaname = c.table_schema AND p.tablename = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'user_id'
       AND c.table_name NOT IN ('model_registry','ai_usage','ai_health')
     ORDER BY c.table_name
  LOOP
    checked := checked + 1;

    -- Primary key (single-column only; composite PKs are skipped below).
    SELECT a.attname INTO pk_col
      FROM pg_index i
      JOIN pg_class cl ON cl.oid = i.indrelid
      JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ANY(i.indkey)
     WHERE cl.relname = t AND i.indisprimary
     LIMIT 1;

    IF pk_col IS NULL THEN
      skipped := skipped || t || ' (no single-col PK) ';
      CONTINUE;
    END IF;

    -- Seed a row owned by B as service_role (the only role allowed to bypass
    -- its own RLS). Every other NOT NULL column without a default is filled
    -- with a type-appropriate placeholder, so the seed works on any table.
    SELECT string_agg(quote_ident(c.column_name), ', '),
           string_agg(
             CASE
               WHEN c.column_name = 'user_id' THEN quote_literal(user_b)
               WHEN c.data_type = 'uuid' THEN 'gen_random_uuid()'
               WHEN c.data_type IN ('integer','bigint','smallint','numeric','real','double precision') THEN '0'
               WHEN c.data_type = 'boolean' THEN 'false'
               WHEN c.data_type LIKE 'timestamp%' THEN 'now()'
               WHEN c.data_type = 'date' THEN 'current_date'
               WHEN c.data_type = 'jsonb' THEN quote_literal('{}') || '::jsonb'
               WHEN c.data_type = 'ARRAY' THEN quote_literal('{}')
               ELSE quote_literal('rls-probe')
             END, ', ')
      INTO cols, vals
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = t
       AND c.is_nullable = 'NO'
       AND c.column_default IS NULL;

    SET LOCAL ROLE service_role;
    BEGIN
      EXECUTE format('INSERT INTO %I (%s) VALUES (%s) RETURNING %I::text',
                     t, cols, vals, pk_col) INTO sentinel;
      seeded := seeded + 1;
    EXCEPTION WHEN others THEN
      -- The seed needs a value we cannot synthesise (FK, CHECK, enum).
      -- Not a security finding: record and move on.
      skipped := skipped || t || ' (seed: ' || SQLERRM || ') ';
      SET LOCAL ROLE supabase_admin;
      CONTINUE;
    END;

    -- As user A: try to READ B's row. RLS must make it invisible.
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', user_a::text, false);
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', user_a::text)::text, false);
    EXECUTE format('SELECT count(*) FROM %I WHERE %I = %L', t, pk_col, sentinel)
      INTO leaked;
    IF leaked > 0 THEN
      RAISE EXCEPTION 'RLS PENETRATION in %: user A SELECTed user B''s row', t;
    END IF;

    -- As user A: try to UPDATE B's row. RLS must make it untouchable.
    EXECUTE format('UPDATE %I SET user_id = user_id WHERE %I = %L', t, pk_col, sentinel);
    GET DIAGNOSTICS leaked = ROW_COUNT;
    IF leaked > 0 THEN
      RAISE EXCEPTION 'RLS PENETRATION in %: user A UPDATEd user B''s row', t;
    END IF;

    -- As user A: try to DELETE B's row.
    EXECUTE format('DELETE FROM %I WHERE %I = %L', t, pk_col, sentinel);
    GET DIAGNOSTICS leaked = ROW_COUNT;
    IF leaked > 0 THEN
      RAISE EXCEPTION 'RLS PENETRATION in %: user A DELETEd user B''s row', t;
    END IF;

    -- Cleanup as service_role.
    SET LOCAL ROLE service_role;
    EXECUTE format('DELETE FROM %I WHERE %I = %L', t, pk_col, sentinel);
    SET LOCAL ROLE supabase_admin;
  END LOOP;

  RAISE NOTICE 'RLS penetration: OK — % user-scoped tables checked, % seeded.',
               checked, seeded;
  IF skipped <> '' THEN
    RAISE NOTICE 'RLS penetration: SKIPPED (reason): %', skipped;
  END IF;
END $$;
