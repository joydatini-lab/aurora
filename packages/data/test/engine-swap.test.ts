// Engine-swap surface test (03 S8.1, 03 S7): the production PowerSync
// binding (SupabaseBackendConnector + LocalStore bridge) is exercised with
// a FAKE Supabase client — no network, no Capacitor runtime — so it runs
// under the Node type-stripping CI gate like every other invariant test.
//
// Run: node --experimental-strip-types --no-warnings packages/data/test/engine-swap.test.ts

import {
  EngineLocalStoreBridge,
} from '../src/local-store-bridge.ts';
import {
  createSupabaseBackendConnector,
  type SupabaseConnectorOptions,
} from '../src/supabase-connector.ts';
import type { LocalRow } from '../src/local-filter.ts';
import { InMemoryLocalStore } from '../src/local-store.ts';
import { SqliteCommandRepository, SqliteQueryRepository } from '../src/repositories.ts';
import { UpsyncQueue } from '../src/upsync-queue.ts';
import type { DomainCommand } from '../src/commands.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// A fake Supabase client (just enough surface for the connector)
// ---------------------------------------------------------------------------

function makeFakeClient(upsertImpl?: (table: string, row: Record<string, unknown>) => unknown) {
  const client = {
    from(table: string) {
      return {
        async upsert(row: Record<string, unknown>) {
          const e = upsertImpl?.(table, row);
          return { error: e ?? null, data: [] };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(_col: string, _v: string) {
              const e = upsertImpl?.(table, patch);
              return { error: e ?? null, data: [] };
            },
          };
        },
        delete() {
          return {
            async eq(_col: string, _v: string) {
              return { error: null, data: [] };
            },
          };
        },
      };
    },
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'jwt-test-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
          error: null,
        };
      },
    },
  };
  return client as unknown as SupabaseClient;
}

