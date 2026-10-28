/**
 * canvas-client.test.ts — contrat de surface de createCanvasClient
 * (0022, AD-3). Test contractuel node:test : `createCanvasClient`
 * doit exposer exactement `{ get, create, save, listComments,
 * addComment, deleteComment }`.
 *
 * Run: node --experimental-strip-types --no-warnings
 *        --test apps/mobile/test/canvas-client.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvasClient, type CanvasClient } from '../src/lib/canvas-client.ts';

/** Supabase fake minimal : la couche postgrest (from()) — zéro réseau. */
function fakeSupabase() {
  return {
    from(_table: string) {
      return {
        select: (_cols: string) => ({ eq: (_k: string, _v: unknown) => ({ then: (_ok: (r: unknown) => unknown) => Promise.resolve(_ok({ data: [], error: null })) }) }),
      };
    },
  };
}

test('createCanvasClient expose la surface { get, create, save, listComments, addComment, deleteComment } (0022)', () => {
  const client = createCanvasClient(fakeSupabase() as never, 'test-key') as CanvasClient;
  const expected = ['get', 'create', 'save', 'listComments', 'addComment', 'deleteComment'];
  for (const name of expected) {
    assert.ok(typeof (client as unknown as Record<string, unknown>)[name] === 'function', `surface manquante: ${name}`);
  }
});

test('get renvoie null quand la row est absente (AD-7: état vide honnête)', async () => {
  const client = createCanvasClient(fakeSupabase() as never, 'test-key') as CanvasClient;
  assert.equal(await client.get('nonexistent'), null);
});

/** Supabase fake qui renvoie UNE row canvas_sessions donnée. */
function fakeSupabaseWithRow(row: Record<string, unknown>) {
  return {
    from(_table: string) {
      return {
        select: (_cols: string) => ({
          eq: (_k: string, _v: unknown) => Promise.resolve({ data: [row], error: null }),
        }),
      };
    },
  };
}

test('G10 : `locked` traverse le mapping (get) — sinon le verrou est inerte cote device', async () => {
  const client = createCanvasClient(
    fakeSupabaseWithRow({
      id: 'c1',
      user_id: 'u1',
      title: 'Verrouille',
      blocks: [],
      locked: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }) as never,
    'test-key',
  ) as CanvasClient;
  const s = await client.get('c1');
  assert.ok(s, 'la session doit etre lue');
  assert.equal(s.locked, true, 'locked=true doit survivre au mapping (0023, G10)');
});

test('G10 : une session NON verrouillee reste editable (locked=false, pas undefined impose)', async () => {
  const client = createCanvasClient(
    fakeSupabaseWithRow({
      id: 'c2',
      user_id: 'u1',
      title: 'Libre',
      blocks: [],
      locked: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }) as never,
    'test-key',
  ) as CanvasClient;
  const s = await client.get('c2');
  assert.ok(s);
  assert.equal(s.locked, false, 'locked=false doit etre lu, pas efface');
});
