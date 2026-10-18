/**
 * M-63 (S6, plan v2 Veille + Chat agentique) — validation Miroir →
 * preuve Progress (F-07 : l'agent PROPOSE, Progress COMMITE).
 *
 * Côté module Progress (le seul producteur de `ProgressEvidence`, AD-2) :
 *  - `evidenceFromMirrorValidation` qualifie la commande typée
 *    `progress.evidence_create` (émise par le kernel, M-63) en une
 *    `ProgressEvidence` de type SSoT `personal-explanation` (le
 *    ADR mirror-contract.md M-61 : la reformulation explicative du
 *    miroir EST une preuve de type explication personnelle).
 *  - La provenance AD-11 traverse : le `sourceNode` du payload (le
 *    `nodeId` du corpus qui a déclenché la détection) est qualifié
 *    dans `sourceEventId` + `context` de la row (l’événement
 *    `ProgressEvidenceCreated` AD-9 porte la provenance — le
 *    downstream lit l'origine sans relire le corpus).
 *  - Une détection NON validée n'émet JAMAIS de preuve (F-07
 *    invariant : le bouton « Valider » du chat M-62 est la SEULE
 *    entrée qui produit une preuve miroir ; l'absence de `validated`
 *    dans le payload = zéro row `progress_evidences`).
 *
 * Run: `pnpm --filter @aurora/progress test`
 * Node 22: `node --experimental-strip-types --test test/m63-mirror-evidence.test.ts`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  evidenceFromMirrorValidation,
  buildProgressEvidenceCreated,
  buildEvidence,
} from '../src/index.ts';
import { EVIDENCE_TYPES } from '../src/evidence.ts';

const NOW = '2026-10-18T10:00:00.000Z';

/** Le payload minimal que le kernel émet (le `progressEvidenceCreate`
 *  de packages/agent, M-63) — le module Progress le lit pour écrire
 *  la row (le cross-package import est interdit ici, AD-15 : le
 *  contrat est le shape du payload, pas le code de l'agent). */
type MirrorEvidencePayload = {
  skillId?: string;
  type?: string;
  kind?: string;
  sourceNode?: string;
  userId?: string;
};

// ---------------------------------------------------------------------------
// 1. Une détection NON validée n'émet JAMAIS de preuve (F-07)
// ---------------------------------------------------------------------------

test('M-63 F-07: payload sans le flag validated=true → zéro preuve (pas de row)', () => {
  // Le bouton « Valider » du chat M-62 porte TOUJOURS `validated: true`
  // (la confirmation utilisateur, ADR §5) — sans ce flag, le module
  // Progress ne qualifie RIEN (une détection non validée n'est pas une
  // preuve, l'invariant F-07 est préservé : zéro row écrite).
  const unvalidated: MirrorEvidencePayload = {
    skillId: 'sk-capacite-portante',
    kind: 'gap',
    // volontairement pas `validated: true`
  };
  assert.throws(
    () => evidenceFromMirrorValidation(unvalidated, { now: NOW, userId: 'u1' }),
    /progress\/mirror_unvalidated|progress\/unknown/,
    'pas de `validated` → le module refuse (jamais de preuve non validée)',
  );
});

test('M-63 F-07: le type du payload miroir est `personal-explanation` (le SSoT ADR M-61)', () => {
  // La reformulation explicative du miroir est une preuve d'explication
  // personnelle (le doc learning/overview.md §21 : le miroir produit
  // une explication réinvestie, pas un QCM ni un exercice) — le type
  // est figé par l'ADR, le module le qualifie, pas l'agent.
  assert.ok(EVIDENCE_TYPES.includes('personal-explanation'));
  const ev = evidenceFromMirrorValidation(
    { skillId: 'sk-x', kind: 'gap', validated: true, userId: 'u1' },
    { now: NOW, userId: 'u1' },
  );
  assert.equal(ev.type, 'personal-explanation');
});

