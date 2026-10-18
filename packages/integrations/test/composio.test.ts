/**
 * @aurora/integrations — Composio adapter tests (composio.md §11).
 * node:test + --experimental-strip-types. No network, no vendor key
 * required (AD-1 degrade-first: unconfigured env → offline fallback).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import {
  ComposioIntegrationProvider,
  createIntegrationProvider,
  filterAvailableTools,
  toIntegrationsState,
  toolConfirmationPlan,
} from '../src/composio.ts';
import type { ComposioTool, ConnectedAccount, Toolkit } from '../src/composio.ts';

const noTools: ComposioTool[] = [];
const someTools: ComposioTool[] = [
  {
    toolId: 'GMAIL_SEND_EMAIL',
    app: 'GMAIL',
    name: 'send_email',
    requiredAuth: 'oauth',
  },
  {
    toolId: 'NOTION_READ_PAGE',
    app: 'NOTION',
    name: 'read_page',
    requiredAuth: 'oauth',
  },
];
const accounts: ConnectedAccount[] = [
  {
    connectedAccountId: 'ca-1',
    app: 'GMAIL',
    state: 'connected',
    lastCheckedAt: '2026-01-01T00:00:00Z',
  },
  {
    connectedAccountId: 'ca-2',
    app: 'NOTION',
    state: 'reauth_required',
  },
];

/** composio.md §11.2: unconnected app → tool marked unavailable;
 *  the kernel degrades, it does not fail. */
test('composio: filterAvailableTools marks unconnected/reauth apps unavailable', () => {
  const out = filterAvailableTools(someTools, accounts);
  const gmail = out.find((t) => t.app === 'GMAIL');
  const notion = out.find((t) => t.app === 'NOTION');
  assert.equal(gmail?.available, true);
  assert.equal(notion?.available, false);
  assert.equal(notion?.reason, 'reauth_required');
});

/** No accounts at all → everything unavailable, reason "unconnected". */
test('composio: no connected accounts → all tools unavailable', () => {
  const out = filterAvailableTools(someTools, []);
  assert.equal(out.length, someTools.length);
  for (const t of out) {
    assert.equal(t.available, false);
    assert.equal(t.reason, 'unconnected');
  }
});

/** toIntegrationsState maps vendor state onto the module SSoT shape
 *  (AD-7: only this module writes the integrations table). */
test('composio: toIntegrationsState maps to SSoT IntegrationsState', () => {
  const s = toIntegrationsState('u-1', accounts[0]);
  assert.equal(s.userId, 'u-1');
  assert.equal(s.vendor, 'composio');
  assert.equal(s.connection, 'GMAIL');
  assert.equal(s.status, 'connected');
});

/** AD-1 degrade-first: unconfigured env → provider reports
 *  not-configured, every call degrades without throwing. */
test('composio: unconfigured provider degrades without throwing', async () => {
  // Save/restore env so the test is deterministic regardless of CI.
  const prev = process.env.COMPOSIO_API_KEY;
  process.env.COMPOSIO_API_KEY = '';
  process.env.COMPOSIO_BASE_URL = 'http://127.0.0.1:0';
  try {
    const p = new ComposioIntegrationProvider();
    assert.equal(p.isConfigured(), false);
    assert.deepEqual(await p.discoverTools('u-1'), noTools);
    assert.deepEqual(await p.listConnectedAccounts('u-1'), []);
    const r = await p.executeTool('u-1', someTools[0], {});
    assert.equal(r.ok, false);
    assert.equal(r.error, 'composio_not_configured');
    assert.equal(r.trace.provider, 'composio');
  } finally {
    if (prev === undefined) delete process.env.COMPOSIO_API_KEY;
    else process.env.COMPOSIO_API_KEY = prev;
    delete process.env.COMPOSIO_BASE_URL;
  }
});

/** Factory returns the vendor adapter (AD-1: business code gets a
 *  provider, never the vendor SDK). */
test('composio: factory returns a configured-reporting provider', () => {
  const p = createIntegrationProvider();
  assert.equal(p.id, 'composio');
  assert.equal(typeof p.isConfigured(), 'boolean');
});

/**
 * M-32 — every EXTERNAL WRITE (the SSoT `ComposioTool.destructive` flag)
 * is a CONFIRMATION_REQUIRED step : the confirmation plan (risk + message
 * for the kernel's ConfirmationPrompt) is derived from the flag, a READ
 * never needs one, and the `connect`/« Ajouter » CTA verbs count as
 * writes too (briefing §12 : "chaque écriture = confirmation").
 */
test('composio (M-32): a destructive tool is CONFIRMATION_REQUIRED (destructive risk), a read is not', () => {
  const write = { toolId: 'GOOGLECALENDAR_CREATE_EVENT', app: 'GOOGLECALENDAR', name: 'create_event', requiredAuth: 'oauth', destructive: true };
  const read = { toolId: 'GOOGLECALENDAR_LIST_EVENTS', app: 'GOOGLECALENDAR', name: 'list_events', requiredAuth: 'oauth' };
  const unknownFlag = { toolId: 'GMAIL_READ_MESSAGE', app: 'GMAIL', name: 'read_message', requiredAuth: 'oauth' };

  assert.deepEqual(toolConfirmationPlan(write), {
    required: true,
    risk: 'destructive',
    tool: 'GOOGLECALENDAR_CREATE_EVENT',
    message: 'Écriture create_event — demande confirmation avant exécution.',
  }, 'destructive:true → required, risk=destructive');
  const planRead = toolConfirmationPlan(read);
  assert.equal(planRead.required, false, 'a READ never needs confirmation');
  assert.equal(planRead.risk, 'write');
  assert.equal(toolConfirmationPlan(unknownFlag).required, false, 'absent flag = read (only an explicit destructive:true is a write)');
});

