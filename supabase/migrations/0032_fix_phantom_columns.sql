-- =============================================================================
-- Aurora — Migration 0032: les colonnes fantômes (D3) + la contrainte `kind` (D2)
--
-- POURQUOI
-- La garde `tests/db/domain-schema-drift.test.ts` (2026-10-26) compare les
-- colonnes que les WRITERS écrivent réellement aux colonnes que les migrations
-- définissent. Elle a trouvé trois colonnes que le code écrit et qu'AUCUN
-- schéma n'a — ni la base live, ni `powersync-schema.ts`, ni le DDL SQLite
-- généré (D3) — et une contrainte CHECK qui refuse des valeurs que le type de
-- domaine autorise (D2).
--
-- POURQUOI C'EST GRAVE, ET POURQUOI C'EST SILENCIEUX
-- `EngineLocalStoreBridge.upsert` (`packages/data/src/local-store-bridge.ts:67`)
-- est une **Map** indexée par nom de colonne : une clé inconnue est ACCEPTÉE.
-- La chaîne mesurée :
--   1. `createTask` écrit `tags` dans la Map locale → accepté ;
--   2. l'écran lit la Map → les tags S'AFFICHENT correctement ;
--   3. le PATCH part vers PostgREST → la colonne n'existe pas → échec traité
--      comme une écriture en file d'attente, pas comme un crash ;
--   4. l'utilisateur voit ses tags ; le serveur ne les a JAMAIS eus.
-- C'est la classe « divergence silencieuse » : aucune erreur, aucune perte
-- visible, et la donnée disparaît au premier `db reset` ou sur un autre appareil.
--
-- LES TROIS COLONNES (vérifiées absentes du catalogue live le 2026-10-26)
--   - `tasks.tags`            écrit par `createTask` (tasks.ts:83) ;
--   - `tasks.recurrence_rule` écrit par `createTask` (tasks.ts:97) ;
--   - `projects.view_mode`    écrit par `createProject` (goals-projects.ts:164)
--                             ET `updateProject` (goals-projects.ts:183).
--
-- TYPES ET DÉFAUTS — repris du SSoT de domaine (AD-15), pas inventés :
--   - `Task.tags: OrSetValue[]` (`entities-productivity.ts:21`) → jsonb NOT NULL
--     DEFAULT '[]'. Le précédent symétrique est `tasks.dependencies`
--     (0002_productivity.sql:75, « CRDT OR-Set list (03 §5.3) ») — même
--     mécanisme, même forme, donc même colonne. Le writer enveloppe déjà chaque
--     valeur (`{ v, ts, c }`, tasks.ts:83).
--   - `Task.recurrenceRule?: string` (`entities-productivity.ts:28`) → text
--     NULLABLE (le champ est optionnel ; `createTask` ne l'écrit que si
--     `input.recurring`). Précédent : `calendar_events.recurrence jsonb`
--     (0002:161). Ici text, car la valeur est une règle RFC 5545 (`FREQ=DAILY`)
--     produite par le writer, pas une structure.
--   - `Project.viewMode?: ProjectView` (`entities-productivity.ts:73`) → text
--     NULLABLE + CHECK. `ProjectView` (entities-productivity.ts:59) est une union
--     FERMÉE de 5 valeurs ; le dépôt pose un CHECK sur chaque énumération texte
--     (`tasks.energy`, `artifacts.kind`, `artifacts.status`) — on suit la
--     convention pour que le contrat soit lisible dans le catalogue.
--
-- D2 — `artifacts_kind_check` : le SSoT `Artifact.kind`
-- (`entities-artifact.ts:14-26`) liste 13 valeurs, la contrainte live 10. Trois
-- valeurs autorisées par le type sont REFUSÉES par Postgres à l'écriture :
-- `csv`, `text`, `code` — soit exactement les trois formats de fichier qu'un
-- utilisateur importe le plus (un CSV, un .txt, un source). On ÉLARGIT la
-- contrainte (additif, aucune donnée existante ne peut être invalidée) plutôt
-- que de rétrécir le type : le type est le SSoT (AD-15), et retirer `csv` du
-- domaine supprimerait une capacité produit documentée (ADR S16 visualisation
-- universelle). Contrainte live nommée vérifiée le 2026-10-26 :
-- `artifacts_kind_check`.
--
-- ADDITIF ET IDEMPOTENT : `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF
-- EXISTS` avant `ADD CONSTRAINT`. Rejouable sans effet sur la production.
--
-- CE QUI N'EST PAS FAIT ICI (décision documentée, pas un oubli)
-- Les vues `v_productivity_scope` (0015 + powersync/relay.sql) ne reçoivent PAS
-- ces colonnes. Elles sont déjà une PROJECTION à dénominateur commun (UNION ALL
-- tasks/projects/goals) qui omet `parent_recurrence_key`, `energy`,
-- `work_context` et `actual_minutes` : `view_mode` est une colonne propre à
-- `projects` et n'a pas de place dans une projection partagée. Le runtime ne
-- passe pas par ces vues — `powersync/sync-config.yaml` déclare des flux
-- **per-table** précisément « pour éviter la perte de colonnes hétérogènes d'une
-- UNION ALL ». La garde `client-schema-drift` prend d'ailleurs `sync-config.yaml`
-- comme vérité runtime. Aligner la vue serait donc un changement sans effet sur
-- la synchronisation ; l'aligner mal (un nom générique pour `view_mode`)
-- masquerait la distinction. C'est un constat, pas une action.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- D3 — les trois colonnes fantômes
-- ---------------------------------------------------------------------------

-- OR-Set (03 §5.3) : même forme que `dependencies` (0002:75).
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb;

-- RFC 5545 (`FREQ=DAILY`, …) ; optionnel → nullable. Le writer ne l'écrit que
-- pour une tâche récurrente (tasks.ts:96-98).
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule text;

-- Préférence de vue par projet (`ProjectView`, 5 valeurs, union fermée).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS view_mode text;

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_view_mode_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_view_mode_check
  CHECK (view_mode IS NULL OR view_mode IN ('list','kanban','timeline','gantt','calendar'));

COMMENT ON COLUMN tasks.tags IS
  'CRDT OR-Set list (03 §5.3), même forme que `dependencies`. Écrit par '
  'createTask (packages/productivity/src/tasks.ts:83). Versionnée en 0032 : la '
  'colonne était écrite par le code et absente de TOUT schéma (D3), donc perdue '
  'silencieusement côté serveur (local-store-bridge.ts:67 est une Map).';

COMMENT ON COLUMN tasks.recurrence_rule IS
  'Règle de récurrence RFC 5545 (ex. FREQ=DAILY), optionnelle. Écrite par '
  'createTask (tasks.ts:97). Versionnée en 0032 (D3).';

COMMENT ON COLUMN projects.view_mode IS
  'ProjectView : list | kanban | timeline | gantt | calendar (union fermée, '
  'entities-productivity.ts:59). Écrite par createProject (goals-projects.ts:164) '
  'et updateProject (:183). Versionnée en 0032 (D3).';

-- ---------------------------------------------------------------------------
-- D2 — la contrainte `kind` refuse 3 valeurs que le SSoT autorise
-- ---------------------------------------------------------------------------

ALTER TABLE artifacts
  DROP CONSTRAINT IF EXISTS artifacts_kind_check;

ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_kind_check
  CHECK (kind IN (
    'pdf','docx','pptx','xlsx','csv',
    'image','audio','video',
    'markdown','text','code','latex',
    'other'
  ));
