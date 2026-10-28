// boot-data.ts — the app-shell data-provider boot (03 S8.1 "relay
// operational", the engine SWAP behind `LocalStore`).
//
// AD-1: NO vendor import here — the shell consumes the `@aurora/data`
// production surface only. AD-3: URLs/keys come from the env (injected
// from `.env.local` at build time), never hardcoded.
//
// Gating: `connect()` requires an ACTIVE Supabase auth session (the
// connector's `fetchCredentials` reads `client.auth.getSession()`).
// On logout / user switch call `dispose(true)` (→ `disconnectAndClear()`,
// 03 S5.5.6), then build a fresh provider.

import {
  createAuroraSupabaseClient,
  createPowerSyncClientEngine,
  EngineLocalStoreBridge,
  SqliteQueryRepository,
  UpsyncQueue,
  SYNC_STREAMS,
  type AuroraSupabaseClient,
  type LocalQueryRepository,
  type LocalStore,
  type PowerSyncClientEngine,
} from '@aurora/data';
// B2 (web pivot): the DB engine is platform-specific — the mobile shell
// imports ONLY the Capacitor ctor, so `@powersync/web` never enters this
// bundle. The web shell imports `@aurora/data/powersync-engine-web`.
import type { PowerSyncDatabaseCtor } from '@aurora/data';
import type { AscentLearningIR, GoalProject, Task, Automation, VeilleVault } from '@aurora/domain';
import { createAscentRepo } from './ascent-repo';
import { createAutomationsRepo } from './automations-repo';
import { createDiscoveryVaultRepo } from './discovery-vault-repo';

/**
 * The `LocalStore`-backed provider the shell boots (03 S8.1). One per
 * signed-in user; `dispose(true)` wipes local data on logout / user
 * switch, `dispose(false)` on app kill (offline state survives in
 * SQLite, AD-7).
 */
export interface AuroraDataProvider {
  /** local-only read (03 S3.1): `goals` mirror table. */
  goals: LocalQueryRepository<GoalProject>;
  /** local-only read (03 S3.1): `tasks` mirror table. */
  tasks: LocalQueryRepository<Task>;
  /** Ascent local mirror (wave 3, read-only AD-7/AD-12): `ascent_paths`. */
  ascent: LocalQueryRepository<AscentLearningIR>;
  /**
   * Discovery vault local mirror (discovery-vault plan 2026-10-10, Lot 4,
   * read-only AD-7): `discovery_vault` (the evolving VAULT.md + the
   * append-only run manifest — the SSoT the card renders offline).
   */
  discoveryVault?: LocalQueryRepository<VeilleVault>;
  /**
   * Automations local mirror (discovery-vault plan 2026-10-10, Lot 4,
   * read-only AD-7): `automations` (the veille program = a
   * `jobKind:'research'` automation whose name/cron feed the card title
   * + subtitle).
   */
  automations?: LocalQueryRepository<Automation>;
  /** the upsync queue (03 S5.1 — the command repository's write side). */
  upsync: UpsyncQueue;
  /** la production engine (moteur injecte par le shell), null avant init. */
  engine: PowerSyncClientEngine;
  /**
   * Kick off the sync loop: init the store, `connect` (fire-and-forget) +
   * `waitForFirstSync` as the readiness gate (03 S8.1). Throws when no
   * Supabase session (sign the user in first, 01 S2.2).
   */
  connect(): Promise<void>;
  /** Tear down: release engine watches, disconnect (or wipe). */
  dispose(clear?: boolean): Promise<void>;
  /** The local `LocalStore` bridge (read side for the repositories). */
  store(): LocalStore;
}

/** The env surface (values from `.env.local`, injected by the build tool). */
export interface AuroraDataEnv {
  /** `SUPABASE_URL`. */
  supabaseUrl: string;
  /** `SUPABASE_PUBLISHABLE_KEY` (publishable only, AD-3). */
  supabasePublishableKey: string;
  /** `POWERSYNC_URL` (the relay, 03 S8.1). */
  powersyncUrl: string;
  /** Device-scoped DB filename (AD-7 offline state survives). */
  dbFilename?: string;
  /**
   * Build with a pre-made client factory (tests inject a fake). Named via
   * the `AuroraSupabaseClient` alias exported by `@aurora/data` so the
   * shell never imports `@supabase/supabase-js` directly (AD-1).
   */
  clientFactory?: () => AuroraSupabaseClient;
}

/**
 * Build the production data provider for the shell (03 S8.1).
 *
 * 1. Supabase client: publishable key only (AD-3 — RLS is the enforcement
 *    layer; the service_role key never reaches the app).
 * 2. Engine: constructed, NOT connected — `connect()` is the boot
 *    readiness gate (03 S8.1: no render before the first sync).
 * 3. Store: `EngineLocalStoreBridge` over the engine's store adapter
 *    (03 S8.1 swap); repositories read local-only through it (03 S3.1).
 */
/**
 * B2 (web pivot 2026-10-28) : le MOTEUR est un PARAMETRE, pas un import.
 * Ce module ne connait plus aucune plateforme — il devient partageable par
 * les deux shells :
 *   mobile → `CapacitorPowerSyncDatabase` (`@aurora/data/powersync-engine-capacitor`)
 *   web    → `WebPowerSyncDatabase`      (`@aurora/data/powersync-engine-web`)
 * Invariant : le bundle de chaque shell ne porte que SON moteur.
 */
