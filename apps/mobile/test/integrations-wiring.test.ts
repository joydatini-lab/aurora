/**
 * integrations-wiring.test.ts (S3, M-31 + M-34) — Page Intégrations v2 (écran 7).
 *
 * Le SSoT de la page (le pure-JS module `pages/integrations/data.ts` —
 * le pattern `veille-programs-join.js` de la repo, zéro React, zéro
 * réseau) est testé DIRECTEMENT (le test d'abord, TDD) :
 *
 *   1. la page RESSORT 3 sections (S3 update, gelées) :
 *      « Recommandées » (le preset SSoT `INTEGRATION_CATALOG` : TOUT le
 *      Google Workspace + Notion/Slack/GitHub), « Connectées » (les
 *      comptes live `state === 'connected'` lus via `listAccounts()`,
 *      AD-3 : jamais depuis l'appareil), et « Parcourir les
 *      intégrations » (M-34 : une recherche sur le CATALOG COMPLET
 *      Composio via le verb `browse_integrations`, un CTA « Ajouter »
 *      par app → le verb `connect`, M-32 — une écriture = toujours
 *      confirmée — + l'app rejoint le CATALOG LOCAL AJOUTÉ
 *      (persistance `integrations.userAdded`, le preset reste
 *      IMMUTABLE, seul cet ajout est persistant device-side ; AD-3 :
 *      aucun secret, juste des slugs d'app ajoutées)).
 *   2. le CTA « Connecter » / « Ajouter » émet `connect(app)` (le
 *      client EF `fn-integrations`, AD-7 : le module/EF applique,
 *      JAMAIS une write directe depuis l'app) ; chaque ligne
 *      connectée ouvre le DÉTAIL des permissions par action
 *      (briefing §16 point 2, `discoverTools` →
 *      `IntegrationTool.destructive`).
 *   3. le rappel « chaque écriture demande confirmation » + AD-3
 *      (aucune clé sur l'appareil, auth serveur) sont rendus.
 *   4. la dégradation AD-7 (client absent) produit l'état honnête,
 *      jamais une fausse connexion.
 *   5. LA RÈGLE LOGO (gelée) : le `logoUrl` est TOUJOURS live (le
 *      `image_url` du toolkit Composio, M-34 `listToolkits`) — JAMAIS
 *      un asset hardcodé ni une table statique `app → icône`. Le
 *      fallback (absent / échec de load) = la pastille initiale (les
 *      2 premières lettres du nom, le SSoT `serviceInitials`). Le
 *      merge du `logoUrl` live sur le preset statique (le SSoT
 *      `mergeServiceLogos`) reste pur (le test le couvre) ; le preset
 *      par défaut (le nom + `defaultOn`) ne porte JAMAIS un logo.
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
  filterCatalog,
  serviceInitials,
  mergeServiceLogos,
  loadUserAddedIntegrations,
  saveUserAddedIntegrations,
  isUserAdded,
  USER_ADDED_INTEGRATIONS_KEY,
  type CatalogEntry,
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

// ——— Un mini-Storage en mémoire pour les tests de persistance ———
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  } as Pick<Storage, 'getItem' | 'setItem'> & Storage;
}

// ---------------------------------------------------------------------------
// 1. Le CATALOG v2 (le preset SSoT : TOUT le Google Workspace +
//    Notion/Slack/GitHub — le nom + `defaultOn`, JAMAIS un logo)
// ---------------------------------------------------------------------------

test('M-31/M-33 : le preset contient le service Google Agenda (1er branché, M-33) avec slug SSoT GOOGLECALENDAR', () => {
  const gcal = INTEGRATION_CATALOG.find((s) => s.app === GOOGLE_CALENDAR_SERVICE.app);
  assert.ok(gcal, 'le connecteur Google Agenda (GOOGLECALENDAR) est dans le catalog');
  assert.equal(gcal.firstService, true, 'Google Agenda = le 1er service (M-33)');
  assert.equal(gcal.defaultOn, true, 'le preset Google Workspace (Q6 : Google Workspace by default)');
  assert.equal(gcal.logoUrl, undefined, 'LA RÈGLE LOGO : le preset statique ne porte JAMAIS un logo (le `logoUrl` est TOUJOURS live, M-34)');
});

test('M-31 : le preset = TOUT le Google Workspace + une courte liste prod (Notion, Slack, GitHub) — le nom + `defaultOn`, JAMAIS un asset hardcodé', () => {
  const apps = INTEGRATION_CATALOG.map((s) => s.app);
  for (const slug of ['GOOGLECALENDAR', 'GOOGLEDOCS', 'GOOGLEDRIVE', 'GOOGLESHEETS', 'GOOGLESLIDES', 'GMAIL', 'NOTION', 'SLACK', 'GITHUB']) {
    assert.ok(apps.includes(slug), `le preset contient ${slug}`);
  }
  for (const s of INTEGRATION_CATALOG) {
    assert.equal(s.logoUrl, undefined, 'aucun logo hardcodé dans le preset statique (' + s.app + ') — le image_url du toolkit (M-34) est la seule source de logo');
  }
});

test('M-31 : splitConnectedAndAvailable → section « Connectées » (les comptes live connectés)', () => {
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
});

test('M-31 : aucun compte connecté → section Connectées VIDE (état vide honnête, 5 états du plan)', () => {
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
  assert.ok(notion, 'Notion est dans le catalog (section Recommandées, S3 update)');
});

// ——— 3. Le CTA « Connecter » / « Ajouter » émet `connect(app)` (AD-7) —

test('M-31 : planConnectPreset — le bouton « Tout connecter » émet le lot de connect(app), jamais une write directe (AD-7)', () => {
  const plan = planConnectPreset(INTEGRATION_CATALOG, []);
  const apps = plan.map((p) => p.app);
  for (const slug of ['GOOGLECALENDAR', 'GOOGLEDOCS', 'GOOGLEDRIVE', 'GOOGLESHEETS', 'GOOGLESLIDES', 'GMAIL', 'NOTION', 'SLACK', 'GITHUB']) {
    assert.ok(apps.includes(slug), `le preset « Tout connecter » émet connect(${slug})`);
  }
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

// ——— 6. M-34 : le CATALOG COMPLET (le « Parcourir les intégrations ») —
//    la recherche locale + le CTA « Ajouter » (le verb `connect`, M-32)
//    + le CATALOG LOCAL AJOUTÉ (persistance `integrations.userAdded`).
// ---------------------------------------------------------------------------

test('M-34 : filterCatalog — le filtrage live local (nom/slug/vendor, insensible à la casse) sur le CATALOG COMPLET', () => {
  const full: CatalogEntry[] = [
    { app: 'GOOGLECALENDAR', name: 'Google Calendar', vendor: 'Google Workspace' },
    { app: 'NOTION', name: 'Notion', vendor: 'Notion' },
    { app: 'SLACK', name: 'Slack', vendor: 'Slack' },
  ];
  assert.equal(filterCatalog(full, '').length, 3, 'query vide → le CATALOG COMPLET');
  assert.deepEqual(filterCatalog(full, 'google').map((e) => e.app), ['GOOGLECALENDAR'], 'le filtrage est insensible à la casse sur le nom');
  assert.deepEqual(filterCatalog(full, 'workspace').map((e) => e.app), ['GOOGLECALENDAR'], 'le filtrage porte sur le vendor');
  assert.deepEqual(filterCatalog(full, 'NOTI').map((e) => e.app), ['NOTION'], 'le filtrage porte sur le slug');
});

test('M-34 : la persistance device-side du CATALOG LOCAL AJOUTÉ (clé `integrations.userAdded`) — le preset reste IMMUTABLE, seul l’ajout est persistant ; AD-3 : aucune liste de comptes, juste des slugs d’app', () => {
  assert.equal(USER_ADDED_INTEGRATIONS_KEY, 'integrations.userAdded', 'la clé SSoT du catalog local ajouté');
  const storage = memoryStorage();
  assert.deepEqual(loadUserAddedIntegrations(storage), [], 'pas d’entrée → vide (jamais une fausse liste)');
  saveUserAddedIntegrations(storage, ['LINE', 'DROPBOX']);
  assert.deepEqual(loadUserAddedIntegrations(storage), ['LINE', 'DROPBOX'], 'lecture après écriture = les slugs d’app ajoutées');
  assert.ok(isUserAdded('line', ['LINE', 'DROPBOX']), 'isUserAdded est insensible à la casse (slug SSoT en majuscules)');
  assert.ok(!isUserAdded('GMAIL', ['LINE', 'DROPBOX']), 'une app non ajoutée n’est pas déclarée ajoutée');
  // Corrompu → vide honnête (pas de crash, AD-1 degrade-first).
  const bad = memoryStorage();
  bad.setItem(USER_ADDED_INTEGRATIONS_KEY, '{corrompu');
  assert.deepEqual(loadUserAddedIntegrations(bad), []);
});

test('M-34 : le CTA « Ajouter » d’une app du browse = le verb `connect` (M-32, une écriture = toujours confirmée, même règle §12) + l’app rejoint le catalog local ajouté', () => {
  // La page (le composant) appelle le SSoT `connectOne` (le même
  // `connect(app)` que le CTA « Connecter ») et `saveUserAddedIntegrations`
  // — le CTA « Ajouter » est le verb `connect` + un ajout au catalog
  // local (AD-7 : l’EF applique, jamais une write directe depuis l’app).
  const expected: string[] = [
    'connectOne(',
    'saveUserAddedIntegrations',
    'isUserAdded(',
  ];
  for (const needle of expected) {
    assert.ok(pageSrc.includes(needle), `la page référence le CTA « Ajouter » (le verb connect + le catalog local, ${needle})`);
  }
});

// ——— 7. LA RÈGLE LOGO (S3 update, gelée) : le `logoUrl` est TOUJOURS
//    live (le `image_url` du toolkit, M-34 `listToolkits`) — JAMAIS un
//    asset hardcodé ; le fallback = la pastille initiale (les 2
//    premières lettres du nom, le SSoT `serviceInitials`).
// ---------------------------------------------------------------------------

test('M-34 : le merge SSoT du logo live sur le preset statique (`mergeServiceLogos`) — le logo est TOUJOURS live, le preset ne porte que le nom + le flag', () => {
  const staticPreset: CatalogEntry[] = [
    { app: 'GOOGLECALENDAR', name: 'Google Agenda', vendor: 'Google Workspace' },
    { app: 'NOTION', name: 'Notion', vendor: 'Notion' },
  ];
  const live: CatalogEntry[] = [
    { app: 'GOOGLECALENDAR', name: 'Google Calendar', logoUrl: 'https://cdn.example/gcal.png' },
  ];
  const merged = mergeServiceLogos(staticPreset, live);
  const gcal = merged[0];
  const notion = merged[1];
  assert.equal((gcal as CatalogEntry & { logoUrl?: string }).logoUrl, 'https://cdn.example/gcal.png', 'le `image_url` live est MERGÉ sur le preset statique');
  assert.equal((notion as CatalogEntry & { logoUrl?: string }).logoUrl, undefined, 'pas de logo live pour Notion → `logoUrl` reste `undefined` (le composant affiche la pastille initiale, JAMAIS un asset hardcodé)');
});

test('LA RÈGLE LOGO : le fallback `serviceInitials` = les 2 premières lettres du nom (l’échec de load du `onError` du composant bascule dessus)', () => {
  assert.equal(serviceInitials('Google Agenda'), 'GO');
  assert.equal(serviceInitials('notion'), 'NO');
  assert.equal(serviceInitials(''), '?');
});

test('LA RÈGLE LOGO : le composant rend le logo via un <img> live avec un `onError` qui bascule sur la pastille initiale — JAMAIS un asset `assets/*logo*.png` ni une icône lucide par app', () => {
  // Le `onError` du <img> est requis (l’échec de load → la pastille).
  assert.ok(
    /<img[\s\S]{0,220}onError/.test(pageSrc),
    'le logo est un <img> live avec un `onError` (le fallback pastille initiale, la règle logo gelée)',
  );
  // Interdit : un asset logo hardcodé par app.
  assert.ok(
    !/assets\/.*logo/i.test(pageSrc),
    'interdit : un asset `assets/*logo*.png` hardcodé par app',
  );
});

// ——— 8. Le wiring React de la PAGE (statique, pattern sync-config) —————

test('M-31+M-34 : la page index.tsx consomme le SSoT data.ts + le client EF (connect, AD-7) — les 3 sections Recommandées/Connectées/Parcourir sont rendues', () => {
  const expected: string[] = [
    'INTEGRATION_CATALOG',
    'splitConnectedAndAvailable',
    'servicePermissions',
    'planConnectPreset',
    'filterCatalog',
    'mergeServiceLogos',
    'serviceInitials',
    'WRITE_CONFIRMATION_REMINDER',
    'AD3_NO_KEY_REMINDER',
    "Recommandées",
    "Connectées",
    "Parcourir les intégrations",
    "Connecter",
    "Ajouter",
    'browseIntegrations',
    '.connect(',
    'onError',
  ];
  for (const needle of expected) {
    assert.ok(pageSrc.includes(needle), `la page référence ${needle}`);
  }
  assert.ok(pageSrc.includes('from \'./data\''), 'la page importe le SSoT data.ts (./data, relatif depuis pages/integrations/)');
});
