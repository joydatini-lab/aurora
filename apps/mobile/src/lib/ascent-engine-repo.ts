/**
 * Ascent engine repo — branchement module A5 (ascent, moteur
 * pédagogique).
 *
 * Le module `@aurora/ascent` est le moteur pédagogique PUR (AD-1/AD-10,
 * server-side, AD-12 : pas de 2e LLM pédagogique) : `computeLearnerBaseline`
 * (S6.2), `selectDepth` / `hoursUntil` / `isTimeConstrained` (S13),
 * `buildPath` (S10/S13 : READ→DO→PROVE + scaling par profondeur),
 * `reactTo` / `remediateBlocker` (AD-9 event-driven adaptation),
 * `ascentSessionContext` / `collectLearningCommands` /
 * `currentLearningCommands` (kernel integration S5/S7), `phasesForStep` /
 * `reorderPhases` (read-do-prove framework), `rankSources` /
 * `flagConflicts` (source hierarchy S14).
 *
 * C'est **ce repo** (confiné à la couche provider, AD-15) qui consomme
 * le module et le relie au store local `LocalStore` (miroirs `skill_states`
 * + `gaps` + `ascent_paths` — 03 S4.2). Le moteur PRODUIT le
 * `AscentLearningIR` (le SSoT AD-15) que la page `/goals/:id/ascent`
 * lit ; le miroir `ascent_paths` (déjà branché par `ascent-repo.ts`)
 * est le canal de PERSISTANCE du résultat du moteur (AD-7 single-writer :
 * Ascent écrit sa table seulement).
 *
 * Pattern : le module ne fait JAMAIS de réseau (AD-7 local-first) ; il
 * reçoit les entités du `LocalStore` et produit le `AscentLearningIR`
 * SSoT. La page lit le hook React Query — elle n'importe jamais
 * `@aurora/ascent`.
 *
 * NOTE (AD-7 / AD-12) : LE BUILD DU CHEMIN (l'Agent Kernel) court
 * SERVER-SIDE — le device lit le `ascent_paths` miroité (frozen path).
 * Ce repo expose le CALCUL local du moteur (baseline + depth + path
 * construction + adaptation) sur les miroirs locaux, pour la page
 * `/goals/:id/ascent` qui prévisualise le trajet avant qu'il ne soit
 * persisté, ET pour les tests. La persistance de l'IR reste l'EF
 * `fn-ascent` (AD-7 : Ascent écrit sa table seulement, single-writer).
 */
import type {
  AscentLearningIR,
  AscentStep,
  AscentActivity,
  LearnerBaseline,
  SkillState,
  DomainEvent,
} from '@aurora/domain';
import type { LocalStore } from '@aurora/data';
import { readProgress } from './progress-repo';
import {
  computeLearnerBaseline,
  selectDepth,
  hoursUntil,
  isTimeConstrained,
  buildPath,
  reactTo,
  remediateBlocker,
  ascentSessionContext,
  collectLearningCommands,
  currentLearningCommands,
  phasesForStep,
  reorderPhases,
  rankSources,
  flagConflicts,
  sequencePhaseActivities,
  DEPTH_BUDGETS,
  SOURCE_LEVELS,
  sourceAuthority,
  strongestSource,
  type BuildPathInput,
  type AscentStepInput,
  type DepthSelectionInput,
  type AscentSessionContext,
  type LearningCommand,
  type HierarchyConflict,
  type SourceRefInfo,
} from '@aurora/ascent';
import type { DepthLevel } from '@aurora/domain';

// ---------------------------------------------------------------------------
// snake_case mirror row → camelCase `@aurora/domain` entity
// (skill_states / gaps mirrors — les inputs du moteur)
// ---------------------------------------------------------------------------

type RawRow = Record<string, unknown>;

function collectRows(
  store: LocalStore,
  entity: string,
  userId?: string,
): RawRow[] {
  const rows = store.allRows(entity) as RawRow[];
  if (!userId) return rows;
  return rows.filter((r) => r.user_id === userId || r.userId === userId);
}

/**
 * Lire le `LearnerBaseline` à partir des miroirs `skill_states` (le
 * module `computeLearnerBaseline` est la SSoT du baseline — S6.2).
 * Les `skill_states` sont LUS via le `progress-repo` (le module
 * `@aurora/progress` mappe le miroir limité vers le `SkillState`
 * SSoT) ; ce repo en consomme la sortie pour alimenter le moteur
 * Ascent (AD-2 : pas d'accès direct à la table des autres modules,
 * on passe par le repo du module propriétaire).
 */
export function readBaselineInputs(
  store: LocalStore,
  userId?: string,
): { skillStates: SkillState[]; gaps: RawRow[] } {
  // `readProgress` (progress-repo) mappe les miroirs LIMITÉ
  // (skill_states) vers le SkillState SSoT ; on s'en sert pour
  // alimenter le moteur Ascent (AD-2: pas d'accès direct à la table
  // Progress, on passe par le repo du module propriétaire).
  const { skillStates } = readProgress(store, userId);
  return {
    skillStates,
    gaps: collectRows(store, 'gaps', userId),
  };
}

