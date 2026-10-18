/**
 * confirmations-wiring.ts — M-73 (S7 finitions, le trou du S1) : le
 * branchement device-side des points de confirmation de l'agent.
 *
 * Contrat (fn-agent-run / packages/agent, LOT 1-bis Story 1.1-bis) :
 *   - Le run du kernel s'arrête à un point de confirmation ; le prompt
 *     est persisté sur `agent_runs` (steps_json: step `{ kind:
 *     'confirmation', status: 'pending', message, stepId, stepHash,
 *     tool, input }`). La device lit le miroir (AD-7) via
 *     `agent-client.ts` — ce module en est la SSoT pure.
 *   - Réponse device → le run SUIVANT est relancé avec
 *     `{ decisions: [{ stepId, stepHash, answer }], resumeFrom: { agentRunId } }`
 *     (fn-agent-run enfile `agent_run` ; le dispatcher reconstruit le
 *     KernelRequest ; le kernel re-charge le plan côté serveur via
 *     `resumePlan`, JAMAIS depuis le client — 0024).
 *
 * Règles (s'attachent à un test de l'appelant) :
 *   - « Confirmer » → émet `resumeFrom` (le run reprend au step suivant).
 *   - « Refuser »  → n'émet PAS `resumeFrom` (le run reste en pause,
 *     ne reprend pas) ; la decision `rejected` est transmise seule, le
 *     kernel marque le step skipped.
 *   - Le `stepHash` exact du prompt est porté par la decision : un
 *     hash divergent est traité par le kernel comme « pas de décision »
 *     (re-prompt, jamais auto-confirm).
 *
 * Zéro dépendance UI : module testé directement (test/confirmations-
 * wiring.test.ts), consommé par `pages/agent/index.tsx` +
 * `lib/agent-client.ts`.
 */

// ---------------------------------------------------------------------------
// Prompt en attente (vue device du step de confirmation du miroir)
// ---------------------------------------------------------------------------

/**
 * Un prompt de confirmation lu sur le miroir `agent_runs` : le step
 * `steps_json` `{ kind: 'confirmation', status: 'pending', … }` (le
 * dispatcher persiste le plan du run stoppé ; `stepHash` = le hash
 * FNV-1a 64-bit du contenu du step, estampé côté serveur au moment du
 * prompt).
 */
export interface PendingPrompt {
  /** le `stepId` du step en attente (la key de la decision). */
  stepId: string;
  /** le hash de contenu du step (le binding decision → step exact). */
  stepHash?: string;
  /** le `tool` du step (affiché dans la carte de confirmation). */
  tool?: string;
  /** le message du prompt (la wording §12, affichée telle quelle). */
  message: string;
}

// ---------------------------------------------------------------------------
// Décision device (le payload du run de reprise)
// ---------------------------------------------------------------------------

/** La decision user, portée par le run de reprise (vocabulaire fermé). */
export type ConfirmationAnswer = 'confirmed' | 'rejected';

/** Une decision normalisée (la forme que fn-agent-run normalise). */
export interface AgentDecision {
  stepId: string;
  answer: ConfirmationAnswer;
  /** le hash de contenu exact du step (absent = run pré-bis). */
  stepHash?: string;
}

/** Le payload qu'un tap de carte produit (prêt à passer au client). */
export interface ConfirmationPayload {
  /**
   * Les decisions à porter par le run de reprise. Exactement une
   * décision : `{ stepId, answer }` + le `stepHash` exact quand le
   * prompt en portait un.
   */
  decisions: AgentDecision[];
  /**
   * « Confirmer » → le handle de reprise (`agentRunId` du run stoppé,
   * 0024 : le plan est re-chargé côté serveur, jamais un plan client).
   * « Refuser » → ABSENT : le run reste en pause, ne reprend pas —
   * seule la decision `rejected` est transmise (le kernel marque le
   * step skipped, le run suivant reste `awaiting-confirmation`).
   */
  resumeFrom?: { agentRunId: string };
}

// ---------------------------------------------------------------------------
// Extraction du prompt du miroir (steps_json → PendingPrompt)
// ---------------------------------------------------------------------------

