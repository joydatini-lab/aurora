/**
 * focus-profiles.ts (S5, M-51 — profils de focus, écran 9).
 *
 * Le **profil de focus** est modélisé **côté app** dans le store local
 * (`@aurora/data` `LocalStore`) — AD-7 local-first, zéro réseau, zéro
 * PowerSync sur ce chemin. L'entité miroir `focus_profiles` **n'existe pas**
 * (pas de table Supabase, pas de migration PowerSync) : c'est un **blocage
 * PowerSync reporté au checkpoint lead** (bannière de synthèse S5), on ne
 * code PAS de migration. Tant que le miroir n'est pas là, la row de profil
 * vit uniquement sur l'appareil (comportement honnête, offline-friendly) ;
 * le rebranchement sur le miroir Supabase + upsync se fait au checkpoint.
 *
 * Le profil porte exactement ce que l'écran 9 (Stitch) demande :
 * - `method` (`'pomodoro' | 'timer'`) — le sous-mode de focus
 * - durées `workMin` / `pauseMin` / `sessions` (carte « durations-config »)
 * - `taskId` facultative (la tâche assignée, Q11 modèle minimal = la
 *   `Task` miroir `productivity.tasks` existante — pas de nouvelle entité)
 * - `displayOnFocusPage` (option « Afficher sur la page Focus », écran 9)
 *
 * Le **lancement** du profil mappe le profil en `FocusSessionOptions` et
 * démarre la session via la `FocusControllerService.startSession(opts)`
 * (`packages/focus` — S5 §M-51). La mécanique de session/timer EXISTE
 * (AD-7), on ne la modifie pas, on se rebranche dessus.
 */
import type { LocalStore, LocalRow } from '@aurora/data';
import type { FocusSessionOptions } from '@aurora/focus';

/** Le miroir local du profil (snake_case, shape PowerSync-adjacente). */
const ENTITY = 'focus_profiles';

/**
 * Un profil de focus (la shape app-side, camelCase). `method` décide du
 * sous-mode ; les durées sont en minutes (l'écran affiche « min »).
 * `workMin === 0` + `method === 'timer'` = chronomètre sans limite.
 */
export interface FocusProfile {
  id: string;
  userId: string;
  /** titre affiché sur la carte (écran 8/9) */
  title: string;
  /** sous-mode de focus (méthode, écran 9) */
  method: 'pomodoro' | 'timer';
  /** durée de travail (min) — 0 = sans limite (chronomètre) */
  workMin: number;
  /** durée de pause (min) — pomodoro uniquement */
  pauseMin: number;
  /** nombre de sessions/pomodoros cibles — pomodoro uniquement */
  sessions: number;
  /** id de la tâche assignée (facultatif, Q11) */
  taskId?: string;
  /** option « Afficher sur la page Focus » (écran 9) */
  displayOnFocusPage: boolean;
  createdAt: string;
}

/** Le store local des profils — le writer app-side (AD-7, single-writer). */
export interface FocusProfileStore {
  /** crée / remplace un profil (row locale). */
  create(profile: FocusProfile): void;
  /** lit un profil par id (undefined si absent). */
  get(id: string): FocusProfile | undefined;
  /** liste les profils (tri par createdAt asc) ; filtre optionnel par user. */
  list(userId?: string): FocusProfile[];
  /**
   * Assigne une tâche à un profil (l'assignation profil→tâche, S5 M-52).
   * Écrit la row du profil avec `task_id` ; n'invente pas d'entité distincte
   * (AD-7, l'entité `focus_profiles` est le blocage PowerSync reporté).
   */
  linkTaskToProfile(taskId: string, profileId: string): void;
  /** retire l'assignation (task_id = null). */
  unlinkTaskFromProfile(profileId: string): void;
}

// --- miroir snake_case ⇄ entité camelCase (AD-15 shape) ------------------

function toRow(p: FocusProfile): LocalRow {
  return {
    id: p.id,
    userId: p.userId,
    user_id: p.userId,
    title: p.title,
    method: p.method,
    work_min: p.workMin,
    pause_min: p.pauseMin,
    sessions: p.sessions,
    task_id: p.taskId ?? null,
    display_on_focus_page: p.displayOnFocusPage ? 1 : 0,
    created_at: p.createdAt,
    local_mutation_id: p.id,
    local_ts_ms: Date.now(),
  } as LocalRow;
}

function fromRow(row: LocalRow | undefined): FocusProfile | undefined {
  if (!row) return undefined;
  const r = row as unknown as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: String(r.userId ?? r.user_id ?? ''),
    title: String(r.title ?? ''),
    method: ((r.method as 'pomodoro' | 'timer' | undefined) ?? 'pomodoro'),
    workMin: Number(r.work_min ?? 0),
    pauseMin: Number(r.pause_min ?? 0),
    sessions: Number(r.sessions ?? 0),
    taskId: r.task_id == null ? undefined : String(r.task_id),
    displayOnFocusPage: Number(r.display_on_focus_page ?? 0) === 1,
    createdAt: String(r.created_at ?? ''),
  };
}

/**
 * Construire le store local des profils sur un `LocalStore` (AD-7 : la row
 * vit sur l'appareil, pas de réseau). Le `create` est le writer unique de la
 * table locale ; les lectures passent par `store.allRows` / `store.row`.
 */
export function createFocusProfileStore(store: LocalStore): FocusProfileStore {
  function profilesOf(userId?: string): FocusProfile[] {
    const all = store
      .allRows(ENTITY)
      .map((row) => fromRow(row))
      .filter((p): p is FocusProfile => p !== undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (userId) {
      return all.filter((p) => p.userId === userId);
    }
    return all;
  }

  return {
    create(profile) {
      store.upsert(ENTITY, toRow(profile));
    },
    get(id) {
      return fromRow(store.row(ENTITY, id));
    },
    list(userId) {
      return profilesOf(userId);
    },
    linkTaskToProfile(taskId, profileId) {
      const existing = store.row(ENTITY, profileId);
      if (!existing) return;
      store.upsert(ENTITY, {
        ...existing,
        task_id: taskId,
        local_ts_ms: Date.now(),
      } as unknown as LocalRow);
    },
    unlinkTaskFromProfile(profileId) {
      const existing = store.row(ENTITY, profileId);
      if (!existing) return;
      store.upsert(ENTITY, {
        ...existing,
        task_id: null,
        local_ts_ms: Date.now(),
      } as unknown as LocalRow);
    },
  };
}

/**
 * Mapper un profil en `FocusSessionOptions` (le wiring M-51). Le profil
 * porte déjà les champs de l'option (méthode → `mode`, durées →
 * `plannedDurationSec`, pause → `pomodoroPauseSec`, tâche → `taskIds`) ; on
 * ne duplique rien, on se rebranche sur la `startSession` existante (AD-7).
 * L'appelant lance la session via `svc.startSession(launchProfile(profil))`.
 */
export function launchProfile(profile: FocusProfile): FocusSessionOptions {
  const isPomodoro = profile.method === 'pomodoro';
  return {
    userId: profile.userId,
    mode: isPomodoro ? 'pomodoro' : 'timer',
    // « sans limite de durée » (chronomètre) = planned 0 (open-ended, SSoT).
    plannedDurationSec: profile.workMin * 60,
    pomodoroPauseSec: isPomodoro ? profile.pauseMin * 60 : undefined,
    taskIds: profile.taskId ? [profile.taskId] : undefined,
  };
}
