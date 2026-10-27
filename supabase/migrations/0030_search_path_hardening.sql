-- =============================================================================
-- Aurora — Migration 0030: search_path figé sur les fonctions de la chaîne de jobs
--
-- POURQUOI
-- L'advisor Supabase `function_search_path_mutable` (lint 0011) remontait 3
-- fonctions `public` sans `search_path` figé :
--   public.set_updated_at()        (0001)  — trigger BEFORE UPDATE, partout
--   public.notify_job_dispatcher() (0010)  — trigger AFTER INSERT job_queue
--   public.wake_job_dispatcher()   (0028)  — le réveil pg_net
--
-- Une fonction dont le `search_path` dépend du rôle appelant peut être
-- détournée : un appelant qui place un schéma à lui en tête du chemin fait
-- résoudre un nom non qualifié vers SA fonction. Ici les corps sont
-- SECURITY DEFINER (deux sur trois), donc l'élévation de privilèges est
-- réelle, pas théorique.
--
-- La 3e est de la dette que j'ai introduite moi-même dans 0028 : je la
-- corrige ici plutôt que de la laisser au lot N7 (tranche 4). Corriger sa
-- propre dette n'est pas du hors-périmètre.
--
-- POURQUOI `SET search_path TO ''` ET RIEN D'AUTRE
-- Les trois corps qualifient déjà tout ce qui doit l'être :
--   set_updated_at        : `now()`            → pg_catalog
--   notify_job_dispatcher : `pg_notify`        → pg_catalog
--   wake_job_dispatcher   : `vault.decrypted_secrets`, `net.http_post`,
--                           `jsonb_build_object`, `rtrim`, `current_setting`
--                           → tous qualifiés ou dans pg_catalog
-- Un `search_path` VIDE est donc le plus strict qui préserve le comportement :
-- aucun schéma implicite ne peut être détourné. Les références qualifiées
-- continuent de fonctionner (elles n'ont pas besoin du search_path, seulement
-- du privilège USAGE sur le schéma, que le propriétaire a).
--
-- Les corps sont reproduits à l'identique — seule la clause `SET search_path`
-- est ajoutée. `CREATE OR REPLACE` ne change donc aucun comportement.
--
-- IDEMPOTENT : `CREATE OR REPLACE` + re-émission des REVOKE/GRANT (un
-- remplacement de fonction ne doit jamais laisser l'ACL dans un état supposé).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. set_updated_at (0001) — trigger BEFORE UPDATE sur toutes les tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$function$;

-- ---------------------------------------------------------------------------
-- 2. notify_job_dispatcher (0010) — le signal d'insertion de job
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_job_dispatcher() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- SECURITY DEFINER: this function is run by the inserting role (service_role
  -- or a policy-scoped user insert) and signals the dispatcher. It NEVER
  -- executes job work — only wakes fn-job-dispatcher via a Postgres NOTIFY.
  PERFORM pg_notify('aurora_job_dispatcher', NEW.id);
  RETURN NEW;
END
$function$;

-- L'ACL est ré-affirmée (mêmes bornes que 0010) : le trigger est le seul
-- chemin légitime, jamais `/rest/v1/rpc/notify_job_dispatcher`.
REVOKE EXECUTE ON FUNCTION public.notify_job_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_job_dispatcher() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. wake_job_dispatcher (0028) — le réveil HTTP de la chaîne de jobs
-- ---------------------------------------------------------------------------
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
END $$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO '';

COMMENT ON FUNCTION public.wake_job_dispatcher() IS
  'Migration 0028 (search_path figé par 0030): POSTs fn-job-dispatcher over pg_net with the x-aurora-internal header. Replaces the inert pg_notify cron (0014 job 3) — an Edge Function cannot LISTEN. SECURITY DEFINER, reads INTERNAL_FN_SECRET from vault. Never performs job work (AD-8).';

REVOKE EXECUTE ON FUNCTION public.wake_job_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.wake_job_dispatcher() TO service_role;

-- ---------------------------------------------------------------------------
-- APPLICATION STATUS
-- ---------------------------------------------------------------------------
-- Appliquée live le 2026-10-25 via le MCP. Après application, l'advisor
-- `function_search_path_mutable` (lint 0011) ne remonte plus AUCUNE de ces
-- 3 fonctions (3 → 0). Les corps sont inchangés (aucun comportement modifié) ;
-- les ACL sont ré-affirmées à l'identique.
-- =============================================================================
