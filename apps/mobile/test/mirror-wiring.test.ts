/**
 * mirror-wiring.test.ts (S6 M-62 — écran Miroir DANS le chat, v2 plan
 * Veille + Chat agentique).
 *
 * Contratuel node:test, SSoT `docs/adr/mirror-contract.md` (M-61 figé) :
 *  - Les 3 blocs du retour structuré (reformulation / findings typés /
 *    question) vivent dans le composant `MirrorFindingsCard`
 *    (`src/components/agent/mirror-findings-card.ts`) — la structure du
 *    HTML/JSX est testable sans React DOM (le composant est un module
 *    React pur, le test exerce sa logique d'étiquetage + les 2 actions).
 *  - Les détections = SSoT du module Learning (`kind:
 *    'gap' | 'contradiction' | 'error'`, `mirror-cognitive.ts`) — PAS les
 *    labels du briefing « Manquant / Fragile » (écart signalé M-61).
 *  - Les actions de la carte émettent des commandes typées (AD-7 thin —
 *    zéro écriture directe, zéro PowerSync) : « Planifier un Focus » =
 *    command focus.plan (le module Productivity applique) ; « Créer une
 *    veille » = command discovery.create (le module Discovery applique).
 *    « Valider » = command progress.evidence_create (M-63 : confirmation,
 *    le module Progress qualifie + écrit — F-07).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/mirror-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIRROR_FINDING_KINDS,
  MIRROR_FINDING_LABELS,
  mirrorFindingLabel,
  buildMirrorFindingsCard,
  mirrorCardActions,
  type MirrorCardFinding,
  type MirrorCardPayload,
} from '../src/components/agent/mirror-findings-card.ts';
import {
  computeMirrorFindings,
} from '../src/lib/learning-repo.ts';

// ---------------------------------------------------------------------------
// 1. Vocabulaire SSoT (M-61 : le doc l'emporte sur le briefing)
// ---------------------------------------------------------------------------

test('M-62 SSoT: les kinds de findings sont le vocabulaire Learning (gap/contradiction/error)', () => {
  // Le briefing v2 §5.2 parlait de « Manquant / Fragile » — écart signalé
  // (M-61, ADR mirror-contract.md) : la SSoT est le module Learning.
  assert.deepEqual(
    [...MIRROR_FINDING_KINDS],
    ['gap', 'contradiction', 'error'],
  );
  for (const kind of MIRROR_FINDING_KINDS) {
    const label = mirrorFindingLabel(kind);
    assert.ok(typeof label === 'string' && label.length > 0, `${kind} a un label`);
  }
  // Les labels FR de l'ADR : lacune / contradiction / erreur.
  assert.ok(MIRROR_FINDING_LABELS['gap']!.toLowerCase().includes('lacune'));
  assert.ok(MIRROR_FINDING_LABELS['contradiction']!.toLowerCase().includes('contradiction'));
  assert.ok(MIRROR_FINDING_LABELS['error']!.toLowerCase().includes('erreur'));
});

test('M-62 SSoT: le détecteur Learning alimente le payload de la carte', () => {
  const nodes = [
    { id: 'n1', label: 'Capacité portante', learningState: 'not-yet' },
    { id: 'n2', label: 'Nq', learningState: 'mastered' },
  ];
  const claims = [
    { text: 'La capacité dépend de Nc, Nq et Nγ', nodeId: 'n1' },
    { text: 'Nq varie avec φ', nodeId: 'n2' },
  ];
  const { findings } = computeMirrorFindings(claims, nodes);
  const payload: MirrorCardPayload = {
    reformulation: 'Trois facteurs : cohésion, surcharge, poids du sol.',
    findings,
    question: 'Que devient Nγ si la nappe affleure sous la semelle ?',
  };
  assert.equal(payload.findings.length, 1);
  assert.equal(payload.findings[0]!.kind, 'gap');
  // Le label dérivé du SSoT (pas le label du briefing).
  assert.equal(mirrorFindingLabel(payload.findings[0]!.kind), MIRROR_FINDING_LABELS['gap']);
});

// ---------------------------------------------------------------------------
// 2. Structure de la carte (les 3 blocs + le sujet — Stitch
//    `agent_mode_miroir_fraunces` AuroraEvaluationCard)
// ---------------------------------------------------------------------------

test('M-62 structure: la carte porte les 3 blocs du contrat (reformulation / findings / question)', () => {
  const findings: MirrorCardFinding[] = [
    { kind: 'gap', claimText: 'Nγ non mentionné', resolution: 'Ajouter Nγ', confidence: 0.7 },
    { kind: 'contradiction', claimText: 'φ constant', resolution: 'φ varie avec l’état', confidence: 0.6 },
  ];
  const card = buildMirrorFindingsCard({
    reformulation: 'Ce que j’ai compris : 3 facteurs pondérés.',
    findings,
    question: 'Et si la nappe affleure ?',
    subjectLabel: 'Fondations superficielles',
  });
  // Les 3 sections de l'ADR (ordre Stitch : reformulation, lacunes,
  // question — l'ordre de rendu du composant est fixé par `card.blocks`).
  assert.equal(card.blocks.length, 3, 'exactly 3 blocks (le contrat M-61)');
  assert.equal(card.blocks[0]!.kind, 'reformulation');
  assert.equal(card.blocks[1]!.kind, 'findings');
  assert.equal(card.blocks[2]!.kind, 'question');
  assert.equal(card.blocks[1]!.findings!.length, 2);
  // Le sujet (l'état de Stitch « Sujet : … + Changer ») est porté par la
  // carte (l'action « Changer » = commande UI, pas d'écriture).
  assert.equal(card.subjectLabel, 'Fondations superficielles');
});

test('M-62 structure: pas de findings → le bloc lacunes est vide (pas disparu)', () => {
  const card = buildMirrorFindingsCard({
    reformulation: 'Compris.',
    findings: [],
    question: 'Une question ?',
  });
  // L'ADR : les 3 blocs sont TOUJOURS rendus (jamais de bloc vide
  // masqué, AD-13 « l'erreur est affichée ») — le bloc findings existe
  // avec une liste vide (l'état vide = « Aucune lacune détectée. »).
  assert.equal(card.blocks.length, 3);
  assert.equal(card.blocks[1]!.kind, 'findings');
  assert.deepEqual(card.blocks[1]!.findings, []);
});

// ---------------------------------------------------------------------------
// 3. Actions de la carte (AD-7 : le chat PROPOSE — commandes typées,
//    zéro écriture directe, zéro PowerSync)
// ---------------------------------------------------------------------------

test('M-62 actions: « Planifier un Focus » / « Créer une veille » / « Valider » émettent des commandes (pas de write)', () => {
  const actions = mirrorCardActions({
    subjectId: 'sk-capacite-portante',
  });
  const ids = actions.map((a) => a.id);
  assert.deepEqual(
    ids,
    ['focus.plan', 'discovery.create', 'progress.evidence_validate'],
    'les 3 actions du Stitch + la validation (M-63)',
  );
  // AD-7 : chaque action est une commande typée (thin emitter) — le
  // module propriétaire applique la mutation, le chat n'écrit rien.
  for (const a of actions) {
    assert.ok(typeof a.command === 'string' && a.command.length > 0);
  }
  // « Planifier un Focus » = commande Focus (le module Productivity
  // applique — l'app ne crée JAMAIS l'event elle-même).
  assert.equal(actions[0]!.command, 'focus.plan');
  assert.equal((actions[0]!.payload as { skillId?: string }).skillId, 'sk-capacite-portante');
  // « Créer une veille » = commande Discovery (le module Discovery
  // applique — G1 writer automations, lot B AD-7).
  assert.equal(actions[1]!.command, 'discovery.create');
  // « Valider » = commande progress (M-63, ADR mirror-contract.md :
  // confirmation requise, Progress qualifie + écrit — F-07).
  assert.equal(actions[2]!.command, 'progress.evidence_create');
  assert.equal(actions[2]!.requiresConfirmation, true, 'valider une preuve = confirmation (ADR §5, M-63)');
});

test('M-62 actions: zéro écriture directe dans la carte (AD-7 invariant)', () => {
  // La carte ne contient AUCUNE fonction d'écriture (pas d'upsert, pas de
  // insert PowerSync) — les 3 actions sont toutes des `command` (thin).
  const actions = mirrorCardActions({});
  assert.ok(actions.every((a) => typeof a.command === 'string'));
  // La SSoT ADR : « l'agent propose, Progress commite » (F-07) — la
  // commande de validation porte le flag de confirmation (ce n'est PAS
  // une écriture silencieuse).
  const validate = actions.find((a) => a.id === 'progress.evidence_validate');
  assert.ok(validate, 'l’action de validation existe');
  assert.equal(validate!.requiresConfirmation, true);
});
