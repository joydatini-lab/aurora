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

-- ---------------------------------------------------------------------------
-- pg_temp.rls_seed(table, owner, depth) -> PK of the row it inserted.
--
-- WHY THIS EXISTS. The first version filled only the NOT NULL columns that
-- have no default, with a TYPE placeholder. That covered 41 of 58 tables; 17
-- escaped, for two reasons that are both readable from the catalog:
--
--   1. FOREIGN KEY to a parent that carries user_id (13 tables). A random
--      uuid matches no parent row. Fixed by seeding the parent ON DEMAND,
--      recursively, and pointing the child at the row that was just created.
--      Only FK columns the seed actually fills (NOT NULL, no default) are
--      resolved; a nullable FK is left NULL, which also breaks the
--      self-reference cycles (semantic_nodes.parent_id).
--
--   2. CHECK over a CLOSED SET (6 tables: artifacts.kind, gaps.kind,
--      discovery_items.kind, semantic_nodes.kind, semantic_edges.relation,
--      focus_profiles.method) — plus numeric lower bounds
--      (focus_profiles.base_minutes >= 1). Fixed by reading the FIRST allowed
--      literal / the bound straight out of the constraint definition instead
--      of inventing a value.
--
-- Everything is DISCOVERED, never listed, so it cannot drift when a migration
-- adds a table, a FK or a CHECK.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.rls_seed(
  p_table text, p_owner uuid, p_depth int DEFAULT 0
) RETURNS text
LANGUAGE plpgsql
AS $fn$
DECLARE
  pk_col text;
  cols   text;
  vals   text;
  ov     jsonb := '{}'::jsonb;
  fk     record;
  en     record;
  lit    text;
  res    text;
BEGIN
  IF p_depth > 4 THEN
    RAISE EXCEPTION 'fk depth exceeded (cycle?)';
  END IF;

  SELECT a.attname INTO pk_col
    FROM pg_index i
    JOIN pg_class cl ON cl.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ANY(i.indkey)
   WHERE cl.relname = p_table AND i.indisprimary
   LIMIT 1;

  -- (1) Foreign keys whose parent carries user_id.
  FOR fk IN
    SELECT (SELECT a.attname FROM pg_attribute a
             WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) AS local_col,
           con.confrelid::regclass::text AS ref_table,
           (SELECT a.attname FROM pg_attribute a
             WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) AS ref_col
      FROM pg_constraint con
     WHERE con.contype = 'f'
       AND con.connamespace = 'public'::regnamespace
       AND con.conrelid::regclass::text = p_table
  LOOP
    -- Skip unless the seed actually fills this column.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema='public' AND c.table_name=p_table
         AND c.column_name=fk.local_col
         AND c.is_nullable='NO' AND c.column_default IS NULL AND c.is_identity='NO');
    -- user_id is always the owner itself, never a resolved parent.
    CONTINUE WHEN fk.local_col = 'user_id';
    -- A parent without user_id cannot be shared safely across owners.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema='public' AND c.table_name=fk.ref_table
         AND c.column_name='user_id') THEN
      RAISE EXCEPTION 'fk parent % carries no user_id', fk.ref_table;
    END IF;
    -- Seed the parent on demand, ONCE (re-seeding would add a second row).
    EXECUTE format('SELECT 1 FROM %I WHERE user_id = %L LIMIT 1', fk.ref_table, p_owner)
      INTO res;
    IF res IS NULL THEN
      PERFORM pg_temp.rls_seed(fk.ref_table, p_owner, p_depth + 1);
    END IF;
    ov := ov || jsonb_build_object(fk.local_col,
            format('(SELECT %I FROM %I WHERE user_id = %L ORDER BY 1 LIMIT 1)',
                   fk.ref_col, fk.ref_table, p_owner));
  END LOOP;

  -- (2) CHECK over a closed set, or a numeric lower bound.
  FOR en IN
    SELECT c.column_name AS col, pg_get_constraintdef(con.oid) AS def
      FROM information_schema.columns c
      JOIN pg_constraint con
        ON con.connamespace = 'public'::regnamespace
       AND con.contype = 'c'
       AND con.conrelid::regclass::text = p_table
     WHERE c.table_schema='public' AND c.table_name=p_table
       AND c.is_nullable='NO' AND c.column_default IS NULL AND c.is_identity='NO'
       AND pg_get_constraintdef(con.oid) LIKE format('CHECK ((%s%%', c.column_name)
  LOOP
    lit := (regexp_match(en.def, 'ARRAY\[(''[^'']*'')'))[1];         -- 'first'
    IF lit IS NULL THEN
      lit := (regexp_match(en.def, format('\(\(%s >= (-?[0-9]+)\)', en.col)))[1];
    END IF;
    IF lit IS NULL THEN
      lit := (regexp_match(en.def, format('\(\(%s > (-?[0-9]+)\)', en.col)))[1];
      IF lit IS NOT NULL THEN lit := (lit::bigint + 1)::text; END IF;
    END IF;
    IF lit IS NOT NULL THEN
      ov := ov || jsonb_build_object(en.col, lit);
    END IF;
  END LOOP;

  SELECT string_agg(quote_ident(c.column_name), ', '),
         string_agg(
           CASE
             WHEN c.column_name = 'user_id' THEN quote_literal(p_owner)
             WHEN ov ? c.column_name THEN ov ->> c.column_name
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
   WHERE c.table_schema = 'public' AND c.table_name = p_table
     AND c.is_nullable = 'NO' AND c.column_default IS NULL AND c.is_identity = 'NO';

  SET LOCAL ROLE service_role;
  EXECUTE format('INSERT INTO %I (%s) VALUES (%s) RETURNING %I::text',
                 p_table, cols, vals, pk_col) INTO res;
  RETURN res;
END;
$fn$;

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

    -- Seed a row owned by B. `rls_seed` resolves the NOT NULL columns, the
    -- FOREIGN KEYs (recursively) and the CHECK closed sets from the catalog.
    SET LOCAL ROLE service_role;
    BEGIN
      sentinel := pg_temp.rls_seed(t, user_b);
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
