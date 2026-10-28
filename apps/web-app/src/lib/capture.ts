/**
 * L5 — la logique de capture, PURE et testable sans DOM.
 *
 * LE CHEMIN QU'ELLE MATÉRIALISE (plan §5, AD-7 / F-03)
 *
 *   saisie utilisateur
 *     → `captureTask`  (module `productivity` : décide, produit une INTENTION)
 *       → `toDomainCommand` (adaptateur module → kernel : `op` + `id` + `patch`)
 *         → `LocalCommandRepository.apply('productivity', cmd)`
 *           → ligne locale + file d'upsync
 *
 * POURQUOI UN ADAPTATEUR EXPLICITE, ET PAS UN APPEL DIRECT
 * Le module `productivity` ne touche JAMAIS la base : il retourne un
 * `ProductivityCommand` (`tasks.ts:31-45`). Le kernel, lui, n'écrit jamais une
 * table : il émet un `DomainCommand` (`commands.ts`, F-09). Les deux formes
 * diffèrent sur trois points :
 *   - `op`     : le kernel l'exige (`'task.create'`) ; le module ne le porte pas
 *                (sa `table` est `'tasks'`) ;
 *   - `userId` : le kernel l'exige au niveau enveloppe (`CommandBase`) ; le
 *                module l'a déjà aplati dans son `patch` (`user_id`) ;
 *   - `title`  : le module écrit `subject` (le nom de COLONNE) ; le contrat du
 *                kernel documente `title` (le nom de DOMAINE).
 *
 * Cet adaptateur est le SEUL endroit qui connaît ces trois écarts. Le laisser
 * implicite (par exemple en poussant directement le `patch` du module dans
 * `apply`) reviendrait à écrire des colonnes fantômes — c'est exactement le
 * défaut que `packages/data/test/mirror-column-alias.test.ts` vient de fermer.
 */
import type { Task } from '@aurora/domain';
import type { ProductivityCommand } from '@aurora/productivity';
import { captureTask } from '@aurora/productivity';
import type { DomainCommand } from '@aurora/data';
import { OWNER_MODULE_BY_ENTITY } from '@aurora/data';

/** L'enveloppe de contexte que le kernel exige (AD-2 : temps serveur canonique). */
export interface CaptureContext {
  /** l'utilisateur connecté — la commande est RLS-scopée (01 S2.2). */
  userId: string;
  /** identité locale du client, pour les éléments OR-Set (03 S5.3). */
  clientId: string;
  /** horodatage canonique (ms). */
  now: number;
}

/** La table miroir que `productivity` possède pour cette commande. */
const OWNER_MODULE = 'productivity';

/**
 * `ProductivityCommand` (module) → `DomainCommand` (kernel).
 *
 * Le `patch` du module est déjà en snake_case de COLONNE (`subject`,
 * `user_id`, `tags`…). On ne le retraduit donc PAS : on ne fait que
 * reconstruire l'enveloppe que le kernel attend. `title` est retiré parce que
 * le module a déjà écrit `subject` — le laisser produirait la colonne fantôme
 * `title` que l'alias de `repositories.ts` traduit, mais mieux vaut ne pas
 * l'émettre du tout quand la source est déjà correcte.
 */
export function toDomainCommand(
  cmd: ProductivityCommand,
  ctx: CaptureContext,
): DomainCommand {
  const entity = cmd.table;
  const owner = OWNER_MODULE_BY_ENTITY[entity];
  if (owner !== OWNER_MODULE) {
    // AD-15 : la table doit appartenir au module qu'on nomme. Sinon la
    // commande sera rejetée par `apply` (single-writer, F-03) — on échoue ici,
    // plus près de la cause.
    throw new Error(
      `capture/toDomainCommand: la table "${entity}" n'est pas possédée par "${OWNER_MODULE}" (AD-15)`,
    );
  }
  const patch: Record<string, unknown> = { ...cmd.patch };
  delete patch.title; // le module a écrit `subject` (nom de colonne)
  delete patch.id; // porté par l'enveloppe, pas par le patch
  delete patch.user_id; // porté par `userId` de l'enveloppe (CommandBase)
  return {
    op: `${singular(entity)}.create`,
    id: cmd.id,
    userId: ctx.userId,
    patch,
  } as DomainCommand;
}

/** `tasks` → `task`, `calendar_events` → `calendarEvent` (forme des `op`). */
function singular(entity: string): string {
  const known: Record<string, string> = {
    tasks: 'task',
    subtasks: 'subtask',
    projects: 'project',
    goals: 'goal',
    milestones: 'milestone',
    habits: 'habit',
    routines: 'routine',
    focus_sessions: 'focusSession',
    calendar_events: 'calendarEvent',
    decisions: 'decision',
  };
  return known[entity] ?? entity;
}

/**
 * Le geste de capture complet, de la saisie à la commande kernel.
 * Lève quand le texte est vide — `captureTask` est la seule autorité sur
 * cette règle (`productivity/capture_empty`), on ne la duplique pas.
 */
export function buildCaptureCommand(
  text: string,
  ctx: CaptureContext,
  id: string,
): DomainCommand {
  const moduleCommand = captureTask(text, ctx, id);
  return toDomainCommand(moduleCommand, ctx);
}

/**
 * Le LECTEUR de la liste, à partir des lignes brutes du miroir. Il vit ici
 * (et non dans le composant) pour rester testable sans DOM, et il partage la
 * règle de nommage `subject`/`title` avec `data-session.ts`.
 */
export function toTaskList(rows: Task[]): Task[] {
  return [...rows].sort((a, b) => {
    // Les tâches ouvertes d'abord, puis du plus récent au plus ancien : c'est
    // l'ordre que la liste de capture doit montrer pour être lisible.
    const aDone = a.status === 'done' || a.status === 'cancelled';
    const bDone = b.status === 'done' || b.status === 'cancelled';
    if (aDone !== bDone) return aDone ? 1 : -1;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}

/** Les 5 états UX canoniques exigés par le plan §5 (critère 4). */
export type CaptureUxState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'partial';

/** Ce que l'état a besoin de savoir — aucune dépendance React. */
export interface CaptureUxInput {
  /** le miroir local s'initialise. */
  booting: boolean;
  /** l'init ou une écriture a échoué. */
  failed: boolean;
  /** la synchro est absente (pas de session Supabase) — AD-7 dégradé. */
  noSession: boolean;
  /** le nombre de tâches lues localement. */
  taskCount: number;
}

/**
 * Choisit l'état UX, dans l'ORDRE DE PRÉCÉDENCE du dépôt (`ux-states.ts` :
 * `killed > offline > états de requête`). Ici : échec > hors-ligne > chargement
 * > vide > partiel.
 *
 * POURQUOI `no-session` EST « hors-ligne » ET NON « erreur »
 * Le miroir local répond parfaitement ; seul le relais manque. Afficher une
 * erreur ferait croire à une panne et pousserait à ne pas capturer — alors que
 * la capture locale fonctionne (AD-7). C'est la distinction que le plan §5
 * exige (« ne pas confondre la base locale hors-ligne et l'exécution de
 * l'agent »).
 */
export function resolveCaptureUxState(input: CaptureUxInput): CaptureUxState {
  if (input.failed) return 'error';
  if (input.noSession) return 'offline';
  if (input.booting) return 'loading';
  if (input.taskCount === 0) return 'empty';
  return 'partial';
}