/**
 * Construire le `LearnerBaseline` (module SSoT, S6.2) à partir des
 * skill states du miroir local. Le baseline est l'input du
 * `buildPath` — c'est la SSoT du "point de départ" du trajet.
 */
export function computeAscentLearnerBaseline(
  store: LocalStore,
  userId: string,
  nowIso = new Date().toISOString(),
): LearnerBaseline {
  const { skillStates } = readBaselineInputs(store, userId);
  return computeLearnerBaseline(userId, skillStates, nowIso);
}

// ---------------------------------------------------------------------------
// Public compute surface (thin wrappers over the @aurora/ascent module)
// ---------------------------------------------------------------------------

/**
 * The depth selection (S13): how deep to go given time constraint +
 * importance. Pure, deterministic. Le repo expose le calcul ; la page
 * `/goals/:id/ascent` l'utilise pour prévisualiser le profondeur du
 * trajet.
 */
export function computeSelectDepth(
  input: DepthSelectionInput,
): DepthLevel {
  return selectDepth(input);
}

/** The hours-until target (S13 time-constraint input). */
export function computeHoursUntil(
  target: string,
  nowIso: string,
): number {
  return hoursUntil(target, nowIso);
}

/** Is the goal time-constrained (S13)? */
export function computeIsTimeConstrained(
  target: string | undefined,
  nowIso: string,
): boolean {
  return isTimeConstrained(target, nowIso);
}

/**
 * Build the full `AscentLearningIR` (S10/S13 : READ→DO→PROVE + depth
 * scaling). C'est LE PRODUIT du moteur — le SSoT AD-15 que la page
 * `/goals/:id/ascent` lit. La persistance (insertion dans
 * `ascent_paths`) est l'EF `fn-ascent` (AD-7 single-writer) ; ce
 * wrapper est le calcul local pour la prévisualisation + les tests.
 */
export function computeBuildAscentPath(
  input: BuildPathInput,
): AscentLearningIR {
  return buildPath(input);
}

/**
 * The READ→DO→PROVE sequencing of activities (S10), scaled by depth
 * budget. Le module est la SSoT du framework ; le repo l'expose pour
 * la page (le rendu est `@aurora/ui`, AD-10).
 */
export function computeSequencePhaseActivities(
  step: AscentStep,
  knowledgeRef: AscentActivity['knowledgeRef'],
  nextId: (prefix: string) => string,
): AscentActivity[] {
  return sequencePhaseActivities(step, knowledgeRef, nextId);
}

/**
 * Event-driven adaptation (AD-9) : le module réécrit l'IR en
 * réaction aux 6 événements consommés (`SkillStateChanged`,
 * `CourseImported`, `DiscoveryItemCreated`, `GoalUpdated`,
 * `TaskCompleted`, `ArtifactGenerated`). Le repo expose le calcul ;
 * la persistance du chemin réécrit est l'EF (AD-7 single-writer).
 */
export function computeReactTo(
  path: AscentLearningIR,
  event: DomainEvent,
  opts: Parameters<typeof reactTo>[2],
): AscentLearningIR {
  return reactTo(path, event, opts);
}

/**
 * The "Je bloque" flow (S14) : stuck → diagnose → remediate. Le
 * module retourne le chemin réécrit + les LearningCommands de
 * remediation (Ascent décide le QUOI + l'ORDRE ; Learning fait le
 * travail, AD-7).
 */
export function computeRemediateBlocker(
  path: AscentLearningIR,
  skillId: string,
  opts: Parameters<typeof remediateBlocker>[2],
): ReturnType<typeof remediateBlocker> {
  return remediateBlocker(path, skillId, opts);
}

/**
 * The kernel session context (S5/S7) : la slice du chemin que le
 * Context Builder du kernel injecte pour "what should the user learn
 * next?" (01 S5.6). La dérivation Level-1 est PARTAGÉE avec le
 * Slide-Ascent UI (S11 single source of truth).
 */
export function computeAscentSessionContext(
  path: AscentLearningIR,
): AscentSessionContext {
  return ascentSessionContext(path);
}

/** The LearningCommands for one step's ACTIVE activities (AD-7). */
export function computeCollectLearningCommands(
  path: AscentLearningIR,
  stepId: string,
): LearningCommand[] {
  return collectLearningCommands(path, stepId);
}

/** The LearningCommands the kernel plans NOW (active step, else current). */
export function computeCurrentLearningCommands(
  path: AscentLearningIR,
): LearningCommand[] {
  return currentLearningCommands(path);
}

