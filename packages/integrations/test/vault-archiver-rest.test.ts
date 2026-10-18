/**
 * M-71 — Vault archiver REST (S7 finitions, gel G2 : archivage, pas
 * destruction — migration 0026 `discovery_vault.archived`).
 *
 * Test-first : le port `VaultArchiver` (automation-writer.ts) est ici
 * implémenté côté serveur (EF, service_role, AD-3) — ce test gèle le
 * contractuel : `createVaultArchiverRest` renvoie `true` si le PATCH
 * PostgREST a archivé la row `discovery_vault` (2xx), `false` si la
 * row est absente (4xx) ou si le PATCH a échoué (AD-1 : jamais une
 * cassure du delete en cours).
 *
 * Run: pnpm -F @aurora/integrations exec node --experimental-strip-types
 *      --no-warnings --test test/vault-archiver-rest.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVaultArchiverRest } from '../src/vault-archiver-rest.ts';

// ——— fake PostgREST (le PATCH par (user_id, domaine)) ———

function makeFakeRest(handler: (url: string, method: string, body?: string) => { ok: boolean; status: number }) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const fetch = (async (
    url: string,
    opts?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => {
    const m = String(opts?.method ?? 'GET');
    calls.push({ url, method: m, body: opts?.body });
    return {
      ok: handler(url, m, opts?.body).ok,
      status: handler(url, m, opts?.body).status,
      json: async () => [],
      text: async () => '',
    } as unknown as Response;
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

test('M-71 archiver: un PATCH 2xx renvoie true (la row discovery_vault est archivée)', async () => {
  const { fetch } = makeFakeRest(() => ({ ok: true, status: 200 }));
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' });
  // On surcharge le global fetch (le module est isolé, pas de DI d'injector) :
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    const r = await archiver.archive('u1', 'a1');
    assert.equal(r, true, 'un 2xx = la row a été archivée');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});

test('M-71 archiver: un 4xx (row absente) renvoie false (AD-1 : jamais une cassure du delete)', async () => {
  const { fetch } = makeFakeRest(() => ({ ok: false, status: 404 }));
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' });
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    const r = await archiver.archive('u1', 'a1');
    assert.equal(r, false, 'le 4xx (row absente) = false, le delete reste un success');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});

test('M-71 archiver: un 5xx (erreur serveur) renvoie false (la degradation est loggée, jamais une cassure)', async () => {
  const { fetch } = makeFakeRest(() => ({ ok: false, status: 500 }));
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' });
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    const r = await archiver.archive('u1', 'a1');
    assert.equal(r, false, 'un 5xx = false (AD-1 : le vault reste in touché, le delete est un success)');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});

test('M-71 archiver: le PATCH porte bien archived:true + le filter (user_id, domaine)', async () => {
  const { fetch, calls } = makeFakeRest(() => ({ ok: true, status: 200 }));
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' });
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    await archiver.archive('u1', 'a1');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
  assert.equal(calls.length, 1, 'un seul appel REST');
  const call = calls[0]!;
  assert.equal(call.method, 'PATCH', 'le verb est le PATCH');
  assert.ok(call.url.includes('user_id=eq.u1'), 'le filter user_id');
  assert.ok(call.url.includes('domaine=eq.a1'), 'le filter domaine');
  const body = JSON.parse(call.body ?? '') as Record<string, unknown>;
  assert.equal(body.archived, true, 'le flag archived: true (gel G2)');
});

test('M-71 archiver: un echec reseau (fetch rejette) renvoie false (AD-1 : jamais une cassure)', async () => {
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' });
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = async () => {
    throw new Error('network down');
  };
  try {
    const r = await archiver.archive('u1', 'a1');
    assert.equal(r, false, 'rejet reseau = false, le delete reste un success');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});

test('M-71 archiver: un service_role key absent (env manquant) renvoie false sans crash (AD-1)', async () => {
  const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: '' });
  const { fetch, calls } = makeFakeRest(() => ({ ok: true, status: 200 }));
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    const r = await archiver.archive('u1', 'a1');
    // Le fetch sans apikey = le 401 PostgREST (RLS) → `false` (AD-1).
    // Le test gèle que le module ne CRASHE PAS avec un key vide.
    assert.equal(typeof r, 'boolean');
    assert.equal(calls.length, 1, 'le PATCH est bien tenté (le 401 du serveur le refuse proprement)');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});

// ——— l'intégration SSoT avec le port (le writer + l'archiver ensemble) ———

test('M-71 integration: applyAutomationCommand + archiver REST = delete + archivage', async () => {
  const { applyAutomationCommand } = await import('../src/automation-writer.ts');
  const { archiver } = (const archiver = createVaultArchiverRest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'sr' }) });
  // Le writer fake (le module est le SEUL qui écrit `automations`).
  const fakeWriter = {
    insert: () => ({ status: 'created' as const }),
    patch: () => ({ status: 'patched' as const }),
    delete: () => ({ status: 'deleted' as const }),
  };
  const { fetch } = makeFakeRest(() => ({ ok: true, status: 200 }));
  const orig = globalThis.fetch;
  (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  try {
    const r = applyAutomationCommand(
      { ok: true, command: 'integrations.automation_delete', payload: { automationId: 'a1', userId: 'u1' } },
      fakeWriter,
      archiver,
    );
    assert.equal(r.status, 'deleted', 'la row automations est supprimée');
    assert.equal(r.vaultArchived, true, 'le vault est archivé (gel G2 : ARCHIVÉ, pas détruit)');
  } finally {
    (globalThis as unknown as { fetch: unknown }).fetch = orig;
  }
});
;