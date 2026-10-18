/**
 * @aurora/domain — the single source of truth for ALL shared domain types
 * (AD-15 SSoT).
 *
 * Hexagon center: this package imports NOTHING (AD-1 vendor isolation,
 * AD-6 data layer split). Every other package depends on `@aurora/domain`,
 * never the reverse.
 *
 * Grouping:
 *   - envelopes        (ApiEnvelope, AppError, AsyncState, AI envelope)
 *   - crdt             (OR-Set encoding, AD-7 local-first)
 *   - entities-*       (40+ entities across modules)
 *   - events           (the closed 9-event vocabulary, AD-9)
 *   - ports            (14 hexagonal ports)
 *   - ai-pipeline      (8 AI pipeline contracts)
 *   - registries       (Feature/Capability/UI contracts + 7 registries)
 */

// ---- Envelopes ----
export * from './envelopes';

// ---- CRDT (AD-7) ----
export * from './crdt';

// ---- Entities (by module) ----
export * from './entities-productivity';
export * from './entities-learning';
export * from './entities-knowledge';
export * from './entities-progress';
export * from './entities-discovery';
export * from './entities-artifact';
export * from './entities-agent';
export * from './entities-goal';
export * from './entities-canvas';
export * from './entities-integrations';
export * from './entities-identity';
export * from './entities-engineering';

// ---- Ascent (wave 3, W3-E2, AD-15) ----
export * from './ascent';

// ---- Vault (Discovery, AD-15 additive, discovery-vault plan 2026-10-10) ----
export * from './vault';

// ---- Jobs (AD-8) ----
export * from './jobs';

// ---- 9 events (AD-9) ----
export * from './events';

// ---- 14 ports ----
export * from './ports';

// ---- Vendor ports (additive, wave 2 ORION) ----
export * from './research-provider';

// ---- AI pipeline contracts (8) ----
export * from './ai-pipeline';

// ---- UI / registres (§10-§11) + 7 registries ----
export * from './registries';

// ——— Focus module (S5 M-51, migration 0027) —————————————————————————
/** Profil Focus (méthode + durées + tâche Q11 optionnelle, 0027).
 *  SSoT : le store LocalStore du S5 est migré ici pour la synchro
 *  multi-appareils (PowerSync, stream focus, 0002). */
export interface FocusProfile {
  id: string;
  userId: string;
  /** nom du profil (1–80 caractères, 0027). */
  name: string;
  /** méthode (0027 : pomodoro / chrono / tours). */
  method: 'pomodoro' | 'chrono' | 'tours';
  /** base en minutes (pomodoro : 25 par défaut ; chrono : 1 par défaut). */
  baseMinutes: number;
  /** pause en minutes (défaut 5, 0027). */
  restMinutes: number;
  /** nombre de tours (méthode tours, défaut 1, 0027). */
  rounds: number;
  /** tâche Q11 liée (FK tasks, 0002, NULL = pas de tâche, 0027). */
  taskId?: string;
  /**
   * Affichage sur la page Focus (S5 M-52) : un profil peut être masqué de
   * la liste de l'écran 9 tout en restant utilisable (lancement direct,
   * session, …). Défaut `true` = affiché.
   */
  displayOnFocusPage?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FocusMethod = FocusProfile['method'];
