/**
 * integrations-module-wiring.test.ts (lot B, story A6 — branchement
 * `@aurora/integrations`).
 *
 * Contratuel node:test : le repo `readIntegrations` (AD-15, couche
 * provider) + les wrappers de calcul `computeFilterAvailableTools` /
 * `computeDecideChannel` / `computeIsWithinQuietHours` /
 * `computeAssertNoDoublePush` / `computeAutomationDedupKey` /
 * `computeCronInsertSql` / `computeBuildAutomationJobPayload` /
 * `createResearchProviderRepo` / `createIntegrationProviderRepo` /
 * `createOneSignalServerClientRepo` sont TESTÉS SUR MÉMOIRE (le
 * `InMemoryLocalStore` de `packages/data` — zéro PowerSync, zéro réseau,
 * AD-7). Le module `@aurora/integrations` (SSoT server-side, AD-12)
 * est résolu via l'alias vite / le package source.
 *
 * NOTE (AD-3 / AD-12) : les adapters vendor (`ExaResearchProvider`,
 * `ComposioIntegrationProvider`, `OneSignalServerClient`) courent sur
 * l'EF (server-side) — leur construction lit les secrets env
 * (AD-3 server-only, jamais dans le bundle mobile). En node:test,
 * `process.env` est vide → les providers sont "unconfigured" → ils
 * degradent à `uncertain` / empty (01 §6 : l'absence d'un capability
 * optionnelle n'éclate jamais le produit). Les tests assert ce
 * comportement SSoT (AD-1 last paragraph).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/integrations-module-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  readIntegrations,
  computeFilterAvailableTools,
  computeDecideChannel,
  computeIsWithinQuietHours,
  computeAssertNoDoublePush,
  computeAutomationDedupKey,
  computeCronInsertSql,
  computeBuildAutomationJobPayload,
  createResearchProviderRepo,
  createIntegrationProviderRepo,
  createOneSignalServerClientRepo,
  type IntegrationsStateRow,
  type AutomationRow,
} from '../src/lib/integrations-module-repo.ts';
import type {
  Automation,
  ComposioTool,
  ConnectedAccount,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

function makeIntegrationsStateRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'is1',
    user_id: 'user1',
    vendor: 'composio',
    connection: 'tool',
    status: 'connected',
    connection_ref: 'ca-1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function makeAutomationRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'auto-1',
    user_id: 'user1',
    name: 'Veille structures',
    trigger: 'schedule',
    action: 'research',
    active: 1,
    config: JSON.stringify({ jobKind: 'research' }),
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('integrations_state', makeIntegrationsStateRow({}) as never);
  store.upsert('automations', makeAutomationRow({}) as never);
  store.upsert('automations', makeAutomationRow({ id: 'auto-2', name: 'Digest', trigger: 'event', action: 'digest', active: 0 }) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A6 readIntegrations: snake→camel mapping — integrations_state + automations', () => {
  const store = seedStore();
  const read = readIntegrations(store);
  assert.equal(read.integrationsStates.length, 1);
  const is1 = read.integrationsStates[0]!;
  assert.equal(is1.vendor, 'composio');
  assert.equal(is1.status, 'connected');
  assert.equal(read.automations.length, 2);
  const auto1 = read.automations.find((a) => a.id === 'auto-1')!;
  assert.equal(auto1.name, 'Veille structures');
  assert.equal(auto1.active, 1);
});

test('A6 computeFilterAvailableTools: composio.md §3 Tool Registry merge', () => {
  // Un tool est disponible SI l'app a un connected account connecté pour
  // l'app du tool. Le module est la SSoT du filter.
  const tools: ComposioTool[] = [
    { toolId: 't1', app: 'gmail', name: 'send_email', requiredAuth: 'oauth' },
    { toolId: 't2', app: 'notion', name: 'create_page', requiredAuth: 'oauth' },
  ];
  const accounts: ConnectedAccount[] = [
    { connectedAccountId: 'ca-1', app: 'gmail', state: 'connected' },
  ];
  const filtered = computeFilterAvailableTools(tools, accounts);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0]!.available, true, 'gmail connecté → tool disponible');
  assert.equal(filtered[1]!.available, false, 'notion pas connecté → unavailable');
  assert.equal(filtered[1]!.reason, 'unconnected');
});

test('A6 computeDecideChannel: anti-double-push — 1 objet = 1 channel (04 §7)', () => {
  // Le module (04 §3.4) : la décision de channel est la SSoT du
  // anti-double-push. Un request local-deadline-driven → channel LOCAL
  // only (le server ne pousse JAMAIS cet objet — never both, 04 §7).
  const plan = computeDecideChannel(
    {
      userId: 'user1',
      title: 'Rappel',
      body: 'Révision due',
      priority: 'reminder',
      localDeadline: '2026-10-13T08:00:00.000Z',
      nowIso: '2026-10-13T00:00:00.000Z',
    },
    { enabled: true, quietHours: [], channels: ['push', 'local', 'in-app'] },
  );
  assert.equal(plan.channel, 'local', 'local-deadline-driven → channel local');
  assert.ok(plan.local !== undefined, 'le plan porte un delivery local');
  assert.equal(plan.onesignal, undefined, 'JAMAIS de push sur un objet local (anti-double-push)');
});

test('A6 computeAssertNoDoublePush: un plan ne porte JAMAIS onesignal + local', () => {
  // Le check SSoT (04 §7 test) : un plan valide ne porte pas à la fois
  // un delivery OneSignal ET un delivery local.
  const okPlan = computeDecideChannel(
    { userId: 'user1', title: 't', body: 'b', priority: 'reminder', nowIso: '2026-10-13T00:00:00.000Z' },
    { enabled: true, quietHours: [], channels: ['push', 'local', 'in-app'] },
  );
  assert.equal(computeAssertNoDoublePush(okPlan), true, 'le plan du module est valide (pas de double push)');
});

test('A6 computeIsWithinQuietHours: une fenêtre cross-midnight est gérée (04 §3.4)', () => {
  // La SSoT du parsing "HH:MM-HH:MM" + le cross-midnight handling.
  // La fenêtre "22:00-07:00" est cross-midnight : 23:00 est dedans.
  assert.equal(computeIsWithinQuietHours(['22:00-07:00'], '2026-10-13T23:00:00.000Z'), true, '23:00 est dans la fenêtre 22:00-07:00');
  assert.equal(computeIsWithinQuietHours(['22:00-07:00'], '2026-10-13T06:00:00.000Z'), true, '06:00 est dans la fenêtre 22:00-07:00 (cross-midnight)');
  assert.equal(computeIsWithinQuietHours(['22:00-07:00'], '2026-10-13T12:00:00.000Z'), false, '12:00 est hors fenêtre');
});

test('A6 computeAutomationDedupKey: AD-8 — même minute + même automation = même key', () => {
  // La SSoT du format `kind|automationId|minute-epoch`.
  const key1 = computeAutomationDedupKey('auto-1', 1000, 'research');
  const key2 = computeAutomationDedupKey('auto-1', 1000, 'research');
  assert.equal(key1, key2, 'idempotent (AD-8) : même input → même key');
  assert.ok(key1.includes('auto-1'), 'la key contient l automationId');
  assert.ok(key1.includes('research'), 'la key contient le jobKind');
});

test('A6 computeBuildAutomationJobPayload: typed per kind + dedupKey (01 §5.3)', () => {
  // Le payload SSoT du job automation : module 'integrations', dedupKey
  // (AD-8), tick (le cron-minute epoch). Le jobKind invalide degrade à
  // 'notification' (AD-1 optional capability, 01 §5.3).
  const automation: Automation = {
    id: 'auto-1',
    userId: 'user1',
    name: 'Veille structures',
    trigger: 'schedule',
    jobKind: 'research',
    action: 'Research FEM',
    enabled: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  } as Automation;
  const payload = computeBuildAutomationJobPayload(automation, 1000);
  assert.equal(payload.module, 'integrations');
  assert.equal(payload.automationId, 'auto-1');
  assert.equal(payload.jobKind, 'research');
  assert.equal(payload.dedupKey, computeAutomationDedupKey('auto-1', 1000, 'research'), 'la dedupKey est cohérente');
  assert.equal(payload.tick, 1000, 'le tick = le cron-minute epoch (AD-8 dedup input)');
});

test('A6 computeCronInsertSql: le SQL idempotent (ON CONFLICT DO NOTHING)', () => {
  // Le SQL SSoT du cron tick : l INSERT `job_queue` avec le `ON CONFLICT
  // DO NOTHING` (AD-8 : un double firing = no-op).
  const automation: Automation = {
    id: 'auto-1',
    userId: 'user1',
    name: 'Veille structures',
    trigger: 'schedule',
    jobKind: 'research',
    action: 'Research FEM',
    enabled: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  } as Automation;
  const sql = computeCronInsertSql(automation, 1000, 'job-1');
  assert.ok(sql.includes('INSERT INTO job_queue'), 'l INSERT job_queue est présent');
  assert.ok(sql.includes('ON CONFLICT DO NOTHING'), 'le guard idempotent est présent (AD-8)');
  assert.ok(sql.includes('job-1'), 'le jobId est dans le SQL');
});

test('A6 createResearchProviderRepo: AD-1 fallback — pas de key → provider offline', () => {
  // En node:test, process.env est vide (EXA/TAVILY/YOU_API_KEY absentes)
  // → le factory retourne le provider "offline" (isConfigured=false) pour
  // que le loop degrade à `uncertain` sans éclater le produit (01 §6,
  // AD-1 last paragraph : l'absence d'une capability optionnelle ne
  // casse jamais le produit).
  const provider = createResearchProviderRepo();
  assert.equal(provider.id, 'offline', 'pas de key configurée → provider offline');
  assert.equal(provider.isConfigured(), false, 'offline → isConfigured false');
});

test('A6 createIntegrationProviderRepo: Composio unconfigured → empty catalog', () => {
  // COMPOSIO_API_KEY absente (node:test, process.env vide) → le provider
  // est unconfigured : isConfigured=false + les méthodes degradent à
  // l'état vide (empty catalog / unconnected — composio.md §3 tool router).
  const provider = createIntegrationProviderRepo();
  assert.equal(provider.isConfigured(), false, 'pas de COMPOSIO_API_KEY → unconfigured');
});

test('A6 createOneSignalServerClientRepo: OneSignal unconfigured → degraded', () => {
  // ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY absentes → le client
  // est unconfigured : `send` degrade à `{accepted:false,
  // reason:'onesignal_not_configured'}` (best-effort, 04 §17, AD-1
  // last paragraph).
  const client = createOneSignalServerClientRepo();
  assert.equal(client.isConfigured(), false, 'pas de key OneSignal → unconfigured');
});
