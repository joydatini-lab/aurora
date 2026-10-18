/**
 * confirmations-wiring.test.ts — M-73 (S7 finitions) : le trou du S1.
 *
 * Le point de confirmation de l'agent (ADR §5, `delete_automation` G3,
 * veilles / focus / écritures) était affiché en LECTURE SEULE (la
 * `confirmationMessage` statique du miroir `agent_runs`) : la device
 * n'émettait JAMAIS `decisions[]` / `resumeFrom` → le run ne
 * reprenait jamais. Ce test gèle le contractuel du branchement :
 *
 *  - `extractPendingPrompt(steps_json)` → le prompt en attente (le
 *    `stepId` + le `stepHash` exact du step persisté par le
 *    dispatcher).
 *  - `buildConfirmationPayload(prompt, answer, agentRunId)` :
 *    - « Confirmer » → émet `resumeFrom` (le run reprend) +
 *      `decisions[]` avec le `stepHash` exact ;
 *    - « Refuser » → n'émet PAS `resumeFrom` (le run reste en pause,
 *      ne reprend pas) + la decision `rejected` seule (le kernel
 *      marque le step skipped) ;
 *    - le `stepHash` du prompt est toujours porté (le binding ; un
 *      hash divergent est traité par le kernel comme « pas de
 *      décision »).
 *  - `agent-client.ts` : `AgentRunRequest` porte `decisions[]` +
 *    `resumeFrom` (pas de `pendingPlan` client, 0024), `start()`
 *    transmet les champs au wire de `fn-agent-run` ;
 *    `mapAgentRunRow` expose le prompt (stepId + stepHash + tool)
 *    quand le miroir porte un step de confirmation en attente.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/confirmations-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPendingPrompt,
  buildConfirmationPayload,
  resumeRequest,
  type PendingPrompt,
} from '../src/lib/confirmations-wiring.ts';
import { createAgentClient } from '../src/lib/agent-client.ts';
// Le digest partagé (LOI D'EXCEPTION AD-12 « un seul kernel, côté
// serveur ») : le `stepHash` EST le `computeStepHash` du kernel
// (FNV-1a 64-bit sur `tool + canonical JSON(input)`). Le test importe le
// module SOURCE directement (le pattern des tests du lot B : le
// resolve hook de strip-types résout le chemin source, le re-export
// d'index du package n'est pas chargé) — une SEULE définition du
// digest, jamais de double implementation.
import { computeStepHash } from '../../../packages/agent/src/kernel.ts';

// ---------------------------------------------------------------------------
// SSoT : le stepHash partagé avec le kernel (le digest EST le
// `computeStepHash` du kernel — pas de double définition)
// ---------------------------------------------------------------------------

test('M-73 stepHash: le digest du prompt lu du miroir = le computeStepHash du kernel (le binding step exact)', () => {
  // Le prompt du miroir porte le `stepHash` estampé côté serveur au
  // prompt (`kernel.ts` L249-250) : le pairing device ↔ kernel est le
  // MÊME digest (FNV-1a 64-bit, canonique).
  const prompt: PendingPrompt = {
    stepId: 's2',
    stepHash: computeStepHash('delete_automation', { automationId: 'a1' }),
    tool: 'delete_automation',
    message: 'Supprimer le programme de veille ?',
  };
  // Le payload émit par la carte porte le stepHash EXACT du prompt :
  const p = buildConfirmationPayload(prompt, 'confirmed', '01J9RUNID');
  assert.equal(p.decisions![0].stepHash, prompt.stepHash, 'le stepHash exact est porté');
  // Le digest est canonique (l'ordre des clés n'importe pas) + dépend du
  // contenu du step (un autre tool / input → un autre hash) :
  assert.equal(
    computeStepHash('delete_automation', { automationId: 'a1', userId: 'u1' }),
    computeStepHash('delete_automation', { userId: 'u1', automationId: 'a1' }),
    'canonique : l' + 'ordre des clés n' + 'importe pas',
  );
  assert.notEqual(
    computeStepHash('delete_automation', { automationId: 'a1' }),
    computeStepHash('delete_automation', { automationId: 'a2' }),
    'input différent → hash différent',
  );
  assert.notEqual(
    computeStepHash('delete_automation', { automationId: 'a1' }),
    computeStepHash('create_automation', { automationId: 'a1' }),
    'tool différent → hash différent',
  );
  // Un digest DIVERGENT (le step a changé) est traité par le kernel
  // comme « pas de décision » : la decision ne doit pas le porter.
  const stale: PendingPrompt = {
    stepId: 's2',
    stepHash: computeStepHash('delete_automation', { automationId: 'OTHER' }),
    tool: 'delete_automation',
    message: 'Supprimer le programme ?',
  };
  const stalePayload = buildConfirmationPayload(stale, 'confirmed', '01J9RUNID');
  assert.notEqual(
    stalePayload.decisions![0].stepHash,
    prompt.stepHash,
    'un hash divergent reste porté (le kernel le rejette comme « pas de décision » — le test gèle le contrat, le kernel applique)',
  );
});

// ---------------------------------------------------------------------------
// SSoT : extraction du prompt du miroir
// ---------------------------------------------------------------------------

test('M-73 extractPendingPrompt: le premier step {kind: confirmation, pending} est extrait avec son stepHash exact', () => {
  const steps = [
    { kind: 'tool', status: 'done', stepId: 's1' },
    {
      kind: 'confirmation',
      status: 'pending',
      stepId: 's2',
      stepHash: 'a1b2c3d4e5f60708',
      tool: 'delete_automation',
      message: 'Supprimer le programme de veille ?',
      input: { automationId: 'a1' },
    },
  ];
  const prompt = extractPendingPrompt(steps);
  assert.ok(prompt, 'le prompt en attente est extrait');
  assert.equal(prompt!.stepId, 's2', 'stepId du prompt');
  assert.equal(prompt!.stepHash, 'a1b2c3d4e5f60708', 'le stepHash exact du step');
  assert.equal(prompt!.tool, 'delete_automation', 'l' + "étiquette du tool (le label du step dans la carte)");
  assert.equal(prompt!.message, 'Supprimer le programme de veille ?');
});

test('M-73 extractPendingPrompt: miroir vide ou step non-pending → null (pas de carte)', () => {
  assert.equal(extractPendingPrompt([]), null, 'liste vide → pas de prompt');
  assert.equal(
    extractPendingPrompt([
      { kind: 'confirmation', status: 'done', stepId: 's1', message: 'x' },
    ]),
    null,
    'step terminé → pas de prompt en attente',
  );
  assert.equal(extractPendingPrompt([null]), null, 'entry null tolérée');
});

// ---------------------------------------------------------------------------
// SSoT : le payload du tap (Confirmer / Refuser)
// ---------------------------------------------------------------------------

const prompt: PendingPrompt = {
  stepId: 's2',
  stepHash: 'a1b2c3d4e5f60708',
  tool: 'delete_automation',
  message: 'Supprimer le programme de veille ?',
};

test('M-73 buildConfirmationPayload: « Confirmer » émet resumeFrom + decisions[] avec le stepHash exact', () => {
  const p = buildConfirmationPayload(prompt, 'confirmed', '01J9RUNID');
  assert.deepEqual(
    p.decisions,
    [{ stepId: 's2', answer: 'confirmed', stepHash: 'a1b2c3d4e5f60708' }],
    'une decision, le stepHash exact du prompt porté',
  );
  assert.deepEqual(
    p.resumeFrom,
    { agentRunId: '01J9RUNID' },
    'Confirmer → le handle de reprise (le run reprend)',
  );
});

test('M-73 buildConfirmationPayload: « Refuser » n’émet PAS resumeFrom (le run reste en pause, ne reprend pas)', () => {
  const p = buildConfirmationPayload(prompt, 'rejected', '01J9RUNID');
  assert.equal(p.resumeFrom, undefined, 'Refuser → aucun resumeFrom (le run ne reprend pas)');
  assert.deepEqual(
    p.decisions,
    [{ stepId: 's2', answer: 'rejected', stepHash: 'a1b2c3d4e5f60708' }],
    'la decision rejected porte le stepHash exact (le kernel marque le step skipped)',
  );
});

test('M-73 buildConfirmationPayload: prompt sans stepHash (run pré-bis) → decision sans stepHash', () => {
  const legacy: PendingPrompt = { stepId: 's3', message: 'Confirm ?' };
  const p = buildConfirmationPayload(legacy, 'confirmed', '01J9RUNID');
  assert.deepEqual(p.decisions, [{ stepId: 's3', answer: 'confirmed' }], 'pas de stepHash inventé');
  assert.deepEqual(p.resumeFrom, { agentRunId: '01J9RUNID' }, 'la reprise porte le handle');
});

test('M-73 resumeRequest: l' + "assemblage du request de reprise ne porte jamais un plan client", () => {
  const p = buildConfirmationPayload(prompt, 'confirmed', '01J9RUNID');
  const req = resumeRequest('Supprime mon programme de veille', p);
  assert.equal(req.intent, 'Supprime mon programme de veille', "l'intent du run stoppé est re-porté");
  assert.ok(Array.isArray(req.decisions), 'les decisions sont portées');
  assert.equal(req.decisions![0].stepHash, 'a1b2c3d4e5f60708', 'le stepHash exact');
  assert.deepEqual(req.resumeFrom, { agentRunId: '01J9RUNID' }, 'seulement le handle');
  // 0024 : le plan est rechargé côté serveur — JAMAIS un champ plan client.
  assert.deepEqual(req, { ...req, ...(req as Record<string, unknown>) }, 'shape fermé');
  assert.ok(
    !('pendingPlan' in (req as unknown as Record<string, unknown>)),
    'pas de pendingPlan (fn-agent-run le rejette avec 400 agent/plan_not_accepted)',
  );

  const rej = resumeRequest('x', buildConfirmationPayload(prompt, 'rejected', '01J9RUNID'));
  assert.equal(rej.resumeFrom, undefined, 'Refuser → pas de reprise dans le request');
});

// ---------------------------------------------------------------------------
// agent-client.ts : le request porte decisions[] + resumeFrom (pas de
// pendingPlan) ; start() transmet les champs au wire ; le miroir expose
// le prompt du step en attente.
// ---------------------------------------------------------------------------

function makeFakeSupabase(overrides?: {
  rows?: Record<string, unknown>[];
  extraRow?: Record<string, unknown>;
  calls?: Array<{ fn: string; body?: unknown }>;
}) {
  const calls = overrides?.calls ?? [];
  return {
    calls,
    auth: {
      getSession: async () => ({ data: { session: {} } }),
    },
    functions: {
      invoke: async (fn: string, opts?: { body?: unknown }) => {
        calls.push({ fn, body: opts?.body });
        return {
          data: { ok: true, data: { agentRunId: '01J9NEW', jobId: 'j1', traceId: 'uuid-1' } },
          error: null,
        };
      },
    },
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => ({}) }),
        eq: () => ({
          then: (
            resolve: (v: { data: Record<string, unknown>[] | null; error: null }) => void,
          ) => resolve({ data: overrides?.extraRow ? [overrides.extraRow] : overrides?.rows ?? [], error: null }),
        }),
      }),
    }),
  } as unknown as import('@aurora/data').AuroraSupabaseClient;
}

test('M-73 agent-client: start() transmet decisions[] + resumeFrom au wire de fn-agent-run', async () => {
  const calls: Array<{ fn: string; body?: unknown }> = [];
  const client = createAgentClient(makeFakeSupabase({ calls }));
  await client.start({
    intent: 'Supprime mon programme de veille',
    decisions: [{ stepId: 's2', answer: 'confirmed', stepHash: 'a1b2c3d4e5f60708' }],
    resumeFrom: { agentRunId: '01J9RUNID' },
  });
  assert.equal(calls.length, 1, 'un appel fn-agent-run');
  assert.equal(calls[0]!.fn, 'fn-agent-run');
  const body = calls[0]!.body as Record<string, unknown>;
  assert.deepEqual(
    body.decisions,
    [{ stepId: 's2', answer: 'confirmed', stepHash: 'a1b2c3d4e5f60708' }],
    'les decisions sont au wire (la stepHash exacte)',
  );
  assert.deepEqual(body.resumeFrom, { agentRunId: '01J9RUNID' }, 'le handle de reprise est au wire');
  assert.equal('pendingPlan' in (body.resumeFrom as Record<string, unknown>), false, 'jamais un plan client (0024)');
});

test('M-73 agent-client: start() sans decisions (run neuf) ne porte ni decisions ni resumeFrom', async () => {
  const calls: Array<{ fn: string; body?: unknown }> = [];
  const client = createAgentClient(makeFakeSupabase({ calls }));
  await client.start({ intent: 'Crée une veille sur IA' });
  const body = calls[0]!.body as Record<string, unknown>;
  assert.equal(body.decisions, undefined, 'pas de decisions sur un run neuf');
  assert.equal(body.resumeFrom, undefined, 'pas de reprise sur un run neuf');
});

test('M-73 agent-client: mapAgentRunRow expose le prompt (stepId + stepHash + tool) du step de confirmation en attente', async () => {
  const client = createAgentClient(
    makeFakeSupabase({
      extraRow: {
        id: 'uuid-9',
        user_id: 'u1',
        intent: 'Supprime mon programme de veille',
        status: 'running',
        trace_id: '01J9RUNID',
        started_at: '2026-10-18T00:00:00.000Z',
        steps_json: [
          { kind: 'tool', status: 'done', stepId: 's1' },
          {
            kind: 'confirmation',
            status: 'pending',
            stepId: 's2',
            stepHash: 'a1b2c3d4e5f60708',
            tool: 'delete_automation',
            message: 'Supprimer le programme de veille ?',
          },
        ],
      },
    }),
  );
  const row = await client.run('uuid-9');
  assert.ok(row, 'la row est lue');
  assert.equal(row.confirmationStepId, 's2', 'le stepId du prompt (la key de la decision)');
  assert.equal(row.confirmationStepHash, 'a1b2c3d4e5f60708', 'le stepHash exact du prompt');
  assert.equal(row.confirmationTool, 'delete_automation', "l'étiquette du tool (le label du step)");
  assert.equal(row.confirmationMessage, 'Supprimer le programme de veille ?', 'le message §12');
});

test('M-73 agent-client: miroir sans step pending → le prompt est absent (pas de carte)', async () => {
  const client = createAgentClient(
    makeFakeSupabase({
      extraRow: {
        id: 'uuid-9',
        user_id: 'u1',
        intent: 'x',
        status: 'completed',
        trace_id: '01J9',
        started_at: '2026-10-18T00:00:00.000Z',
        steps_json: [{ kind: 'tool', status: 'done', stepId: 's1' }],
      },
    }),
  );
  const row = await client.run('uuid-9');
  assert.equal(row!.confirmationStepId, undefined, 'pas de prompt');
  assert.equal(row!.confirmationStepHash, undefined);
  assert.equal(row!.confirmationTool, undefined);
});
