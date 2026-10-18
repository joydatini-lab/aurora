/**
 * canvas-run-wiring.ts — SSoT du branchement device-side du socle
 * agent ↔ canvas (lot Canvas AI, 2026-10-18).
 *
 * Le socle agentique canvas existe déjà (KERNEL_TOOLS G10
 * canvas_read/write/comment/create/lock dans packages/agent/src/tools.ts,
 * le module single-writer fn-canvas, le canal interne x-aurora-internal du
 * fn-agent-bootstrap) — il manquait la SURFACE device du chat, 2 pièces :
 *
 *   1. le MAPPING canvasId → URL : quand un run a touché un canvas
 *      (un step `canvas.*` porte `input.canvasId`), le chat peut
 *      afficher un CTA « Ouvrir le canvas » → `/canvas/<id>`. Le CTA
 *      actuel du menu agent va toujours `/canvas/new`, jamais le canvas
 *      que l'agent a réellement lu/écrit.
 *
 *   2. la DIFF « suggestion d'écriture » (le pattern Review Changes du
 *      doc Tiptap AI Toolkit, SANS l'add-on payant) : pour un prompt de
 *      confirmation `canvas_write`, on compare le contenu ACTUEL du bloc
 *      (lu via le client canvas) au nouveau contenu proposé
 *      (`prompt.input.markdown`) — l'UI de la carte de confirmation
 *      montre l'ancien vs le nouveau avant de Confirmer/Refuser.
 *
 * Zéro dépendance UI / réseau : module PUR testé directement (test
 * canvas-run-wiring.test.ts, node --experimental-strip-types),
 * consommé par `pages/agent/index.tsx`.
 */

// ---------------------------------------------------------------------------
// Le miroir `agent_runs.steps_json` (le shape que `agent-client.ts` lit)
// ---------------------------------------------------------------------------

/** Un step persisté du plan (le subset des champs consommés ici). */
export interface RawStep {
  kind?: unknown;
  status?: unknown;
  stepId?: unknown;
  tool?: unknown;
  input?: unknown;
  result?: unknown;
}

/** Une raw row du miroir `agent_runs` (le subset consommé ici). */
export interface RawCanvasRunRow {
  steps_json?: RawStep[] | string | null;
  confirmationTool?: string;
  confirmationStepInput?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// 1 — Le mapping canvasId → URL (le CTA « Ouvrir le canvas »)
// ---------------------------------------------------------------------------

/** L'id de canvas d'un step (`input.canvasId`), SSI le step est un tool
 *  canvas (les tool `canvas_read`/`canvas_write`/`canvas_comment`/
 *  `canvas_create`/`canvas_lock`/`canvas_rename` dans KERNEL_TOOLS,
 *  `packages/agent/src/tools.ts` G10 — les ids de tool sont en
 *  snake_case, les commandes typées qu'ils émettent en
 *  `canvas.<verb>`). Un tool non-canvas N'expose PAS l'id (ex: un
 *  `discovery_vault_read` qui par hasard porterait un champ
 *  `canvasId` ne compte pas comme un canvas touché). */
export function canvasIdOfStep(step: RawStep): string | undefined {
  const tool = typeof step.tool === 'string' ? step.tool : '';
  const isCanvasTool =
    tool.startsWith('canvas_') || tool === 'canvas_rename' || tool.startsWith('canvas.');
  if (!isCanvasTool) return undefined;
  const input = step.input;
  if (input === null || input === undefined || typeof input !== 'object') return undefined;
  const id = (input as Record<string, unknown>).canvasId;
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/** Tous les ids de canvas TOUCHÉS par un run (les steps `canvas.*`
 *  qui portent `input.canvasId`), dedupés, dans l'ordre de première
 *  apparition. Retourne `[]` quand le run n'a touché aucun canvas
 *  (pas de CTA à afficher). Jamais de crash (rows vides / malformés
 *  → `[]`). */
export function canvasIdsOf(row: RawCanvasRunRow): string[] {
  const steps: RawStep[] = Array.isArray(row.steps_json)
    ? (row.steps_json as RawStep[])
    : [];
  const seen: string[] = [];
  for (const s of steps) {
    const id = canvasIdOfStep(s ?? {});
    if (id !== undefined && !seen.includes(id)) seen.push(id);
  }
  return seen;
}

/** L'URL du canvas pour un id (le mapping id → `/canvas/<id>`).
 *  L'id vide renvoie `''` (pas d'URL, pas de CTA). */
export function buildCanvasUrl(canvasId: string): string {
  return canvasId !== '' ? `/canvas/${canvasId}` : '';
}

// ---------------------------------------------------------------------------
// 2 — La diff « suggestion d'écriture » (le Review Changes sans l'add-on)
// ---------------------------------------------------------------------------

/** La forme locale d'une session canvas courante (le SSoT `CanvasBlock[]`
 *  du domain — les blocks markdown de la session). Le client canvas
 *  (`canvas.get`) retourne ce shape. */
export interface CanvasSessionLike {
  blocks: Array<{ id: string; kind: string; content: string }>;
}

/** Une diff « suggestion » : le contenu ACTUEL du bloc cible vs le
 *  contenu PROPOSÉ (le `markdown` du prompt de confirmation). */
export interface CanvasDiff {
  canvasId: string;
  blockId: string;
  /** le contenu actuel du bloc cible (`''` si le bloc est à créer). */
  current: string;
  /** le contenu proposé (le `input.markdown` du prompt). */
  proposed: string;
}

/**
 * Construit la diff « suggestion d'écriture » d'un run qui s'arrête à
 * une confirmation `canvas_write` : on prend le `input.markdown` du
 * prompt (le nouveau contenu), le `input.blockId`/`input.canvasId`
 * (la cible), et on compare au contenu ACTUEL du bloc dans la session
 * courante (le `current` — `''` si le bloc est à créer).
 *
 * Retourne `null` quand la diff n'est PAS utile :
 *   - le prompt n'est PAS un `canvas_write` (pas de suggestion de
 *     contenu à montrer, la carte de confirmation reste le générique),
 *   - le `input` n'a pas de `markdown` (pas de contenu proposé),
 *   - le contenu proposé est IDENTIQUE au contenu actuel (rien à
 *     confirmer — le `markdown` est vide ET le bloc courant l'est).
 *
 * C'est le « minimum à intégrer » du doc Tiptap (le pattern Review
 * Changes) SANS l'add-on payant : l'UI montre l'ancien vs le nouveau,
 * l'utilisateur Confirme (la commande `canvas.write` est appliquée par
 * le module single-writer fn-canvas, AD-7) ou Refuse (le run reste en
 * pause, le bloc n'est pas touché).
 */
export function buildCanvasDiff(
  row: RawCanvasRunRow,
  current: CanvasSessionLike | null,
): CanvasDiff | null {
  if (row.confirmationTool !== 'canvas_write') return null;
  const input = row.confirmationStepInput;
  if (!input || typeof input !== 'object') return null;
  const proposed = typeof input.markdown === 'string' ? input.markdown : '';
  const canvasId = typeof input.canvasId === 'string' ? input.canvasId : '';
  const blockId = typeof input.blockId === 'string' ? input.blockId : '';
  if (proposed === '' && canvasId === '' && blockId === '') return null;
  const now =
    current?.blocks.find((b) => b.id === blockId)?.content ?? '';
  // Pas de diff utile : rien à confirmer (proposé vide + bloc vide).
  if (proposed === '' && now === '') return null;
  return { canvasId, blockId, current: now, proposed };
}