// ---------------------------------------------------------------------------
// 2. Après validation, le module Progress écrit la preuve (F-07)
// ---------------------------------------------------------------------------

test('M-63 F-07: validated=true → une ProgressEvidence `personal-explanation` est produite', () => {
  const ev = evidenceFromMirrorValidation(
    { skillId: 'sk-capacite-portante', kind: 'gap', validated: true, userId: 'u1' },
    { now: NOW, userId: 'u1' },
  );
  // Le shape minimal de la row SSoT (le `ProgressEvidence` du domain).
  assert.equal(ev.type, 'personal-explanation');
  assert.equal(ev.skillId, 'sk-capacite-portante');
  assert.equal(ev.userId, 'u1');
  assert.equal(ev.observedAt, NOW);
  // Le niveau est `comprehended` (le miroir qualifie une COMPREHENSION
  // explicite du sujet — pas de `mastered` sans preuve de réinvestissement).
  assert.equal(ev.level, 'comprehended');
});

test('M-63 F-07: la preuve produite passe le vérifieur buildEvidence (le type est légal)', () => {
  // Le `buildEvidence` (la factory SSoT F-07) rejette tout type hors du
  // set fermé `EVIDENCE_TYPES` — le type qualifié miroir doit passer.
  const e = buildEvidence({
    userId: 'u1',
    skillId: 'sk-x',
    type: 'personal-explanation',
    level: 'comprehended',
    observedAt: NOW,
  });
  assert.equal(e.type, 'personal-explanation');
});

// ---------------------------------------------------------------------------
// 3. La provenance AD-11 traverse jusqu'à la row + l’événement AD-9
// ---------------------------------------------------------------------------

test('M-63 AD-11: le sourceNode du payload est qualifié dans sourceEventId + context', () => {
  const ev = evidenceFromMirrorValidation(
    {
      skillId: 'sk-capacite-portante',
      kind: 'error',
      validated: true,
      sourceNode: 'n1',
      userId: 'u1',
    },
    { now: NOW, userId: 'u1' },
  );
  assert.equal(ev.sourceEventId, 'n1',
    'le nodeId du corpus (la provenance AD-11) est porté dans sourceEventId');
  assert.ok(ev.context?.includes('n1'),
    'le context de la row mentionne la provenance (le downstream lit l’origine sans relire le corpus)');
  assert.ok(ev.context?.includes('mirror'),
    'le context signale l’origine miroir (le tag AD-11 de la provenance)');
});

test('M-63 AD-11: l’événement ProgressEvidenceCreated (AD-9) porte la provenance', () => {
  const ev = evidenceFromMirrorValidation(
    {
      skillId: 'sk-capacite-portante',
      kind: 'contradiction',
      validated: true,
      sourceNode: 'n2',
      userId: 'u1',
    },
    { now: NOW, userId: 'u1' },
  );
  const evt = buildProgressEvidenceCreated(ev, NOW);
  assert.equal(evt.type, 'ProgressEvidenceCreated');
  // La provenance AD-11 traverse l’événement (le consumer lit
  // `sourceEventId` sans relire le corpus).
  assert.equal(evt.payload.sourceEventId, 'n2');
  assert.equal(evt.payload.type, 'personal-explanation');
  assert.equal(evt.payload.skillId, 'sk-capacite-portante');
});

test('M-63 AD-11: pas de sourceNode → sourceEventId absent (optionnel, AD-1)', () => {
  const ev = evidenceFromMirrorValidation(
    { skillId: 'sk-x', kind: 'gap', validated: true, userId: 'u1' },
    { now: NOW, userId: 'u1' },
  );
  assert.equal(ev.sourceEventId, undefined,
    'la provenance est optionnelle (le miroir peut n’avoir aucun nodeId)');
  // Le contexte reste marqué « miroir » (le flag d’origine est séparé
  // de la provenance du corpus).
  assert.ok(ev.context?.includes('mirror'));
});
