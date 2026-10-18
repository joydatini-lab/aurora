/**
 * integrations-wiring.test.ts (S3, M-31) — Page Intégrations v2 (écran 7).
 *
 * Le SSoT de la page (le pure-JS module `pages/integrations/data.ts` —
 * le pattern `veille-programs-join.js` de la repo, zéro React, zéro
 * réseau) est testé DIRECTEMENT (le test d'abord, TDD) :
 *
 *   1. la page RESSORT 2 sections (briefing §8, Q6) : « Connectées »
 *      (Google Agenda lecture + écriture, Google Docs lecture +
 *      création — chaque ligne mène aux PERMISSIONS du service) et
 *      « Disponibles » (Drive, Gmail, Notion — bouton « Connecter »).
 *   2. le CTA « Connecter » émet `connect(app)` (le client EF
 *      `fn-integrations`, AD-7 : le module/EF applique, JAMAIS une
 *      write directe depuis l'app) ; le preset « Tout connecter »
 *      émet le lot de `connect` ; chaque ligne connectée ouvre le
 *      DÉTAIL des permissions par action (briefing §16 point 2,
 *      `discoverTools` → `IntegrationTool.destructive`).
 *   3. le rappel « chaque écriture demande confirmation » + AD-3
 *      (aucune clé sur l'appareil, auth serveur) sont rendus.
 *   4. la dégradation AD-7 (client absent) produit l'état honnête,
 *      jamais une fausse connexion.
 *
 * L'IMPORT du composant `.tsx` (vérification statique du wiring React,
 * le pattern `sync-config-wiring.test.ts` — grep, pas de render) est
 * le second bloc de ce test.
 *
 * Run: pnpm -F @aurora/mobile test integrations-wiring
 *   (node --experimental-strip-types --no-warnings
 *    --import ./test/register-resolve-hook.mjs --test
 *    test/integrations-wiring.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  INTEGRATION_CATALOG,
  servicePermissions,
  servicePermissionsFromTools,
  isWriteAction,
  splitConnectedAndAvailable,
  planConnectPreset,
  WRITE_CONFIRMATION_REMINDER,
  AD3_NO_KEY_REMINDER,
  DEGRADED_INTEGRATIONS,
  GOOGLE_CALENDAR_SERVICE,
  type IntegrationService,
} from '../src/pages/integrations/data.ts';

const PAGE_TSX = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'pages',
  'integrations',
  'index.tsx',
);
const pageSrc = readFileSync(PAGE_TSX, 'utf8');

// ——— Fixtures — le SSoT du service Google Agenda (M-33) ——————————
const AGENDA_READ_TOOLS = [
  { toolId: 'GOOGLECALENDAR_LIST_EVENTS', app: 'GOOGLECALENDAR', name: 'list_events', requiredAuth: 'oauth' },
  { toolId: 'GOOGLECALENDAR_GET_EVENT', app: 'GOOGLECALENDAR', name: 'get_event', requiredAuth: 'oauth' },
  { toolId: 'GOOGLECALENDAR_CREATE_EVENT', app: 'GOOGLECALENDAR', name: 'create_event', requiredAuth: 'oauth', destructive: true },
  { toolId: 'GOOGLECALENDAR_UPDATE_EVENT', app: 'GOOGLECALENDAR', name: 'update_event', requiredAuth: 'oauth', destructive: true },
];

// ---------------------------------------------------------------------------
// 1. Le CATALOG v2 (briefing §8 + Q6) : l'écran 7 = 2 sections
// ---------------------------------------------------------------------------

test('M-31 : le catalog v2 contient le service Google Agenda (1er branché, M-33) avec slug SSoT GOOGLECALENDAR', () => {
  const gcal = INTEGRATION_CATALOG.find((s) => s.app === GOOGLE_CALENDAR_SERVICE.app);
  assert.ok(gcal, 'le connecteur Google Agenda (GOOGLECALENDAR) est dans le catalog');
  assert.equal(gcal.firstService, true, 'Google Agenda = le 1er service (M-33)');
  assert.equal(gcal.defaultOn, true, 'le preset Google Workspace (Q6 : Google Workspace by default)');
});

test('M-31 : splitConnectedAndAvailable → section « Connectées » (les comptes live connectés) + section « Disponibles » (le reste, CTA Connecter)', () => {
  const split = splitConnectedAndAvailable(
    INTEGRATION_CATALOG,
    [
      { connectedAccountId: 'ca-1', app: 'GOOGLECALENDAR', state: 'connected' },
      { connectedAccountId: 'ca-2', app: 'GOOGLEDOCS', state: 'connected' },
    ],
  );
  assert.deepEqual(
    split.connected.map((s) => s.app),
    ['GOOGLECALENDAR', 'GOOGLEDOCS'],
    'les comptes live « connected » alimentent la section Connectées (ordre du catalog)');
  assert.deepEqual(
    split.available.map((s) => s.app),
    ['GOOGLEDRIVE', 'GMAIL', 'NOTION'],
    'le reste du MVP (Drive, Gmail, Notion, briefing §8) reste Disponible');
  for (const s of split.available) {
    assert.equal(s.connectable, true, 'chaque service disponible expose le CTA « Connecter »');
  }
});

test('M-31 : aucun compte connecté → section Connectées VIDE, tous les services disponibles (état vide honnête, 5 états du plan)', () => {
  const split = splitConnectedAndAvailable(INTEGRATION_CATALOG, []);
  assert.equal(split.connected.length, 0);
  assert.equal(split.available.length, INTEGRATION_CATALOG.length);
});

// ——— 2. Les PERMISSIONS par action (briefing §16 point 2) —————————

test('M-31 : servicePermissionsFromTools (le `discoverTools` SSoT) → lecture/écriture par action, chaque écriture = destructive (confirmation)', () => {
  const perms = servicePermissionsFromTools('GOOGLECALENDAR', AGENDA_READ_TOOLS);
  const create = perms.actions.find((a) => a.name === 'create_event');
  const list = perms.actions.find((a) => a.name === 'list_events');
  assert.equal(create?.destructive, true, 'créer un event agenda = destructive');
  assert.equal(create !== undefined && list !== undefined && list.destructive, false, 'lire les events = non destructive (jamais marqué destructive)');
  assert.equal(perms.writes.length, 2, '2 actions d’écriture (create/update)');
  assert.deepEqual(perms.reads.map((a) => a.name), ['list_events', 'get_event'], '2 actions de lecture');
});

test('M-31 : isWriteAction (le flag SSoT `destructive` du `IntegrationTool`, `integrations-client.ts` L20-27) — le moteur de confirmation d’écriture', () => {
  assert.equal(isWriteAction({ toolId: 't', app: 'a', name: 'create', requiredAuth: 'oauth', destructive: true }), true);
  assert.equal(isWriteAction({ toolId: 't', app: 'a', name: 'list', requiredAuth: 'oauth' }), false, 'pas de flag → lecture');
  assert.equal(isWriteAction({ toolId: 't', app: 'a', name: 'list', requiredAuth: 'oauth', destructive: false }), false);
});

test('M-31 : servicePermissions par service du catalog (lecture + écriture par action) — Google Agenda = lecture + écriture (briefing §8 « Connectées »)', () => {
  const gcal = servicePermissions(GOOGLE_CALENDAR_SERVICE);
  assert.ok(gcal.reads.length >= 1, 'l’agenda a au moins une action de lecture');
  assert.ok(gcal.writes.length >= 1, 'l’agenda a au moins une action d’écriture (créer un event)');
  const docs = INTEGRATION_CATALOG.find((s) => s.app === 'GOOGLEDOCS');
  const docsPerms = servicePermissions(docs!);
  assert.ok(docsPerms.writes.length >= 1, 'Google Docs = lecture + CRÉATION (briefing §8)');
  const notion = INTEGRATION_CATALOG.find((s) => s.app === 'NOTION');
  assert.ok(notion, 'Notion est dans le catalog (section Disponibles, briefing §8)');
});

// ——— 3. Le CTA « Connecter » émet `connect(app)` (AD-7) ———————————

test('M-31 : planConnectPreset — le bouton « Tout connecter » émet le lot de connect(app), jamais une write directe (AD-7)', () => {
  const plan = planConnectPreset(INTEGRATION_CATALOG, []);
  assert.deepEqual(
    plan.map((p) => p.app),
    ['GOOGLECALENDAR', 'GOOGLEDOCS', 'GOOGLEDRIVE', 'GMAIL'],
    'le preset = le preset Google Workspace par défaut + Gmail (les services defaultOn)');
  for (const p of plan) {
    assert.equal(p.verb, 'connect', 'chaque item du plan est un connect(app) — le module/EF applique (AD-7)');
  }
});

test('M-31 : un service DÉJÀ connecté sort du plan (re-connect = no-op honest, pas de double connect)', () => {
  const plan = planConnectPreset(INTEGRATION_CATALOG, [
    { connectedAccountId: 'ca-1', app: 'GOOGLECALENDAR', state: 'connected' },
  ]);
  assert.ok(!plan.some((p) => p.app === 'GOOGLECALENDAR'), 'GOOGLECALENDAR déjà connecté → absente du plan');
  assert.ok(plan.some((p) => p.app === 'GMAIL'), 'le reste du preset reste au plan');
});

// ——— 4. Les rappels « chaque écriture = confirmation » + AD-3 —————————

test('M-31 : le rappel CONFIRMATION_REQUIRED + AD-3 sont des chaînes SSoT (le plan §12 du briefing : écriture agenda/docs = confirmation)', () => {
  assert.match(WRITE_CONFIRMATION_REMINDER, /confirmation/i);
  assert.match(AD3_NO_KEY_REMINDER, /serveur/i, 'AD-3 : l’auth est côté serveur, aucune clé sur l’appareil');
});

// ——— 5. La dégradation AD-7 (client absent) ————————————————

test('M-31 : DEGRADED_INTEGRATIONS — client absent (pas de Supabase env, AD-7) → l’état honnête, jamais une fausse connexion', () => {
  assert.equal(DEGRADED_INTEGRATIONS.connected.length, 0);
  assert.equal(DEGRADED_INTEGRATIONS.available, undefined, 'pas de catalog à rendre quand le client est absent');
  assert.match(DEGRADED_INTEGRATIONS.message, /pas encore prêtes|indisponibles/i);
});

// ——— 6. Le wiring React de la PAGE (statique, pattern sync-config) —————

test('M-31 : la page index.tsx consomme le SSoT data.ts + le client EF (connect, AD-7) — les sections Connectées/Disponibles sont rendues', () => {
  const expected: string[] = [
    'INTEGRATION_CATALOG',
    'splitConnectedAndAvailable',
    'servicePermissions',
    'planConnectPreset',
    'WRITE_CONFIRMATION_REMINDER',
    'AD3_NO_KEY_REMINDER',
    "Connectées",
    "Disponibles",
    "Connecter",
    '.connect(id)',
  ];
  for (const needle of expected) {
    assert.ok(pageSrc.includes(needle), `la page référence ${needle}`);
  }
  assert.ok(pageSrc.includes('from \'./data\''), 'la page importe le SSoT data.ts (./data, relatif depuis pages/integrations/)');
});
