/**
 * discovery-create-wiring.test.ts (M-45, v2 MVP Veille + Chat agentique, S4 —
 * plan `docs/plans/2026-10-17-veille-chat-mvp.md` L478–488, écran 15).
 *
 * La CRÉATION MANUELLE d'une veille (la route `/discovery/nouveau`,
 * le formulaire « Nouvelle veille » Stitch `veille_cr_ation_manuelle_fraunces`)
 * : le formulaire (nom, sujet, déclencheur [Planifié par défaut Q1],
 * cadence jour/semaine/mois/trimestre, jour + heure, familles de sources,
 * push) émet la commande G1 EXACTE du writer M-41 —
 * `integrations.automation_create` (`AutomationCreatePayload` de
 * `packages/integrations/src/automation-writer.ts`) :
 *
 *   {
 *     command: 'integrations.automation_create',
 *     ok: true,
 *     payload: {
 *       name, trigger: 'schedule', schedule: <cron>,
 *       jobKind: 'research', action: <sujet>, userId,
 *     },
 *   }
 *
 * Le SSoT du payload est un module PUR plain-TS
 * (`src/lib/veille-create-ssoT.ts` — zéro React, zéro réseau, testable
 * par `node:test` sous `node --experimental-strip-types`) :
 *
 *   - `buildVeilleCreatePayload(form)` : la validation (Nom + Sujet
 *     requis, AD-13 : jamais un payload factice) + le mapping
 *     cadence→cron (jour/semaine/mois/trimestre + jour + heure,
 *     le SSoT du formulaire → l'expression cron du G1) ;
 *   - le trigger est `schedule` par défaut (Q1 gelé S0 :
 *     `condition`/`event` en variant, hors MVP — les variants
 *     Réactif/Conditionnel sont des stubs honnêtes du formulaire).
 *
 * L'app n'écrir JAMAIS `automations` elle-même (AD-7) : le formulaire
 * émet la commande typée, le module Integrations (le writer M-41,
 * `applyAutomationCommand`) l'applique sur la table `automations`
 * (le single-writer, le payload EST le shape EXACT de G1).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/discovery-create-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildVeilleCreatePayload,
  VEILLE_CADENCES,
  VEILLE_DAYS,
  type VeilleCreateForm,
} from '../src/lib/veille-create-ssoT.ts';

// ---------------------------------------------------------------------------
// Tests — buildVeilleCreatePayload (le SSoT du payload G1 du M-45)
// ---------------------------------------------------------------------------

test('M-45 buildVeilleCreatePayload: le payload G1 EXACT (trigger schedule, cron cadence+heure, jobKind research, action=sujet)', () => {
  const form: VeilleCreateForm = {
    name: 'Veille Eurocode 7 2026',
    subject: 'Suivi de la révision 2026 de l\'Eurocode 7',
    cadence: 'mois',
    dayOfMonth: 1,
    hour: 8,
    minutes: 0,
    sourceFamilies: ['academiques', 'web'],
    pushOnRun: true,
    userId: 'u-1',
  };
  const out = buildVeilleCreatePayload(form);
  assert.equal(out.ok, true, 'payload valide → ok');
  if (!out.ok) throw new Error('unreachable');
  const p = out.payload;
  assert.equal(out.command, 'integrations.automation_create', 'la commande G1 EXACTE (le writer M-41)');
  assert.equal(p.name, 'Veille Eurocode 7 2026', 'le nom du programme');
  assert.equal(p.trigger, 'schedule', 'trigger schedule par défaut (Q1 gelé S0)');
  assert.equal(p.schedule, '0 8 1 * *', 'cron mensuel (le 1er du mois à 08:00 — le SSoT du formulaire)');
  assert.equal(p.jobKind, 'research', 'jobKind fermé AD-15 (le run « recherche » du vault)');
  assert.equal(p.action, 'Suivi de la révision 2026 de l\'Eurocode 7', 'action = le sujet (le payload du run)');
  assert.equal(p.userId, 'u-1', 'l\'identité portée par le formulaire (AD-7 : le port est userId-borné)');
});

test('M-45 buildVeilleCreatePayload: cadence jour → cron quotidien (heure + minute)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'jour', dayOfMonth: 1, hour: 7, minutes: 30,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.payload.schedule, '30 7 * * *', 'jour → « chaque jour à H:M »');
});

test('M-45 buildVeilleCreatePayload: cadence semaine → cron hebdo (le jour de semaine du formulaire)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'semaine', weekDay: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.payload.schedule, '0 8 * * 1', 'semaine → « chaque lundi (dow=1) à 08:00 »');
});

test('M-45 buildVeilleCreatePayload: cadence trimestre → cron trimestriel (le 1er de janv/avr/juil/oct)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'trimestre', dayOfMonth: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.payload.schedule, '0 8 1 1,4,7,10 *', 'trimestre → les 4 1ers du trimestre (le SSoT du `cadenceLabel` inverse)');
});

test('M-45 buildVeilleCreatePayload: cadence mois avec jour choisi (le 15 du mois)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'mois', dayOfMonth: 15, hour: 9, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.payload.schedule, '0 9 15 * *', 'mois → « le 15 du mois à 09:00 »');
});

// ---------------------------------------------------------------------------
// Tests — la validation (Nom + Sujet requis, AD-13 : jamais un payload factice)
// ---------------------------------------------------------------------------

test('M-45 buildVeilleCreatePayload: nom vide → rejet (la validation SSoT du formulaire)', () => {
  const out = buildVeilleCreatePayload({
    name: '   ', subject: 'S', cadence: 'jour', dayOfMonth: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, false, 'nom blanc → le payload est rejeté (jamais un programme sans nom)');
  assert.equal(out.error, 'name_required', 'le code d\'erreur est le SSoT du message du formulaire');
});

test('M-45 buildVeilleCreatePayload: sujet vide → rejet (l\'action du run est le sujet, requis)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: '', cadence: 'jour', dayOfMonth: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, false, 'sujet blanc → le payload est rejeté');
  assert.equal(out.error, 'subject_required');
});

test('M-45 buildVeilleCreatePayload: userId absent → rejet (l\'AD-7 userId-borne est le champ porté par le formulaire)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'jour', dayOfMonth: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false,
  });
  assert.equal(out.ok, false, 'sans userId le payload est rejeté (l\'AD-7 SSoT, jamais un insert anonyme)');
});

test('M-45 buildVeilleCreatePayload: cadence inconnue → rejet (le SSoT du mapping est fermé)', () => {
  const out = buildVeilleCreatePayload({
    name: 'N', subject: 'S', cadence: 'biannuelle' as never, dayOfMonth: 1, hour: 8, minutes: 0,
    sourceFamilies: [], pushOnRun: false, userId: 'u',
  });
  assert.equal(out.ok, false, 'cadence hors du SSoT fermé → rejet (AD-1 : jamais un cron inventé)');
});

test('M-45 VEILLE_CADENCES: le SSoT fermé des cadences du formulaire (jour/semaine/mois/trimestre)', () => {
  assert.deepEqual(VEILLE_CADENCES, ['jour', 'semaine', 'mois', 'trimestre']);
});

test('M-45 VEILLE_DAYS: le SSoT des jours de semaine (1 = lundi, le format cron 0–6)', () => {
  // Le cron hebdo (champ dow) : 0–6, 0 = dimanche (le SSoT du
  // `cadenceLabel` inverse : `0 8 * * 1` = « chaque lundi »).
  assert.equal(VEILLE_DAYS[0], 'Dimanche');
  assert.equal(VEILLE_DAYS[1], 'Lundi');
  assert.equal(VEILLE_DAYS[5], 'Vendredi');
});

// ---------------------------------------------------------------------------
// Tests — le branchement de la surface (grep SSoT, le pattern M-44)
// ---------------------------------------------------------------------------

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const MOBILE_SRC = join(TEST_DIR, '..', 'src');

test('M-45 route: le routeur déclare /discovery/nouveau (gated discovery, AVANT /discovery/:id)', () => {
  const router = readFileSync(join(MOBILE_SRC, 'router.tsx'), 'utf8');
  assert.ok(
    /\/discovery\/nouveau/.test(router),
    'le routeur connaît le path /discovery/nouveau (le formulaire de création)',
  );
  // L'ordre : /discovery/nouveau DOIT être déclaré AVANT /discovery/:id
  // (sinon le `:id` matche « nouveau » et le formulaire n'est jamais
  // servi — le bug classique des routes paramétrées). On cherche les
  // DÉCLARATIONS DE ROUTE (l'attribut `path:`), pas le type `AppRoute`.
  const nouveauIdx = router.indexOf("path: '/discovery/nouveau'");
  const idIdx = router.indexOf("path: '/discovery/:id'");
  assert.ok(nouveauIdx > -1 && idIdx > -1 && nouveauIdx < idIdx,
    '/discovery/nouveau est déclaré AVANT /discovery/:id dans le routeur');
  assert.ok(
    /FeatureGate feature="discovery"[^]*VeilleCreatePage|VeilleCreatePage[^]*discovery/.test(router),
    'la page création est gated sur le feature discovery (le G-M7 du routeur)',
  );
});

test('M-45 composant: le formulaire est déclaré (le SSoT Stitch écran 15)', () => {
  const creation = readFileSync(join(MOBILE_SRC, 'pages/discovery/creation.tsx'), 'utf8');
  // Le formulaire consomme le SSoT pur (le module `.ts` testé ici) :
  assert.ok(
    /veille-create-ssoT/.test(creation),
    'le formulaire importe le SSoT pur (le `buildVeilleCreatePayload` de ce test)',
  );
  // Le déclencheur Planifié est le défaut (Q1) — les variants
  // Réactif/Conditionnel sont des stubs désactivés (Q6, lot suivant) :
  assert.ok(
    /Réactif|Conditionnel/.test(creation),
    'le formulaire porte les variants Réactif/Conditionnel (les stubs honnêtes du plan B)',
  );
  // La validation Nom + Sujet est SSoT du module pur (le `.tsx` la
  // consomme, ne la redéfinit PAS) :
  assert.ok(
    /name_required|subject_required/.test(creation),
    'le formulaire consomme les codes d\'erreur SSoT du module pur (nom/sujet requis)',
  );
});