function makeOpts(extra?: Partial<SupabaseConnectorOptions>): SupabaseConnectorOptions {
  return {
    endpoint: 'https://test.powersync.journeyapps.com',
    client: () => makeFakeClient(),
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// A fake CRUD transaction (the shape `uploadData` consumes)
// ---------------------------------------------------------------------------

function makeCrudTransaction() {
  let completed = 0;
  const crud = [
    {
      clientId: 1,
      id: 'task-1',
      op: 'PUT' as const,
      opData: { user_id: 'u1', subject: 'round-trip task', status: 'todo', active: 1 },
      table: 'tasks',
      transactionId: 1,
    },
  ];
  return {
    crud,
    complete: async () => { completed++; },
    completed,
    get completedCount() { return completed; },
  };
}

function txCompleted(tx: ReturnType<typeof makeCrudTransaction>): number {
  // The getter returns the live counter
  return (tx as { completedCount: number }).completedCount;
}

async function main(): Promise<void> {
  // 1) fetchCredentials returns the session JWT + relay endpoint
  const connector = createSupabaseBackendConnector(makeOpts());
  const creds = await connector.fetchCredentials();
  check(creds.token === 'jwt-test-token', 'fetchCredentials returns the session JWT');
  check(creds.endpoint === 'https://test.powersync.journeyapps.com', 'fetchCredentials returns the relay endpoint');
  check(creds.expiresAt !== undefined, 'fetchCredentials returns expiresAt');

  // 2) uploadData: PUT path + transaction.complete() (queue advances)
  const conn2 = createSupabaseBackendConnector(makeOpts());
  const tx = makeCrudTransaction();
  const fakeDb = {
    getNextCrudTransaction: async () => tx,
  } as unknown as Parameters<typeof conn2.uploadData>[0];
  await conn2.uploadData(fakeDb);
  check(txCompleted(tx) === 1, 'uploadData: transaction.complete() called (queue advances)');

  // 3) uploadData: RLS 42501 = permanent → complete + onUploadFailure, no throw
  const rlsErr = { code: '42501', message: 'permission denied for table tasks' };
  let failedLogged = 0;
  const conn3 = createSupabaseBackendConnector(
    makeOpts({
      client: () => makeFakeClient((table) => (table === 'tasks' ? rlsErr : null)),
      onUploadFailure: () => { failedLogged++; },
    }),
  );
  const txRls = makeCrudTransaction();
  const fakeDbRls = {
    getNextCrudTransaction: async () => txRls,
  } as unknown as Parameters<typeof conn3.uploadData>[0];
  await conn3.uploadData(fakeDbRls); // must NOT throw
  check(txCompleted(txRls) === 1, 'uploadData: RLS 42501 → complete() (queue unblocks)');
  check(failedLogged === 1, 'uploadData: RLS failure surfaced via onUploadFailure');

  // 4) uploadData: transient (no code) → throws (PowerSync backs off + retries)
  const clientTransient = () => makeFakeClient(() => new Error('network down'));
  const conn4 = createSupabaseBackendConnector(makeOpts({ client: clientTransient }));
  const txT = makeCrudTransaction();
  const fakeDbT = {
    getNextCrudTransaction: async () => txT,
  } as unknown as Parameters<typeof conn4.uploadData>[0];
  let threw = false;
  try {
    await conn4.uploadData(fakeDbT);
  } catch {
    threw = true;
  }
  check(threw, 'uploadData: transient failure throws (retry with backoff)');
  check(txCompleted(txT) === 0, 'uploadData: transient failure does NOT complete the queue');

  // 5) LocalStore bridge: server-wins downstream apply (03 S4.2 rule 3)
  //    + PERSISTANCE : `upsert` doit propager vers le moteur (AD-7). Sans
  //    cela la ligne ne survivait qu'en mémoire et n'entrait jamais dans la
  //    file CRUD de PowerSync (faux vert corrigé en L5).
  const persisted: { entity: string; row: Record<string, unknown> }[] = [];
  const deleted: { entity: string; id: string }[] = [];
  const bridge = new EngineLocalStoreBridge({
    allRows: async () => [] as Record<string, unknown>[],
    watch: () => () => {},
    upsertRow: async (entity, row) => {
      persisted.push({ entity, row });
    },
    deleteRow: async (entity, id) => {
      deleted.push({ entity, id });
    },
  });
  bridge.upsert('tasks', { id: 't9', userId: 'u1', status: 'todo', serverUpdatedAtMs: 1000 } as LocalRow);
  // La propagation est asynchrone (tâche de fond) : on laisse tourner la
  // microtask queue avant d'asserter.
  await Promise.resolve();
  check(
    persisted.some((p) => p.entity === 'tasks' && p.row.id === 't9'),
    'bridge: la mutation locale est PERSISTÉE vers le moteur (AD-7)',
  );
  const applied = bridge.applyDownstream({
    entity: 'tasks',
    upserts: [{ id: 't9', userId: 'u1', status: 'done' } as unknown as LocalRow],
    serverUpdatedAtMs: 9000,
  });
  check(applied === true, 'bridge: newer downstream batch applied (server-wins)');
  check(bridge.row('tasks', 't9')?.status === 'done', 'bridge: row reflects the server value');
  const stale = bridge.applyDownstream({
    entity: 'tasks',
    upserts: [{ id: 't9', userId: 'u1', status: 'todo' } as unknown as LocalRow],
    serverUpdatedAtMs: 500,
  });
  check(stale === false, 'bridge: stale downstream batch rejected (server-wins)');

  // 6) Bridge local mutation is pending upsync
  bridge.upsert('tasks', { id: 't-new', userId: 'u1', status: 'todo' } as LocalRow);
  check(bridge.pendingUpsyncCount() === 1, 'bridge: local mutation tracked as pending upsync');

  if (failures > 0) {
    console.error(`engine-swap: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('engine-swap: all invariants hold');
}

void main();

// ---------------------------------------------------------------------------
// L5 — RÉGRESSION : la persistance survit à un redémarrage (AD-7)
// ---------------------------------------------------------------------------
// Défaut corrigé : `EngineLocalStoreBridge.upsert` ne remplissait que son
// cache MÉMOIRE. La ligne disparaissait au reload et n'entrait jamais dans la
// file CRUD native de PowerSync. Ce test simule un redémarrage (nouveau bridge
// sur le même « disque ») et exige que la ligne soit retrouvée.
async function persistenceSurvivesRestart(): Promise<void> {
  const disk = new Map<string, Map<string, Record<string, unknown>>>();
  const diskOf = (e: string) => {
    let m = disk.get(e);
    if (!m) {
      m = new Map();
      disk.set(e, m);
    }
    return m;
  };
  const adapter = () => ({
    allRows: async (e: string) => [...diskOf(e).values()],
    watch: () => () => {},
    upsertRow: async (e: string, row: Record<string, unknown>) => {
      diskOf(e).set(String(row.id), row);
    },
    deleteRow: async (e: string, id: string) => {
      diskOf(e).delete(id);
    },
  });

  // Session 1 : une capture est écrite puis `flush()` (point de durabilité).
  const bridge1 = new EngineLocalStoreBridge(adapter());
  bridge1.upsert('tasks', { id: 'task-p', user_id: 'u1', subject: 'Persister' } as LocalRow);
  await bridge1.flush();

  // « Redémarrage » : un NOUVEAU bridge, même disque (le cache mémoire est
  // neuf — c'est exactement ce qui se passe au reload).
  const bridge2 = new EngineLocalStoreBridge(adapter());
  await bridge2.refreshFromEngine('tasks');
  check(
    bridge2.row('tasks', 'task-p')?.subject === 'Persister',
    'la ligne survit à un redémarrage (persistée par le moteur, AD-7)',
  );

  // Contre-preuve : sans `upsertRow`, le cache seul ne survivrait pas.
  const memoryOnly = new EngineLocalStoreBridge({
    allRows: async () => [],
    watch: () => () => {},
    upsertRow: async () => {},
    deleteRow: async () => {},
  });
  memoryOnly.upsert('tasks', { id: 'task-m', subject: 'Mémoire' } as LocalRow);
  await memoryOnly.flush();
  const afterRestart = new EngineLocalStoreBridge({
    allRows: async () => [],
    watch: () => () => {},
    upsertRow: async () => {},
    deleteRow: async () => {},
  });
  await afterRestart.refreshFromEngine('tasks');
  check(
    afterRestart.row('tasks', 'task-m') === undefined,
    'contre-preuve : un moteur qui n’écrit rien perd la ligne (le défaut)',
  );
}

await persistenceSurvivesRestart();

// ---------------------------------------------------------------------------
// L5 — RÉGRESSION : le repository de lecture projette le miroir vers l'entité
// ---------------------------------------------------------------------------
// Défaut corrigé : `SqliteQueryRepository` livrait la ligne miroir par un
// simple cast. Le miroir nomme le titre d'une tâche `subject`, l'entité
// `title` — l'écran affichait donc un titre VIDE alors que la ligne existait.
async function queryRepoProjectsMirror(): Promise<void> {
  const store = new InMemoryLocalStore();
  const queue = new UpsyncQueue();
  const repo = new SqliteQueryRepository<TaskLike>(store, 'tasks', (row) => ({
    id: String(row.id),
    // exactement la règle du mapper de l'app : `subject ?? title`
    title: String(row.subject ?? row.title ?? ''),
  }));
  const writer = new SqliteCommandRepository(store, queue);
  const res = await writer.apply('productivity', {
    op: 'task.create',
    id: 'task-map',
    userId: 'u1',
    patch: { title: 'Titre réel' },
  } as unknown as DomainCommand);
  check(res.ok, 'query-repo: la capture est acceptée');

  const rows = await repo.list({ entity: 'tasks' } as never);
  check(
    rows[0]?.title === 'Titre réel',
    'query-repo: le mapper est appliqué — le titre vient de la colonne `subject`',
  );

  // Contre-preuve : SANS mapper, le cast livre la ligne brute, donc pas de
  // `title` — c'est exactement le défaut.
  const unmapped = new SqliteQueryRepository<Record<string, unknown>>(store, 'tasks');
  const raw = await unmapped.list({ entity: 'tasks' } as never);
  check(
    raw[0]?.title === undefined && raw[0]?.subject === 'Titre réel',
    'contre-preuve : sans mapper la ligne brute n’a pas de `title` (le défaut)',
  );
}
interface TaskLike {
  id: string;
  title: string;
}
await queryRepoProjectsMirror();
