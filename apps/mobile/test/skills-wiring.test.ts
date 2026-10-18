/**
 * skills-wiring.test.ts (M-22 — plan v2 S2, Q13 ; M-23 — thin emitters AD-7).
 *
 * Test de branchement (contratuel node:test) de la feature « Skills
 * indexés dans le chat + appel /nom » (M-22) et du contrat AD-7 des
 * commandes de skill de l'agent (M-23, partie kernel côté `@aurora/agent`
 * — la page /skills émet des commandes FINES : le kernel émet, le module
 * `fn-skills` applique ; JAMAIS une write directe depuis la page).
 *
 * SSoT testés (pur, zéro React, zéro réseau — le même pattern que
 * `focus-wiring.test.ts`) :
 *
 * M-22 :
 *  1. Le parsing du draft `/nom` (`parseSkillSlashCall`, le module pur
 *     `skill-slash-parse.ts` que la page /agent importe) : quand le
 *     brouillon commence par `/`, le premier mot après la barre est le
 *     nom du skill (résolu par le composant de parsing de la page,
 *     jamais par le model) ; un nom vide / un brouillon sans barre →
 *     pas d'appel.
 *  2. L'injection dans le taskProfile du run (`withForcedSkill`) : un
 *     skill résolu → `forceSkillKey` porté par le taskProfile (le kernel
 *     reçoit le skill déjà résolu, le module skills l'active pour le
 *     run si inactif, AD-7) ; pas de skill résolu → pas de champ.
 *
 * M-23 :
 *  3. Les commandes de skill du kernel sont des THIN EMITTERS (AD-7) :
 *     `skill_create` / `skill_update` / `skill_rename` / `skill_delete`
 *     émettent des `AgentCommand` typées (`agent.skill_*`) — le kernel
 *     ne fait JAMAIS de write directe ; seul le module `fn-skills`
 *     applique. `skill_delete` est le seul verbe destructif : le
 *     registre de capabilities le fige `requiresConfirmation` (ADR §5).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/skills-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ——— M-22 : le parsing du brouillon `/nom` (le SSoT de la page) ———
// Le parsing est factorisé dans `src/pages/agent/skill-slash-parse.ts`
// (module pur, réutilisable par le test + la page).
import {
  parseSkillSlashCall,
  withForcedSkill,
  type SkillCandidate,
} from '../src/pages/agent/skill-slash-parse.ts';

// ——— M-23 : les verbes skill du kernel (thin emitters AD-7) + le
//  registre de capabilities qui fige le destructif ———
// Import source (pas `@aurora/agent`) : `node --experimental-strip-types`
// strip les .ts source directement ; le `exports` map du package ne
// s'applique pas sous strip-types (même pattern que les tests du lot B
// qui importent les sources des packages voisins).
import {
  skillCreate,
  skillUpdate,
  skillRename,
  skillDelete,
} from '../../../packages/agent/src/tools.ts';
import { DefaultCapabilityRegistry } from '../../../packages/agent/src/capability.ts';

// Le shape `SkillCandidate` du parse (le `UserSkillRow` réduit aux
// champs que le parsing utilise) — fixture minimal.
function makeSkill(over: Partial<SkillCandidate> = {}): SkillCandidate {
  return {
    skillKey: 'fiche',
    name: 'Fiche de révision',
    trigger: 'Structure un cours en fiche',
    active: true,
    ...over,
  };
}

// ——— Un typed tool du Vercel SDK expose `execute(input)` + le résultat
//  du thin emitter AD-7 : `{ ok: true, command, payload }` — la helper
//  commune des 4 verbes testés ci-dessous. ———
type ThinTool = { execute: (input: unknown) => Promise<{ ok: boolean; command?: string; payload?: Record<string, unknown> }> };

// ---------------------------------------------------------------------------
// M-22 (Q13) — sous-écran « Skills installés » + appel /nom
// ---------------------------------------------------------------------------

test('M-22 /nom : un draft « /fiche … » résout le skill exact `fiche`', () => {
  const skills = [makeSkill()];
  const call = parseSkillSlashCall('/fiche Structure un cours', skills);
  assert.ok(call, 'le draft commence par / → un appel est détecté');
  assert.equal(call!.name, 'fiche');
  assert.equal(call!.skill?.skillKey, 'fiche');
});

test('M-22 /nom : un nom unique est injecté dans le taskProfile du run', () => {
  const skills = [makeSkill(), makeSkill({ skillKey: 'rapport', name: 'Rapport' })];
  const call = parseSkillSlashCall('/fiche fait la fiche', skills);
  assert.ok(call!.skill, 'match unique sur le nom `fiche`');
  const profile = withForcedSkill({ agentMode: 'agent' }, call!.skill!);
  assert.equal(profile.forceSkillKey, 'fiche');
  assert.equal(profile.agentMode, 'agent');
});

test('M-22 /nom : un nom ambigu (2 matches) n\'est PAS forcé', () => {
  const dup1 = makeSkill({ skillKey: 'a', name: 'Fiche' });
  const dup2 = makeSkill({ skillKey: 'b', name: 'Fiche' });
  const call = parseSkillSlashCall('/fiche x', [dup1, dup2]);
  assert.ok(call, 'l\'appel est détecté (le draft commence par /)');
  assert.equal(call!.skill, null, '2 matches → pas de résolution unique');
  const profile = withForcedSkill({ agentMode: 'agent' }, undefined);
  assert.equal('forceSkillKey' in profile, false, 'pas de skill forcé');
});

test('M-22 /nom : un brouillon sans `/` → pas d\'appel (les skills actifs restent indexés par le kernel)', () => {
  const call = parseSkillSlashCall('fais-moi une fiche', [makeSkill()]);
  assert.equal(call, null);
});

test('M-22 /nom : `/` seul ou `/  ` (nom vide) → pas de skill résolu', () => {
  const c1 = parseSkillSlashCall('/', [makeSkill()]);
  assert.ok(c1, 'l\'appel est détecté (le draft commence par /)');
  assert.equal(c1!.skill, null);
  const c2 = parseSkillSlashCall('/  x', [makeSkill()]);
  assert.equal(c2!.skill, null, 'nom vide → pas de skill résolu');
});

test('M-22 /nom : le match est exact (nom / key, insensible à la casse)', () => {
  const s = makeSkill({ skillKey: 'fiche', name: 'Fiche de révision' });
  // par le NOM (casse insensible)
  assert.equal(parseSkillSlashCall('/fiche x', [s])!.skill!.skillKey, 'fiche');
  // par la KEY (casse insensible)
  const s2 = makeSkill({ skillKey: 'FICHE', name: 'Autre nom' });
  assert.equal(parseSkillSlashCall('/fiche x', [s2])!.skill!.skillKey, 'FICHE');
  // un nom inexistant → pas de match
  assert.equal(parseSkillSlashCall('/inexistant x', [s])!.skill, null);
});

// ---------------------------------------------------------------------------
// M-23 (AD-7) — thin emitters du kernel : le kernel ÉMET, le module APPLIQUE
// ---------------------------------------------------------------------------

test('M-23 skill_create : thin emitter AD-7 (commande typée, zéro write)', async () => {
  const res = await (skillCreate as unknown as ThinTool).execute({
    name: 'Ma routine',
    trigger: 'Chaque matin',
    goal: 'Automatiser',
    steps: ['A', 'B'],
  });
  assert.equal(res.ok, true, 'le verbe émet (le module applique, AD-7)');
  assert.equal(res.command, 'agent.skill_create');
  assert.equal(
    typeof (res.payload as Record<string, unknown> | undefined)?.name,
    'string',
    'la payload porte le nom du skill (le module applique)',
  );
});

test('M-23 skill_update : thin emitter AD-7 pour les édits d\'instructions', async () => {
  const res = await (skillUpdate as unknown as ThinTool).execute({
    skillId: 'fiche',
    name: 'Fiche v2',
    trigger: 'Quand je révise un cours',
    goal: 'Produire une fiche concise',
    steps: ['Lister les points', 'Écrire la fiche'],
  });
  assert.equal(res.ok, true);
  assert.equal(res.command, 'agent.skill_update');
});

test('M-23 skill_rename : le verbe existant reste un thin emitter AD-7', async () => {
  const res = await (skillRename as unknown as ThinTool).execute({
    skillId: 'fiche',
    name: 'Fiche de révision',
  });
  assert.equal(res.ok, true);
  assert.equal(res.command, 'agent.skill_rename');
});

test('M-23 skill_delete : thin emitter DESTRUCTIF + requiresConfirmation (ADR §5)', async () => {
  const res = await (skillDelete as unknown as ThinTool).execute({ skillId: 'fiche' });
  assert.equal(res.ok, true, 'le kernel ÉMET (le module applique, AD-7)');
  assert.equal(res.command, 'agent.skill_delete');
  // Le registre de capabilities fige le destructif `skill.delete`
  // `requiresConfirmation: true` (ADR §5 : irréversible).
  const registry = new DefaultCapabilityRegistry();
  const cap = registry.get('skill.delete');
  assert.ok(cap, 'la capacité `skill.delete` est figée dans le registre');
  assert.equal(cap.destructive, true, 'le skill delete est destructif');
  assert.equal(
    cap.requiresConfirmation,
    true,
    'ADR §5 : la commande destructive exige une confirmation',
  );
  // Les verbes CREATE / UPDATE / RENAME (non-destructifs) n'exigent PAS
  // de confirmation (le registre les fige `requiresConfirmation: false`).
  for (const id of ['skill.create', 'skill.update', 'skill.rename']) {
    const c = registry.get(id);
    assert.ok(c, `la capacité \`${id}\` est figée`);
    assert.equal(c.destructive, false, `${id} n'est pas destructif`);
    assert.equal(c.requiresConfirmation, false, `${id} ne demande pas de confirmation`);
  }
});