export function createAuroraDataProvider(
  env: AuroraDataEnv,
  engineCtor: PowerSyncDatabaseCtor,
): AuroraDataProvider {
  const clientFactory: () => AuroraSupabaseClient =
    env.clientFactory ??
    (() =>
      createAuroraSupabaseClient({
        env: {
          supabaseUrl: env.supabaseUrl,
          supabasePublishableKey: env.supabasePublishableKey,
        },
        powersyncUrl: env.powersyncUrl,
      }));

  // B2 (web pivot): the DB engine ctor arrives from the platform shell —
  // this module binds neither `@powersync/capacitor` nor `@powersync/web`.
  const engine = createPowerSyncClientEngine(
    {
      endpoint: env.powersyncUrl,
      createClient: clientFactory,
      dbFilename: env.dbFilename,
    },
    engineCtor,
  );

  // The `LocalStore` swap (03 S8.1): repositories keep the reference
  // `LocalStore` contract; the bridge re-projects engine rows into it.
  const bridge = new EngineLocalStoreBridge(engine.storeAdapter());
  const upsync = new UpsyncQueue();

  const goals = new SqliteQueryRepository<GoalProject>(bridge, 'goals');
  const tasks = new SqliteQueryRepository<Task>(bridge, 'tasks');
  // A2: the Ascent local-mirror repo (snake→camel + JSON.parse, confined here).
  const ascent = createAscentRepo(bridge);
  // Discovery-vault (Lot 4): the two read-only mirrors the card renders
  // offline (VAULT.md + manifest, and the research automation program).
  const discoveryVault = createDiscoveryVaultRepo(bridge);
  const automations = createAutomationsRepo(bridge);

  return {
    goals,
    tasks,
    ascent,
    discoveryVault,
    automations,
    upsync,
    engine,

    async connect(): Promise<void> {
      await engine.init(); // AD-7: the local mirror is ALWAYS available (offline shell)
      // Relay gate (03 S8.1): without a Supabase session the relay cannot be
      // authenticated — skip `addScope` so the PowerSync 5-second retry loop
      // (`fetchCredentials`) does not spam "No Supabase session" errors while
      // signed out. After sign-in the app reloads (login page → `location.assign('/')`)
      // and `connect()` runs with the restored session (persistSession); the
      // local-mirror shell keeps working meanwhile (AD-7 degraded state, honest).
      const { data: { session } } = await clientFactory().auth.getSession();
      if (!session) {
        console.warn(
          '[Aurora] no Supabase session — local-mirror shell only (AD-7); sign in to enable relay sync.',
        );
        return;
      }
      // `auto_subscribe` streams (sync-config.yaml) — no manual
      // `addScope` at the relay; `addScope` triggers `connect`
      // (`db.connect`, fire-and-forget) + `waitForFirstSync` as the
      // readiness gate (03 S8.1: identity first paint = priority 1,
      // OQ-11/AD-14). The gate fails cleanly when the device is not
      // signed in yet (no Supabase session for `fetchCredentials`) —
      // `boot-data.ts#connect()` catches that and degrades to the
      // local-mirror shell (AD-7), so the shell always paints.
      // All 11 edition-3 streams come from the SSoT `SYNC_STREAMS`
      // (packages/data, the single list read by mobile + desktop boot
      // + the drift test — no caller parses the YAML). `auto_subscribe`
      // streams self-subscribe at the relay; `addScope` only materializes
      // the local mirror on first sync + gates `waitForFirstSync`
      // (AD-7, 03 S8.1).
      for (const stream of SYNC_STREAMS) {
        await engine.addScope(stream);
      }
      // Bind the engine's reactive row stream into the bridge cache (03
      // S5.2.2) so repository reads stay live without a poll; the UI's
      // QueryClient invalidation rides on this channel (03 S5.8).
      void bridge.bindEngineWatch('goals');
      void bridge.bindEngineWatch('tasks');
      void bridge.bindEngineWatch('ascent_paths');
      // Knowledge mirror (AD-7): the tree reads semantic_nodes/edges +
      // node_state through the same reactive channel (03 S5.8).
      void bridge.bindEngineWatch('semantic_nodes');
      void bridge.bindEngineWatch('semantic_edges');
      void bridge.bindEngineWatch('node_state');
      // Discovery vault + programs (AD-7, Lot 4): the card re-renders on
      // the vault manifest + automation program downstream batches.
      void bridge.bindEngineWatch('discovery_vault');
      void bridge.bindEngineWatch('automations');
      // Productivity bulk mirror (AD-7): the /reviews, /retro, /habits,
      // /routines, /countdown pages read habits / routines / decisions /
      // focus_sessions / calendar_events / milestones through the same
      // reactive channel (03 S5.8).
      void bridge.bindEngineWatch('habits');
      void bridge.bindEngineWatch('routines');
      void bridge.bindEngineWatch('decisions');
      void bridge.bindEngineWatch('milestones');
      void bridge.bindEngineWatch('focus_sessions');
      void bridge.bindEngineWatch('calendar_events');
      // Learning mirror (AD-7): the /learn + /knowledge pages read
      // learning_sessions / reviews through the same reactive channel.
      void bridge.bindEngineWatch('learning_sessions');
      void bridge.bindEngineWatch('reviews');
      // Progress mirror (AD-7, LIMITED 03 S4.2): the /progress page reads
      // skill_states / progress_snapshots / gaps through the same
      // reactive channel.
      void bridge.bindEngineWatch('skill_states');
      void bridge.bindEngineWatch('progress_snapshots');
      void bridge.bindEngineWatch('gaps');
    },

    async dispose(clear = false): Promise<void> {
      bridge.releaseEngineWatches();
      await engine.close(clear);
    },

    store(): LocalStore {
      return bridge;
    },
  };
}
