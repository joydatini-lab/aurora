-- =============================================================================
-- Aurora — Migration 0027: focus_profiles (S5, M-51, plan veille 2026-10-17)
--
-- ADDITIF ONLY (01 §2.1: le schéma Aurora est additif sur l'instance
-- partagée) — une nouvelle table, pas de nouvelle colonne existante :
--
--  `focus_profiles` — le profil Focus (S5 M-51) : méthode (pomodoro /
--  chrono / tours) + durées + tâche optionnelle liée. Le SSoT du store
--  LocalStore du S5 est migré ici pour la synchro multi-appareils
--  (tranchée 10/18, lot 2026-10-17).
--
-- Colonnes :
--   user_id        uuid PK/FK auth.users, RLS owner (01 §2.2)
--   name           text NOT NULL (nom du profil, non-vide, max 80)
--   method         text NOT NULL CHECK in ('pomodoro','chrono','tours')
--   base_minutes   int NOT NULL (base: 25 pomodoro, chrono = 1)
--   rest_minutes   int NOT NULL DEFAULT 5
--   rounds         int NOT NULL DEFAULT 1 (tours: nombre de tours)
--   task_id        uuid NULL FK productivity.tasks.id ON DELETE SET NULL
--                  (le lien tâche↔profil, M-52/Q11: tâche simple Q11)
--   created_at     timestamptz DEFAULT now()
--   updated_at     timestamptz (trigger set_updated_at(), 0001)
--
-- RLS (01 §2.2): FORCE ROW LEVEL SECURITY + policy user_isolation
-- (owner = user_id). Pas de BYPASSRLS (règle 1, 01 §2.2).
--
-- Stream PowerSync: le stream `focus` EXISTE (0002) et porte déjà
-- productivity.tasks (Q11 tâches simples). La table focus_profiles
-- sera ajoutée au stream focus (M-51 débloquage) — la modif du
-- stream passe par le checkpoint lead (supabase-mcp.md §TODO wave 1).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.focus_profiles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    method      text NOT NULL CHECK (method IN ('pomodoro', 'chrono', 'tours')),
    base_minutes int NOT NULL DEFAULT 25 CHECK (base_minutes >= 1),
    rest_minutes int NOT NULL DEFAULT 5 CHECK (rest_minutes >= 0),
    rounds      int NOT NULL DEFAULT 1 CHECK (rounds >= 1),
    task_id     uuid, -- FK logique vers tasks (0002, non schema-qualifié) ON DELETE SET NULL
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index de recherche rapide par user_id (le RLS filtrera, mais l'index
-- évite une scan full-table quand un user a plusieurs profils).
CREATE INDEX IF NOT EXISTS idx_focus_profiles_user_id ON public.focus_profiles(user_id);

-- Trigger set_updated_at (0001, partagé)
CREATE TRIGGER trg_focus_profiles_updated_at
    BEFORE UPDATE ON public.focus_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: ENABLE + FORCE (01 §2.2, les deux)
ALTER TABLE public.focus_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_profiles FORCE ROW LEVEL SECURITY;

-- Policy user_isolation: owner = user_id (pas de policy permissive,
-- pas de BYPASSRLS — le service_role n'a pas de policy ici, les
-- writes passent par l'EF fn-focus si un jour; le S5 store reste
-- app-local pour la lecture/writing user-side jusqu'au checkpoint
-- PowerSync du lead).
CREATE POLICY user_isolation_focus_profiles
    ON public.focus_profiles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Commentaire (le SSoT du S5 M-51)
COMMENT ON TABLE public.focus_profiles IS
    'S5 M-51: profil Focus (méthode + durées + tâche Q11 optionnelle). SSoT: le store local du S5 est migré ici pour la synchro multi-appareils (tranchée 10/18). RLS user_isolation (owner), FORCE (01 §2.2). Stream: focus (0024) — à ajouter au checkpoint lead.';