/** M-32 — AD-1 degrade-first : even when the adapter is NOT configured,
 *  the confirmation plan stays computable from the tool flags (pure
 *  helper, zero I/O) — an absent integration degrades, it never crashes.
 */
test('composio (M-32): unconfigured adapter still yields a valid confirmation plan (degrade, never crash)', async () => {
  const prev = process.env.COMPOSIO_API_KEY;
  process.env.COMPOSIO_API_KEY = '';
  process.env.COMPOSIO_BASE_URL = 'http://127.0.0.1:0';
  try {
    const p = new ComposioIntegrationProvider();
    assert.equal(p.isConfigured(), false);
    // No throw, honest degraded execution result (the pre-existing
    // 'composio_not_configured' error string, composio.md §7).
    const r = await p.executeTool('u-1', someTools[0], {});
    assert.equal(r.ok, false);
    assert.equal(r.error, 'composio_not_configured');
    // The confirmation decision is PURE and remains available offline
    // (the SSoT flag, not the network).
    assert.equal(toolConfirmationPlan(writeTool()).required, true);
  } finally {
    if (prev === undefined) delete process.env.COMPOSIO_API_KEY;
    else process.env.COMPOSIO_API_KEY = prev;
    delete process.env.COMPOSIO_BASE_URL;
  }
});

function writeTool(): ComposioTool {
  return { toolId: 'GOOGLECALENDAR_CREATE_EVENT', app: 'GOOGLECALENDAR', name: 'create_event', requiredAuth: 'oauth', destructive: true };
}

/**
 * M-34 — `listToolkits()` : the GLOBAL catalog (`GET {base}/toolkits`,
 * not session-scoped). The v3.1 response rows map `{ slug, name,
 * image_url, description }` → `Toolkit { app, name, logoUrl, description }`
 * (the `image_url → logoUrl` mapping is the app-logo source ; a missing
 * `image_url` yields `logoUrl: undefined`, the UI shows the initial
 * fallback pill, never a hardcoded asset). Unconfigured → `[]`, no throw
 * (AD-1 degrade-first).
 */
test('composio (M-34): listToolkits maps image_url → logoUrl and degrades to [] when unconfigured', async () => {
  const prev = process.env.COMPOSIO_API_KEY;
  process.env.COMPOSIO_API_KEY = '';
  process.env.COMPOSIO_BASE_URL = 'http://127.0.0.1:0';
  try {
    const p = new ComposioIntegrationProvider();
    assert.deepEqual(await p.listToolkits(), [] as Toolkit[], 'unconfigured → empty catalog, no throw');
  } finally {
    if (prev === undefined) delete process.env.COMPOSIO_API_KEY;
    else process.env.COMPOSIO_API_KEY = prev;
    delete process.env.COMPOSIO_BASE_URL;
  }
});

test('composio (M-34): listToolkits maps the global /toolkits response against a mock server', async () => {
  const seenPaths: Array<string | null> = [];
  const seenAuth: Array<string | null> = [];
  const server = http.createServer((req, res) => {
    seenPaths.push(req.url);
    seenAuth.push(req.headers.authorization ?? null);
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        data: [
          { slug: 'GOOGLECALENDAR', name: 'Google Calendar', image_url: 'https://cdn.example/gcal.png', description: 'Agenda' },
          { slug: 'GITHUB', name: 'GitHub', image_url: null },
          { slug: 'NOTION' },
        ],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  try {
    const p = new ComposioIntegrationProvider('key-test', `http://127.0.0.1:${addr.port}`);
    assert.equal(p.isConfigured(), true);
    const toolkits = await p.listToolkits();
    assert.equal(seenPaths.length, 1, 'exactly one global /toolkits call (NOT session-scoped)');
    assert.match(seenPaths[0] ?? '', /\/toolkits\?limit=500/);
    assert.equal(seenAuth[0], 'ApiToken key-test');
    assert.deepEqual(toolkits, [
      { app: 'GOOGLECALENDAR', name: 'Google Calendar', logoUrl: 'https://cdn.example/gcal.png', description: 'Agenda' },
      { app: 'GITHUB', name: 'GitHub', logoUrl: undefined, description: undefined },
      { app: 'NOTION', name: 'NOTION', logoUrl: undefined, description: undefined },
    ] as Toolkit[], 'image_url → logoUrl ; null → undefined (fallback pill) ; missing name falls back to the slug');
    const custom = await p.listToolkits({ limit: 50 });
    assert.equal(custom.length, 3, 'limit=50 is honored (bounded by 500 max)');
  } finally {
    server.close();
  }
});
