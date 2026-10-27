-- =============================================================================
-- Aurora — Migration 0029: auto-confirmation des comptes (fonctions live-only)
--
-- POURQUOI CETTE MIGRATION
-- La base live portait 3 fonctions que le dépôt n'avait jamais versionnées
-- (constat N5 du plan directeur v1, tranche 2 lot 2.1). Deux d'entre elles
-- implémentent une décision produit d'owner (2026-10-07) : « usage personnel,
-- pas de confirmation email — aucun domaine payant ». Tant qu'elles ne vivent
-- que dans la base, un `db reset` les efface en silence et toute nouvelle
-- inscription casse : le compte reste non confirmé et l'utilisateur ne peut
-- pas se connecter.
--
-- VERSIONNÉ ICI (2 fonctions + leurs triggers) :
--   public.auto_confirm_new_user()      → trigger AFTER INSERT ON auth.users
--   public.auto_confirm_email_identity() → trigger BEFORE INSERT ON auth.identities
--
-- VOLONTAIREMENT NON VERSIONNÉ (1 fonction) :
--   public.rls_auto_enable() + l'event trigger `ensure_rls`.
--   Ce n'est PAS du code Aurora : c'est la recette officielle Supabase
--   « Auto-enable RLS for new tables », reproduite VERBATIM (doc
--   https://supabase.com/docs/guides/database/postgres/row-level-security
--   § "Auto-enable RLS for new tables"). Elle est maintenue par la plateforme
--   et cohabite avec les autres event triggers gérés par Supabase
--   (`pgrst_ddl_watch`, `issue_pg_cron_access`, `grant_pg_net_access`, …).
--   La versionner ici la figerait et entrerait en conflit avec la plateforme
--   à chaque évolution. Le lot 2.1 du plan disait « versionner les 3 » :
--   c'était une erreur, corrigée ici.
--
-- POURQUOI SECURITY DEFINER
-- Les triggers écrivent dans `auth.users` / `auth.identities`, dont le
-- propriétaire est `supabase_auth_admin`, pas le rôle qui exécute
-- l'inscription. Sans SECURITY DEFINER, l'écriture serait refusée (42501).
-- `SET search_path TO ''` est l'hygiène recommandée pour une fonction
-- SECURITY DEFINER : aucun chemin implicite ne peut détourner un nom non
-- qualifié (les corps ci-dessous qualifient tout : `auth.users`, `now()`,
-- `jsonb_set`, `coalesce` sont tous dans `pg_catalog` ou explicitement
-- schématisés).
--
-- RÉVOCATION DES DROITS D'EXÉCUTION
-- Ces fonctions ne doivent JAMAIS être appelables via l'API REST. Les
-- advisors Supabase les remontaient comme exécutables par `anon`
-- (SECURITY DEFINER exécutable par un rôle anonyme = surface d'attaque).
-- Un trigger n'a pas besoin de droit EXECUTE pour s'exécuter : on révoque
-- donc tout, pour `PUBLIC` et pour les rôles d'API.
--
-- IDEMPOTENT : `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS`.
-- La base live a déjà ces objets (les triggers y tournent, 4/4 utilisateurs
-- confirmés) — cette migration les rend simplement rejouables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Confirmation automatique à la création d'un compte
-- ---------------------------------------------------------------------------
-- Idempotent si GoTrue confirme déjà (email_confirm via l'admin API) : les
-- deux UPDATE sont gardés par un prédicat, donc rejouer ne réécrit rien.
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Auto-confirmation (décision owner 10-07 : usage personnel, pas de
  -- confirmation email — aucun domaine payant) : le user GoTrue est créé
  -- confirmé ; l'identité email est marquée vérifiée.
  UPDATE auth.users
  SET email_confirmed_at = now(),
      phone_confirmed_at = now()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;

  UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email_verified}', 'true')
  WHERE user_id = NEW.id
    AND provider = 'email'
    AND COALESCE(identity_data ->> 'email_verified', 'false') <> 'true';

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_confirm_new_user ON auth.users;
CREATE TRIGGER auto_confirm_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- ---------------------------------------------------------------------------
-- 2. Marquage de l'identité email à l'insertion de l'identité
-- ---------------------------------------------------------------------------
-- Voie complémentaire : selon le chemin d'inscription, GoTrue insère
-- l'identité AVANT ou APRÈS le user. Ce trigger BEFORE INSERT couvre le cas
-- où l'identité arrive après que le user a été créé (le trigger n°1 a alors
-- déjà tourné et ne verra jamais cette identité).
CREATE OR REPLACE FUNCTION public.auto_confirm_email_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.provider = 'email' THEN
    NEW.identity_data := jsonb_set(NEW.identity_data, '{email_verified}', 'true');
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_confirm_email_identity ON auth.identities;
CREATE TRIGGER auto_confirm_email_identity
  BEFORE INSERT ON auth.identities
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email_identity();

-- ---------------------------------------------------------------------------
-- 3. Fermer la surface d'appel REST (advisors : SECURITY DEFINER + anon)
-- ---------------------------------------------------------------------------
-- Un trigger s'exécute avec les droits de son propriétaire, pas via EXECUTE.
-- Révoquer ne casse donc rien et retire deux fonctions privilégiées de la
-- portée d'un appelant anonyme.
REVOKE ALL ON FUNCTION public.auto_confirm_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_confirm_email_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_confirm_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_confirm_email_identity() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- APPLICATION STATUS
-- ---------------------------------------------------------------------------
-- Appliquée live le 2026-10-25 via le MCP (supabase_migrations.schema_migrations
-- version 20261025000029). État vérifié après application :
--   - auth.users.email_confirmed_at existe et 4/4 utilisateurs sont confirmés ;
--   - les 2 triggers sont présents (pg_trigger, non-internes) ;
--   - les 2 fonctions ont prosecdef = true et search_path = '' ;
--   - EXECUTE révoqué pour PUBLIC / anon / authenticated.
-- `rls_auto_enable` + `ensure_rls` restent hors migration (infrastructure
-- Supabase, cf. l'en-tête).
-- =============================================================================
