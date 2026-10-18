/**
 * M-63 (S6, plan v2 Veille + Chat agentique) — validation Miroir →
 * preuve Progress (F-07 : l'agent PROPOSE, Progress COMMITE).
 *
 * Contratuel node:test, SSoT `docs/adr/mirror-contract.md` (M-61 figé) :
 *  - Le kernel expose un outil thin `progress_evidence_create` (le même
 *    pattern AD-7 que les `goal.*` : il EMET la commande typée
 *    `progress.evidence_create`, le module Progress applique — le
 *    kernel n'écrit JAMAIS `progress_evidences` (AD-2, F-07)).
 *  - L'entrée porte la détection Miroir validée : le sujet (le
 *    `skillId` du run) + le `kind` SSoT de la finding (le vocabulaire
 *    Learning `gap | contradiction | error`, M-61) + la provenance
 *    AD-11 optionnelle (le `sourceNode` du corpus du miroir).
 *  - La capacité `progress.evidence_create` exige une confirmation
 *    utilisateur (ADR §5, briefing §12 : la validation d’une preuve
 *    = action importante / irréversible) ; le write scope est celui
 *    du module propriétaire (`progress:write`).
 *
 * Run: `pnpm --filter @aurora/agent test`
 * Node 22: `node --experimental-strip-types --test test/m63-evidence.test.ts`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  KERNEL_TOOLS,
  ALL_TOOL_IDS,
  DefaultCapabilityRegistry,
} from '../src/index.ts';
import { progressEvidenceCreate } from '../src/tools.ts';

// ---------------------------------------------------------------------------
// 1. L'outil existe + est thin (AD-7 : commande typée, pas de write)
// ---------------------------------------------------------------------------

test('M-63 kernel: progress_evidence_create existe dans KERNEL_TOOLS (thin emitter)', () => {
  assert.ok('progress_evidence_create' in KERNEL_TOOLS, 'l’outil est enregistré');
  // AD-2 / F-07 : le kernel EMET, le module Progress APPLIQUE — pas de
  // heavy job (contrairement à mirror_analyze qui est un agent_run job).
  const r = progressEvidenceCreate.execute(
    { skillId: 'sk-capacite-portante', kind: 'gap' },
    {} as never,
    undefined as never,
  );
  return r.then((res: Record<string, unknown>) => {
    assert.ok(!('jobKind' in res) || res.jobKind === undefined,
      'pas de jobKind (thin command, pas de heavy job) — AD-7');
  });
});

test('M-63 kernel: ALL_TOOL_IDS inclut progress_evidence_create (derivation auto, sdk.ts)', () => {
  assert.ok(
    (ALL_TOOL_IDS as readonly string[]).includes('progress_evidence_create'),
    'l’ID est dans le set fermé des outils du kernel (ALL_TOOL_IDS dérive de KERNEL_TOOLS)',
  );
});

// ---------------------------------------------------------------------------
// 2. L'émission est une commande typée (AD-7 : le module cible applique)
// ---------------------------------------------------------------------------

test('M-63 emission: l’outil émet `progress.evidence_create` (la commande du module Progress)', async () => {
  const res = (await progressEvidenceCreate.execute(
    { skillId: 'sk-capacite-portante', kind: 'error' },
    {} as never,
    undefined as never,
  )) as Record<string, unknown>;
  assert.equal(res.ok, true, 'l’émission est réussie (le kernel ne décide pas, il signale)');
  assert.equal(res.command, 'progress.evidence_create',
    'la commande typée est `progress.evidence_create` (le module Progress l’applique, F-07)');
  // Le payload est le contrat entre l'agent et le module Progress
  // (le module qualifie la preuve à partir de ces champs).
  const payload = res.payload as Record<string, unknown>;
  assert.equal(payload.skillId, 'sk-capacite-portante');
  assert.equal(payload.kind, 'error');
});

// ---------------------------------------------------------------------------
// 3. La capacité exige une confirmation (ADR §5, M-63 = OUI)
// ---------------------------------------------------------------------------

test('M-63 capability: progress.evidence_create est enregistrée + requiresConfirmation: true', () => {
  const reg = new DefaultCapabilityRegistry();
  const entry = reg.get('progress.evidence_create');
  assert.ok(entry, 'la capacité `progress.evidence_create` est seedée');
  assert.equal(entry!.tool, 'progress_evidence_create', 'la capacité pointe sur l’outil thin');
  assert.equal(entry!.requiresConfirmation, true,
    'la validation d’une preuve = confirmation OBLIGATOIRE (ADR §5, briefing §12)');
  // AD-7 : seul le module Progress écrit `progress_evidences`.
  assert.ok(entry!.writeScopes.includes('progress:write'),
    'la write scope est `progress:write` (le module Progress est le seul producteur, F-07)');
  // La provenance AD-11 (le corpus du miroir) est lue via `learning:read`.
  assert.ok(entry!.readScopes.includes('learning:read'),
    'la provenance (le corpus du miroir) est lue via `learning:read` (AD-11)');
});

test('M-63 capability: byTool("progress_evidence_create") résout progress.evidence_create', () => {
  const reg = new DefaultCapabilityRegistry();
  const resolved = reg.byTool('progress_evidence_create');
  assert.ok(resolved, 'le byTool résout l’outil à la capacité');
  assert.equal(resolved!.id, 'progress.evidence_create');
});

// ---------------------------------------------------------------------------
// 4. La provenance AD-11 (le corpus du miroir) est transportée dans le payload
// ---------------------------------------------------------------------------

test('M-63 AD-11: la provenance (sourceNode du corpus) est portée dans le payload émis', async () => {
  const res = (await progressEvidenceCreate.execute(
    {
      skillId: 'sk-capacite-portante',
      kind: 'gap',
      sourceNode: 'n1', // le nodeId de la claim du corpus (M-61 : AD-11)
    },
    {} as never,
    undefined as never,
  )) as Record<string, unknown>;
  assert.equal(res.command, 'progress.evidence_create');
  const payload = res.payload as Record<string, unknown>;
  assert.equal(payload.sourceNode, 'n1',
    'la provenance AD-11 traverse le kernel (le module Progress la qualifie dans la row)');
});

test('M-63 AD-11: pas de sourceNode → le payload ne porte pas le champ (optionnel, AD-1)', async () => {
  const res = (await progressEvidenceCreate.execute(
    { skillId: 'sk-capacite-portante', kind: 'contradiction' },
    {} as never,
    undefined as never,
  )) as Record<string, unknown>;
  const payload = res.payload as Record<string, unknown>;
  assert.ok(!('sourceNode' in payload) || payload.sourceNode === undefined,
    'la provenance est optionnelle (le miroir peut d’ aucun nodeId)');
});

// ---------------------------------------------------------------------------
// 5. Invariant F-07 (l'agent n'écrit JAMAIS une ProgressEvidence)
// ---------------------------------------------------------------------------

test('M-63 F-07: le kernel émet la commande, il ne produit PAS l’event ProgressEvidenceCreated', async () => {
  // L'événement AD-9 `ProgressEvidenceCreated` est émis par le module
  // Progress après l'écriture de la row (F-07 / AD-2, single-writer) —
  // le kernel renvoie uniquement `{ ok, command, payload }`.
  const res = (await progressEvidenceCreate.execute(
    { skillId: 'sk-capacite-portante', kind: 'gap' },
    {} as never,
    undefined as never,
  )) as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(res).sort(),
    ['command', 'ok', 'payload'],
    'l’émission est `{ ok, command, payload }` — aucun `event` (zéro ProgressEvidenceCreated ici)',
  );
});
