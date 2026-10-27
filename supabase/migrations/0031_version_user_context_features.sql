-- =============================================================================
-- Aurora — Migration 0031: versionner `user_context.features` (colonne live-only)
--
-- POURQUOI
-- La garde `tests/db/live-only-functions.test.ts` (tranche 2) compare le dépôt à
-- la base. Étendue aux COLONNES le 2026-10-26, elle a trouvé exactement un objet
-- live-only sur les 65 tables de `public` : `user_context.features jsonb NOT NULL
-- DEFAULT '{}'::jsonb`. Elle apparaît dans AUCUNE migration.
--
-- POURQUOI CE N'EST PAS UN DÉTAIL
-- `features` n'est pas une colonne morte :
--   - `apps/mobile/src/lib/user-context-client.ts:58` la lit par REST
--     (`.select('user_id, features')`) et l'écrit (`.upsert({ …, features })`) ;
--   - `apps/mobile/src/main.tsx:131` en dépend pour résoudre la feature-registry.
-- Un `db reset` — ou un environnement neuf (CI, staging, poste) — recréerait la
-- base SANS cette colonne. Toutes les lectures `features` renverraient alors une
-- erreur PostgREST « column does not exist », et le seul symptôme serait un
-- feature-flag qui retombe sur ses défauts : panne silencieuse, exactement la
-- classe de défaut que la tranche 2 a fermée pour les fonctions.
--
-- POURQUOI `ADD COLUMN IF NOT EXISTS` ET NON `CREATE TABLE`
-- La colonne existe DÉJÀ en production. Cette migration ne doit rien changer en
-- production (elle est idempotente et sans effet) ; elle existe pour qu'une base
-- reconstruite depuis le dépôt soit identique à la production. C'est la même
-- logique que 0029 pour les triggers auto-confirm : on versionne un état de fait
-- pour que `git` et la base racontent la même histoire.
--
-- Le type est repris à l'identique du catalogue live (vérifié 2026-10-26) :
-- jsonb, NOT NULL, DEFAULT '{}'::jsonb — la carte `{ calendar: false, … }` que
-- documente `user-context-client.ts:10`.
--
-- ADDITIF : ne modifie aucune table existante au-delà de l'ajout idempotent.
-- =============================================================================

ALTER TABLE user_context
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_context.features IS
  'Feature-registry overrides per user (`{ calendar: false, … }`). Read/written '
  'by apps/mobile/src/lib/user-context-client.ts (REST) and consumed by '
  'apps/mobile/src/main.tsx. Versioned in 0031 after the column-drift guard '
  'found it live-only (it existed in production but in no migration).';