/** The read→do→prove phases for a step (framework, S10). */
export function computePhasesForStep(
  input: Parameters<typeof phasesForStep>[0],
): ReturnType<typeof phasesForStep> {
  return phasesForStep(input);
}

/** Reorder the phases (the Agent may reorder / skip, AD-1). */
export function computeReorderPhases(
  ...args: Parameters<typeof reorderPhases>
): ReturnType<typeof reorderPhases> {
  return reorderPhases(...args);
}

/** Rank the source refs by authority (S14 source hierarchy). */
export function computeRankSources(
  refs: SourceRefInfo[],
): SourceRefInfo[] {
  return rankSources(refs);
}

/** Flag the hierarchy conflicts between refs (S14). */
export function computeFlagConflicts(
  refs: SourceRefInfo[],
): HierarchyConflict[] {
  return flagConflicts(refs);
}

/** The source authority score for a level (S14). */
export { SOURCE_LEVELS, sourceAuthority, strongestSource, DEPTH_BUDGETS };

// ---------------------------------------------------------------------------
// The Ascent engine facade (AD-15 provider-layer): the single object the
// provider exposes. Wraps the `LocalStore` + re-exports the module's
// pure compute surface so the page NEVER imports `@aurora/ascent`
// directly (AD-7/AD-15: module → repo → hook → page, never the inverse).
// ---------------------------------------------------------------------------

export interface AscentEngine {
  /** The store the engine reads from (the local mirror, AD-7). */
  store: LocalStore;
  /** Read the baseline + gaps inputs from the local mirrors. */
  readBaselineInputs: typeof readBaselineInputs;
  /** Build the `LearnerBaseline` (module SSoT, S6.2). */
  computeLearnerBaseline: typeof computeAscentLearnerBaseline;
  /** The depth selection (S13). */
  selectDepth: typeof computeSelectDepth;
  /** The hours-until target (S13). */
  hoursUntil: typeof computeHoursUntil;
  /** Is the goal time-constrained? */
  isTimeConstrained: typeof computeIsTimeConstrained;
  /** Build the full `AscentLearningIR` (S10/S13). */
  buildPath: typeof computeBuildAscentPath;
  /** The READ→DO→PROVE sequencing (S10). */
  sequencePhaseActivities: typeof computeSequencePhaseActivities;
  /** Event-driven adaptation (AD-9). */
  reactTo: typeof computeReactTo;
  /** The "Je bloque" flow (S14). */
  remediateBlocker: typeof computeRemediateBlocker;
  /** The kernel session context (S5/S7). */
  ascentSessionContext: typeof computeAscentSessionContext;
  /** The LearningCommands for one step's ACTIVE activities (AD-7). */
  collectLearningCommands: typeof computeCollectLearningCommands;
  /** The LearningCommands the kernel plans NOW. */
  currentLearningCommands: typeof computeCurrentLearningCommands;
  /** The read→do→prove phases for a step (S10). */
  phasesForStep: typeof computePhasesForStep;
  /** Reorder the phases (AD-1). */
  reorderPhases: typeof computeReorderPhases;
  /** Rank the source refs by authority (S14). */
  rankSources: typeof computeRankSources;
  /** Flag the hierarchy conflicts (S14). */
  flagConflicts: typeof computeFlagConflicts;
}

/**
 * Build the Ascent engine facade over a `LocalStore`. The engine is the
 * single object the `MobileDataProvider.ascentEngine` field exposes —
 * the page / `/goals/:id/ascent` reads through it and NEVER imports
 * `@aurora/ascent` directly (AD-7/AD-15). The module is the SSoT
 * (server-side pedagogy, AD-12) ; ce repo est le READ facade (AD-15).
 */
export function createAscentEngine(store: LocalStore): AscentEngine {
  return {
    store,
    readBaselineInputs,
    computeLearnerBaseline: computeAscentLearnerBaseline,
    selectDepth: computeSelectDepth,
    hoursUntil: computeHoursUntil,
    isTimeConstrained: computeIsTimeConstrained,
    buildPath: computeBuildAscentPath,
    sequencePhaseActivities: computeSequencePhaseActivities,
    reactTo: computeReactTo,
    remediateBlocker: computeRemediateBlocker,
    ascentSessionContext: computeAscentSessionContext,
    collectLearningCommands: computeCollectLearningCommands,
    currentLearningCommands: computeCurrentLearningCommands,
    phasesForStep: computePhasesForStep,
    reorderPhases: computeReorderPhases,
    rankSources: computeRankSources,
    flagConflicts: computeFlagConflicts,
  };
}

// ---------------------------------------------------------------------------
// Export surface — the type re-exports the page / tests consume
// ---------------------------------------------------------------------------

export type {
  BuildPathInput,
  AscentStepInput,
  DepthLevel,
  DepthSelectionInput,
  AscentSessionContext,
  LearningCommand,
  HierarchyConflict,
  SourceRefInfo,
};