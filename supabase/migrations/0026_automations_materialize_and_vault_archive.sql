-- =============================================================================
-- Aurora — Migration 0026: automations last_run_at + discovery_vault archived
-- (M-41/M-42, plan S4 veille 2026-10-17)
--
-- ADDITIF ONLY (01 §2.1: le schéma Aurora est additif sur l'instance
-- partagée) — deux colonnes, pas de nouvelle table :
--
--  1. `automations.last_run_at` (timestamptz NULL) — la minute du
--     dernier tick cron MATÉRIALISÉ (M-42 : le matérialiseur lit cette
--     colonne pour savoir si une automation est « due » ce tick —
--     `last_run_at < tick minute` ou NULL = jamais couru → due).
--     La write est service_role (l'EF fn-integrations, verb
--     `materialize_due_automations`) — le ticker cron reste le
--     SEUL trigger source (AD-8 : Cron + Postgres NOTIFY, 0010).
--
--  2. `discovery_vault.archived` (boolean NOT NULL DEFAULT false) —
--     le gel G2 (figé 10/14, plan 2026-10-17 §G2) : une
--     `delete_automation` ARCHIVE le vault (flag `archived: true`),
--     elle ne le détruit PAS (jamais de DROP, pas de `vault_archives`
--     row — le flag additif est la suture la plus simple ; 1 vault /
--     programme, le chat-agent croise les vaults ARCHIVÉS en
--     READ-ONLY comme les autres).
--
-- RLS (01 §2.2) : les policies EXISTANTES bornent les nouvelles colonnes
-- (same-table : aucune nouvelle policy nécessaire — les colonnes
-- héritent de `user_isolation` + `service_role` de la table). Pas de
-- policy permissive (supabase-mcp.md : bornage user_id requis).
-- =============================================================================

-- 1. `automations.last_run_at` (M-42, matérialiseur idempotent AD-8)
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

COMMENT ON COLUMN automations.last_run_at IS
  'M-42 (plan S4 veille 2026-10-17) : la minute du dernier tick cron '
  'matérialisé par le matérialiseur (fn-integrations verb '
  'materialize_due_automations, service_role). NULL = jamais couru. '
  'Le tick suivant est « due » si last_run_at < minute du tick courant. '
  'AD-8 : le dedup reste la clé (kind|automationId|minute) — cette '
  'colonne est un indice de ligue, pas la source d''idempotence.';

-- 2. `discovery_vault.archived` (M-41, gel G2 : archivage pas destruction)
ALTER TABLE discovery_vault
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN discovery_vault.archived IS
  'M-41 (gel G2, plan S4 veille 2026-10-17) : true quand la '
  'delete_automation du programme a couru — le vault est ARCHIVÉ '
  '(conservé, READ-ONLY pour le chat-agent), JAMAIS détruit. La write '
  'est service_role (l''EF fn-integrations, l''archiver M-41) ; le flag '
  'n''est jamais réversé par le produit (un programme recréé part d''un '
  'vault neuf, l''ancien reste lisible dans l''historique).';

-- La vue de scope PowerSync expose la nouvelle colonne (M-44 : le
-- rapport de lecture hors-ligne montre l'état du vault — archivé ou
-- actif). `archived` est insérée AVANT created_at dans le SELECT :
-- Postgres refuserait un CREATE OR REPLACE qui renomme une colonne
-- existante (42P16) ; le DROP + CREATE est le pattern appliqué live
-- le 2026-10-18. Additif : aucune table n'est créée ni modifiée.
DROP VIEW IF EXISTS v_discovery_vault_scope;
CREATE VIEW v_discovery_vault_scope WITH (security_invoker = on) AS
SELECT id, user_id, domaine, vault_md, vault_hash, runs_manifest,
       storage_prefix, archived, created_at, updated_at
FROM discovery_vault;

GRANT SELECT ON v_discovery_vault_scope TO service_role;