/**
 * Un raw `steps_json` entry (le format que `agent-client.mapAgentRunRow`
 * lit : `{ kind: 'confirmation', status: 'pending', message, stepId,
 * stepHash, tool, input }`). Tout autre entry est ignoré.
 */
export interface RawConfirmationStep {
  kind?: unknown;
  status?: unknown;
  stepId?: unknown;
  stepHash?: unknown;
  tool?: unknown;
  message?: unknown;
  input?: unknown;
}

/**
 * Extrait le prompt de confirmation en attente d'une liste de steps
 * bruts (le miroir `agent_runs.steps_json`). Le PREMIER step
 * `{ kind: 'confirmation', status: 'pending' }` est retenu (un run
 * stoppé ne porte qu'un point de confirmation actif). Retourne `null`
 * quand aucun step n'est un prompt de confirmation en attente (le
 * miroir est vide, ou le run est terminé — pas de carte à montrer).
 */
export function extractPendingPrompt(
  steps: ReadonlyArray<RawConfirmationStep | null | undefined>,
): PendingPrompt | null {
  for (const s of steps) {
    if (!s || s.kind !== 'confirmation' || s.status !== 'pending') continue;
    if (typeof s.stepId !== 'string' || s.stepId === '') continue;
    return {
      stepId: s.stepId,
      stepHash: typeof s.stepHash === 'string' && s.stepHash !== '' ? s.stepHash : undefined,
      tool: typeof s.tool === 'string' ? s.tool : undefined,
      message: typeof s.message === 'string' ? s.message : '',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Construction du payload (le handler de la carte de confirmation)
// ---------------------------------------------------------------------------

/**
 * Le handler pur de la carte de confirmation (M-73) : le tap
 * Confirmer/Refuser + le prompt lû du miroir + le handle du run stoppé
 * → le payload du run de reprise.
 *
 * - `answer === 'confirmed'` → `decisions` + `resumeFrom` (la reprise).
 * - `answer === 'rejected'`  → `decisions` UNIQUEMENT (pas de
 *   `resumeFrom` : le run reste en pause, ne reprend pas).
 * - Le `stepHash` exact du prompt est porté quand présent (le binding ;
 *   le kernel rejette un hash divergent comme « pas de décision »).
 */
export function buildConfirmationPayload(
  prompt: PendingPrompt,
  answer: ConfirmationAnswer,
  agentRunId: string,
): ConfirmationPayload {
  const decision: AgentDecision = {
    stepId: prompt.stepId,
    answer,
    ...(prompt.stepHash !== undefined ? { stepHash: prompt.stepHash } : {}),
  };
  return {
    decisions: [decision],
    ...(answer === 'confirmed' && agentRunId !== ''
      ? { resumeFrom: { agentRunId } }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Extension du request du client (la forme qu'`AgentClient.start`
// porte vers fn-agent-run)
// ---------------------------------------------------------------------------

/**
 * Le champ additionnel du request de run (le device-side mirror de
 * `fn-agent-run` `AgentRunRequest.decisions`) : les decisions
 * normalisées. Exporté pour que `lib/agent-client.ts` et le handler de
 * la carte partagent UNE SSoT (pas de re-déclaration du shape).
 */
export type AgentRunDecisions = AgentDecision[];

/**
 * Le champ `resumeFrom` du request de run : SEULEMENT le handle
 * (`agentRunId`) — le plan est rechargé côté serveur (0024) ; un champ
 * `pendingPlan` client est rejeté par fn-agent-run avec 400
 * `agent/plan_not_accepted` (ne le porter jamais).
 */
export interface AgentResumeFrom {
  agentRunId: string;
}

/**
 * Assemble le request de reprise (le run SUIVANT, pas un nouveau
 * intent) : les decisions + le handle de reprise. L'intent du run
 * stoppé est re-porté (le kernel le re-classe ; le plan rechargé est
 * le SSoT).
 */
export function resumeRequest(
  intent: string,
  payload: ConfirmationPayload,
): {
  intent: string;
  decisions?: AgentRunDecisions;
  resumeFrom?: AgentResumeFrom;
} {
  return {
    intent,
    ...(payload.decisions.length > 0 ? { decisions: payload.decisions } : {}),
    ...(payload.resumeFrom !== undefined ? { resumeFrom: payload.resumeFrom } : {}),
  };
}
