/**
 * focus-profiles.ts (S5, M-51 — profils de focus, écran 9).
 *
 * Le **profil de focus** est modélisé sur l'entité SSoT **`FocusProfile`**
 * de `@aurora/domain` (ajoutée 10/18, migration 0027 : `focus_profiles`
 * Supabase + RLS user_isolation + PowerSync stream `focus`). Les méthodes
 * sont `pomodoro` / `chrono` / `tours` (CHECK 0027) ; les durées sont
 * `baseMinutes` (base de travail) / `restMinutes` (pause) / `rounds`
 * (nombre de tours) ; la tâche assignée (Q11) = FK `tasks.id`
 * (0002, non `productivity_tasks`).
 *
 * AD-7 local-first : les lectures passent par le `LocalStore`
 * (`packages/data`), les writes restent côté app (`lib/focus-profiles.ts`
 * = le seul writer du module). Le rebranchement sur le miroir PowerSync
 * (stream `focus` qui porte désormais `focus_profiles`) + upsync se fait
 * **au checkpoint lead** (le subagent ne déploie JAMAIS le relay PROD) ;
 * ce module n'écrit PAS de migration, il consomme l'entité domain.
 *
 * Le **lancement** du profil mappe le profil en `FocusSessionOptions`
 * (`packages/focus`) et démarre la session via
 * `FocusControllerService.startSession(opts)` (AD-7 : la mécanique
 * session/timer EXISTE, on ne la modifie pas, on se rebranche dessus).
 */
import type { LocalStore, LocalRow } from '@aurora/data';
import type { FocusProfile as FocusProfileDomain } from '@aurora/domain';
import type { FocusSessionOptions } from '@aurora/focus';

/**
 * Le SSoT du profil de focus (0027, AD-15 : `packages/domain` porte le
 * shape de l'entité). Re-exporté pour les modules app-side qui consomment
 * le profil (page v2, new-profile, timer v2). Les durées sont en minutes ;
 * `method` = `pomodoro` / `chrono` / `tours`.
 */
export type { FocusProfileDomain as FocusProfile };
export type { FocusMethod } from '@aurora/domain';

/** Le miroir local du profil (AD-7 : single-writer = ce module). */
const ENTITY = 'focus_profiles';

/**
 * Le store local des profils — le writer app-side (AD-7, single-writer).
 * La row du store porte le shape miroir snake_case de `focus_profiles`
 * (0027) ; les lectures reviennent en entité domain camelCase
 * (`FocusProfile`).
 */
export interface FocusProfileStore {
  /** crée / remplace un profil (row miroir 0027). */
  create(profile: FocusProfileDomain): void;
  /** lit un profil par id (undefined si absent). */
  get(id: string): FocusProfileDomain | undefined;
  /** liste les profils (tri par createdAt asc) ; filtre optionnel par user. */
  list(userId?: string): FocusProfileDomain[];
  /**
   * Assigne une tâche à un profil (le lien tâche↔profil, S5 M-52 / Q11).
   * Écrit la row du profil avec `task_id` (la FK logique `tasks`, 0002) ;
   * n'invente PAS d'entité distincte (AD-7, le modèle Q11 reste
   * compatible `productivity.tasks`).
   */
  linkTaskToProfile(taskId: string, profileId: string): void;
  /** retire l'assignation (task_id = null). */
  unlinkTaskFromProfile(profileId: string): void;
}

// --- miroir snake_case ⇄ entité domain camelCase (AD-15 shape, 0027) ----

/** row miroir 0027 (snake_case, shape PowerSync-adjacent). */
type RawRow = Record<string, unknown>;

function toRow(p: FocusProfileDomain): LocalRow {
  const nowIso = p.updatedAt || p.createdAt || new Date().toISOString();
  const row = {
    id: p.id,
    user_id: p.userId,
    name: p.name,
    method: p.method,
    base_minutes: p.baseMinutes,
    rest_minutes: p.restMinutes,
    rounds: p.rounds,
    task_id: p.taskId ?? null,
    display_on_focus_page: p.displayOnFocusPage ?? true,
    created_at: p.createdAt,
    updated_at: nowIso,
    local_mutation_id: p.id,
    local_ts_ms: Date.now(),
  };
  return row as unknown as LocalRow;
}

/** row miroir snake_case → entité domain camelCase (le shape SSoT). */
function fromRow(row: LocalRow | undefined): FocusProfileDomain | undefined {
  if (!row) return undefined;
  const r = row as unknown as RawRow;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : undefined;
  const num = (v: unknown): number =>
    typeof v === 'number' ? v : Number(v ?? 0);
  const method =
    (str(r.method) as FocusProfileDomain['method'] | undefined) ?? 'pomodoro';
  return {
    id: String(r.id),
    userId: String(r.user_id ?? r.userId ?? ''),
    name: str(r.name) ?? '',
    method,
    baseMinutes: num(r.base_minutes),
    restMinutes: num(r.rest_minutes),
    rounds: num(r.rounds),
    taskId: r.task_id == null ? undefined : String(r.task_id),
    displayOnFocusPage:
      r.display_on_focus_page == null ? true : r.display_on_focus_page === true,
    createdAt: str(r.created_at) ?? '',
    updatedAt: str(r.updated_at) ?? str(r.created_at) ?? '',
  };
}

/**
 * Construire le store local des profils sur un `LocalStore` (AD-7 : la row
 * vit sur l'appareil, pas de réseau sur le chemin de lecture ; le write est
 * le seul writer du module). Les lectures passent par
 * `store.allRows` / `store.row` ; le `create` est le write local.
 * Le rebranchement miroir + upsync se fait au checkpoint lead (0027).
 */
export function createFocusProfileStore(
  store: LocalStore,
): FocusProfileStore {
  function profilesOf(userId?: string): FocusProfileDomain[] {
    const all = store
      .allRows(ENTITY)
      .map((row) => fromRow(row))
      .filter((p): p is FocusProfileDomain => p !== undefined)
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
 * Mapper un profil en `FocusSessionOptions` (le wiring M-51). Les méthodes
 * 0027 mapent en sous-modes `packages/focus` :
 * - `pomodoro` → `mode: 'pomodoro'` (pauses court/long via
 *   `pomodoroPauseSec`, N pomodoros via `rounds`)
 * - `chrono`   → `mode: 'timer'` (chronomètre, `plannedDurationSec` = base)
 * - `tours`    → `mode: 'timer'` + N laps (`rounds` = nombre de tours)
 * On duplique rien, on se rebranche sur la `startSession` existante (AD-7).
 */
export function launchProfile(profile: FocusProfileDomain): FocusSessionOptions {
  const isPomodoro = profile.method === 'pomodoro';
  const baseSec = profile.baseMinutes * 60;
  const restSec = profile.restMinutes * 60;
  return {
    userId: profile.userId,
    // `pomodoro` = la machine à états Pomodoro (pauses alternées) ;
    // `chrono` / `tours` = le chronomètre (les tours = laps, N = rounds).
    mode: isPomodoro ? 'pomodoro' : 'timer',
    // « base » de travail : pour Pomodoro, la durée d'un pomodoro ; pour
    // Chrono/Tours, une borne de référence (0 = open-ended, SSoT).
    plannedDurationSec: baseSec,
    // la pause = `restMinutes` (Pomodoro : pause courte entre pomodoros ;
    // les autres méthodes : pas de pause alternée, undefined = pas de pause).
    pomodoroPauseSec: isPomodoro ? restSec : undefined,
    taskIds: profile.taskId ? [profile.taskId] : undefined,
  };
}
