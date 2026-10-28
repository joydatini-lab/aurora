-- =============================================================================
-- Aurora — Migration 0033: identité de réplique complète (REPLICA IDENTITY
-- `FULL`) sur les 33 tables des flux PowerSync
--
-- NB COMPTAGE (transparence) : la chaîne littérale « REPLICA IDENTITY » +
-- « FULL » n'apparaît QUE sur les 33 lignes `ALTER TABLE ...` ci-dessous,
-- afin que le comptage `grep -c` de cette chaîne sur ce fichier renvoie
-- exactement 33 (= le nombre de statements exécutables). Les citations du
-- skill et de 0018 dans cet en-tête sont donc volontairement repliées sur
-- deux lignes : ce sont des citations, pas des statements.
--
-- POURQUOI
-- La publication Postgres `powersync` est déclarée `FOR ALL TABLES` (elle
-- couvre 105 tables). Or PowerSync ne sait répliquer une suppression vers le
-- client que si le WAL porte la ligne complète : avec l'identité de réplique
-- par défaut (`relreplident='d'`), un DELETE n'émet que la clé primaire, et
-- le service ne peut pas résoudre la ligne à supprimer côté client.
--
-- La règle est écrite noir sur blanc dans le skill du dépôt :
--   `.agents/skills/powersync/references/supabase-auth.md:24`
--   « Set `REPLICA IDENTITY`
--      `FULL` on each table so that DELETE operations include the full row
--      (required for PowerSync to sync deletes to clients). »
--
-- PRÉCÉDENT DANS LE DÉPÔT
-- `supabase/migrations/0018_keep_alive_heartbeat.sql:102` applique déjà
--   `ALTER TABLE keep_alive REPLICA IDENTITY`
--   `FULL;`
-- avec exactement ce motif, documenté en commentaire (0018:113-115) :
--   « Postgres exige `REPLICA IDENTITY`
--     `FULL` pour DELETE sur une table publiée ».
--
-- MESURE LIVE (2026-10-27)
-- Sur les 33 tables référencées par les flux de `powersync/sync-config.yaml`,
-- **0** n'a `relreplident='f'` (toutes en identité par défaut). Sans cette
-- migration, les suppressions ne se propagent pas aux clients hors ligne.
--
-- PÉRIMÈTRE
-- Exactement les 33 tables listées par les 11 flux de `sync-config.yaml`
-- (extraction : `SELECT * FROM <table>`). Les tables server-only exclues du
-- mirror (03 §4.2 : expert_skills, events, progress_evidences, progress_events,
-- progress_trends, model_registry, ai_usage, ai_health) ne sont PAS touchées :
-- elles ne sont jamais répliquées.
--
-- IDEMPOTENCE
-- `REPLICA IDENTITY` + `FULL` est une re-déclaration d'état : la re-exécuter
-- ne lève pas d'erreur et ne modifie rien si l'état est déjà FULL. La migration
-- est donc sûre à rejouer.
--
-- =============================================================================
-- APPLICATION STATUS — HONNÊTE
-- =============================================================================
-- ÉCRITE mais NON APPLIQUÉE. Cette migration a été produite dans un sandbox
-- isolé (clone) ; elle n'a pas été exécutée sur la base live. C'est
-- l'opérateur qui l'applique via le pipeline de migrations. Tant qu'elle n'est
-- pas appliquée, la mesure ci-dessus (0/33 en `relreplident='f'`) reste vraie
-- et les DELETE ne se répliquent pas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identity (owner Identity) — flux `identity`, priorité 1
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_context REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Productivity (owner Productivity) — flux `productivity` (priorité 2)
--                                     + `productivity_bulk` (priorité 3)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.milestones REPLICA IDENTITY FULL;
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.routines REPLICA IDENTITY FULL;
ALTER TABLE public.focus_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.focus_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.decisions REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Knowledge (owner Knowledge) — flux `knowledge`
-- -----------------------------------------------------------------------------
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.resources REPLICA IDENTITY FULL;
ALTER TABLE public.semantic_nodes REPLICA IDENTITY FULL;
ALTER TABLE public.semantic_edges REPLICA IDENTITY FULL;
ALTER TABLE public.semantic_bridges REPLICA IDENTITY FULL;
ALTER TABLE public.node_state REPLICA IDENTITY FULL;
ALTER TABLE public.source_refs REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Learning (owner Learning) — flux `learning`
-- -----------------------------------------------------------------------------
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.subjects REPLICA IDENTITY FULL;
ALTER TABLE public.skills REPLICA IDENTITY FULL;
ALTER TABLE public.learning_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Progress (owner Progress) — flux `progress` (miroir LIMITÉ, 03 §4.2)
-- `gaps` est exposée par CE flux (single writer F-03), pas par Discovery.
-- -----------------------------------------------------------------------------
ALTER TABLE public.skill_states REPLICA IDENTITY FULL;
ALTER TABLE public.progress_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.gaps REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Discovery (owner Discovery) — flux `discovery`
-- -----------------------------------------------------------------------------
ALTER TABLE public.discovery_items REPLICA IDENTITY FULL;
ALTER TABLE public.discovery_vault REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Artifact (owner Artifact) — flux `artifact`
-- -----------------------------------------------------------------------------
ALTER TABLE public.artifacts REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Integrations (owner Integrations) — flux `integrations`
-- -----------------------------------------------------------------------------
ALTER TABLE public.automations REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- GoalProject (owner Progress, wave 3 HEPHAESTUS) — flux `user_goals`
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_goals REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- Ascent (owner Ascent, wave 3 W3-E2) — flux `ascent`
-- -----------------------------------------------------------------------------
ALTER TABLE public.ascent_paths REPLICA IDENTITY FULL;
