/**
 * React Query ↔ @aurora/data local repositories bridge (03 S5.8).
 *
 * AD-7 (local-first): every queryKey here resolves to a `LocalQueryRepository`
 * read (SQLite). NO network on the render path. The `watch()` subscription
 * is wired into the QueryClient so upsync events invalidate local reads.
 *
 * The `dataProvider` injection pattern keeps this file hexagonal: the app
 * shell builds the provider with the real PowerSync-backed repositories at
 * boot; tests inject in-memory repositories. No vendor import here (AD-1:
 * vendor SDKs stay in packages/data, apps/mobile consumes the contract).
 */
import { QueryClient } from '@tanstack/react-query';
import type { LocalQueryRepository, LocalFilter, LocalStore } from '@aurora/data';
import type { AscentLearningIR, GoalProject, Task, Automation, VeilleVault } from '@aurora/domain';
import { markFirstLocalReadSeen } from '../hooks/use-killed';
import type { AgentClient } from '../lib/agent-client';
import type { CanvasClient } from '../lib/canvas-client';
import type { IntegrationClient } from '../lib/integrations-client';
import type { SkillClient } from '../lib/skills-client';
import { createProductivityRepo } from '../lib/productivity-repo';
import { createProgressRepo } from '../lib/progress-repo';
import { createLearningRepo } from '../lib/learning-repo';
import { createDiscoveryRepo } from '../lib/discovery-repo';

/** The injected data provider — one repository per entity family. */
export interface MobileDataProvider {
  goals: LocalQueryRepository<GoalProject>;
  tasks: LocalQueryRepository<Task>;
  /** Ascent local mirror (wave 3): the read-only `ascent_paths` table. */
  ascent?: LocalQueryRepository<AscentLearningIR>;
  /**
   * Discovery vault local mirror (discovery-vault plan 2026-10-10, Lot 4,
   * read-only AD-7): the `discovery_vault` table — the evolving VAULT.md
   * + append-only manifest the Discovery card renders offline.
   */
  discoveryVault?: LocalQueryRepository<VeilleVault>;
  /**
   * Automations local mirror (discovery-vault plan 2026-10-10, Lot 4,
   * read-only AD-7): the `automations` table — a veille program is a
   * `jobKind:'research'` automation (title/subtitle source for the card).
   * The write side is the Integrations module (G2/G3), not Discovery.
   */
  automations?: LocalQueryRepository<Automation>;
  /**
   * The device-side agent client (AD-3: publishable scope only). Present
   * when the shell has Supabase env values — the /agent page enqueues
   * kernel runs through it (`fn-agent-run`, AD-12/F-09).
   */
  agent?: AgentClient;
  /**
   * The device-side integrations client (AD-3: publishable scope only).
   * The /integrations page connects external apps through it
   * (`fn-integrations`, Composio v3.1 sessions).
   */
  integrations?: IntegrationClient;
  /**
   * The device-side skills marketplace client (AD-3: publishable scope only).
   * The /skills page reads the catalog + manages the user's activated skills
   * through it (`fn-skills`, Task 1: multi-source skill marketplace).
   */
  skills?: SkillClient;
  /**
   * The device-side canvas client (AD-3: publishable scope only, 0022).
   * The /canvas page reads/writes canvas sessions + comments through it
   * (Supabase PostgREST, per-user RLS).
   */
  canvas?: CanvasClient;
  /**
   * The local `LocalStore` (PowerSync/SQLite, 03 S8.1) — read side of the
   * families that don't have their own `LocalQueryRepository` yet (AD-7 /
   * 03 S3.1): today `semantic_nodes` / `semantic_edges` / `node_state`
   * (knowledge, `knowledge-repo.ts`). NO network on this path; the store is
   * a local snapshot. Absent when the provider has no local engine (e.g.
   * tests injecting fake repos without the boot provider).
   */
  store?: LocalStore;
  /**
   * Productivity module read facade (A2 — branchement `@aurora/productivity`,
   * lot B story A2). Built at boot by `createProductivityRepo` over the
   * `LocalStore`; exposes the `habits` / `routines` / `countdown` / `tasks`
   * / `goals` / `decisions` `LocalQueryRepository` family. The /reviews,
   * /retro, /habits, /routines, /countdown pages read through this — they
   * NEVER import `@aurora/productivity` directly (AD-7/AD-15: module → repo
   * → hook → page, never the inverse). Absent when the boot provider has no
   * local store (tests injecting fake repos without `createAuroraDataProvider`).
   */
  productivity?: ReturnType<typeof createProductivityRepo>;
  /**
   * Progress module read facade (A1 — branchement `@aurora/progress`,
   * lot B story A1). Built at boot by `createProgressRepo` over the
   * `LocalStore`; exposes the `skillStates` / `snapshots`
   * `LocalQueryRepository` family over the LIMITED mirrors
   * (`skill_states` + `progress_snapshots`, 03 S4.2 — the rich
   * `progress_evidences` / `progress_events` / `progress_trends` tables
   * are server-only, never mirrored, AD-7). The /progress page reads
   * through this — it NEVER imports `@aurora/progress` directly
   * (AD-7/AD-15: module → repo → hook → page, never the inverse).
   * Absent when the boot provider has no local store (tests injecting
   * fake repos without `createAuroraDataProvider`).
   */
  progress?: ReturnType<typeof createProgressRepo>;
  /**
   * Learning module read facade (A3 — branchement `@aurora/learning`,
   * lot B story A3). Built at boot by `createLearningRepo` over the
   * `LocalStore`; exposes the `sessions` / `reviews`
   * `LocalQueryRepository` family over the `learning_sessions` +
   * `reviews` mirrors (03 S4.2, AD-7 local-only). The /learn page
   * reads through this — it NEVER imports `@aurora/learning` directly
   * (AD-7/AD-15: module → repo → hook → page, never the inverse).
   * Absent when the boot provider has no local store (tests injecting
   * fake repos without `createAuroraDataProvider`).
   */
  learning?: ReturnType<typeof createLearningRepo>;
  /**
   * Discovery module read facade (A4 — branchement `@aurora/discovery`,
   * lot B story A4). Built at boot by `createDiscoveryRepo` over the
   * `LocalStore`; exposes the `items` / `gaps`
   * `LocalQueryRepository` family over the `discovery_items` +
   * `gaps` mirrors (03 S4.2, AD-7 local-only). The /discovery page
   * reads through this — it NEVER imports `@aurora/discovery` directly
   * (AD-7/AD-15: module → repo → hook → page, never the inverse).
   * The search itself is SERVER-ONLY (AD-12/F-09) via `fn-research`
   * EF — the device reads the mirrored results (`discovery_items`).
   * Absent when the boot provider has no local store (tests injecting
   * fake repos without `createAuroraDataProvider`).
   */
  discovery?: ReturnType<typeof createDiscoveryRepo>;
  /** optional: reactive channel that invalidates the QueryClient on upsync. */
  onLocalChange?: (invalidate: () => void) => void;
}
/**
 * Query-key factory (02 S6.1 context-preserving: ids + scope live in the
 * key, so two screens reading the same entity with different contexts get
 * different caches).
 */
export const qk = {
  goal: {
    all: () => ['goal'] as const,
    list: (userId?: string) => [...qk.goal.all(), 'list', userId ?? 'me'] as const,
    detail: (goalId: string) => [...qk.goal.all(), 'detail', goalId] as const,
  },
  task: {
    all: () => ['task'] as const,
    list: (userId?: string, filter?: LocalFilter<Task>) =>
      [...qk.task.all(), 'list', userId ?? 'me', JSON.stringify(filter ?? {})] as const,
    detail: (taskId: string) => [...qk.task.all(), 'detail', taskId] as const,
  },
  // Ascent local mirror (ascent_paths, read-only — AD-7/AD-12). The current
  // path is the newest 'active' row per user (Slide-Ascent, wave 3).
  ascent: {
    all: () => ['ascent'] as const,
    list: (userId?: string) => [...qk.ascent.all(), 'list', userId ?? 'me'] as const,
  },
  // Discovery vault + automations (discovery-vault plan 2026-10-10, Lot 4,
  // AD-7 read side): the card lists the veille programs (research
  // automations) and joins the evolving vault manifest offline.
  discovery: {
    all: () => ['discovery'] as const,
    programs: () => [...qk.discovery.all(), 'programs'] as const,
    vaults: () => [...qk.discovery.all(), 'vaults'] as const,
  },
  // agent_runs mirror (AD-7 read side, 0008): per-run polling while
  // the kernel job is in flight (02 §4 / F-09).
  agent: {
    all: () => ['agent'] as const,
    run: (runId: string) => [...qk.agent.all(), 'run', runId] as const,
    // PRD-AI-01 (Conversations) : the user's run history (read-only, AD-7).
    list: () => [...qk.agent.all(), 'list'] as const,
  },
  // Canvas (0022): per-session queries (load + save + comments).
  canvas: {
    all: () => ['canvas'] as const,
    session: (sessionId: string) =>
      [...qk.canvas.all(), 'session', sessionId] as const,
  },
  // Productivity module (A2 — lot B story A2): habits / routines / countdowns
  // local-mirror reads (AD-7 read side, 03 S5.8). The /habits, /routines,
  // /countdown pages read through this; the /reviews + /retro pages compute
  // on top of the same store via `readProductivity` + `buildReview` (no
  // dedicated query key needed — they invalidate with the mirror watches).
  productivity: {
    all: () => ['productivity'] as const,
    habits: (userId?: string) =>
      [...qk.productivity.all(), 'habits', userId ?? 'me'] as const,
    routines: (userId?: string) =>
      [...qk.productivity.all(), 'routines', userId ?? 'me'] as const,
    countdowns: (userId?: string) =>
      [...qk.productivity.all(), 'countdowns', userId ?? 'me'] as const,
  },
  // Progress module (A1 — lot B story A1): skill_states + progress_snapshots
  // local-mirror reads (AD-7 read side, 03 S5.8). The /progress page reads
  // through this; the dashboard ChartSpec is computed via
  // `computeDashboard` on top of the same mirrors (no dedicated query key
  // needed for the boards — they invalidate with the mirror watches).
  progress: {
    all: () => ['progress'] as const,
    skillStates: (userId?: string) =>
      [...qk.progress.all(), 'skillStates', userId ?? 'me'] as const,
    snapshots: (userId?: string) =>
      [...qk.progress.all(), 'snapshots', userId ?? 'me'] as const,
  },
  // Learning module (A3 — lot B story A3): learning_sessions + reviews
  // local-mirror reads (AD-7 read side, 03 S5.8). The /learn page reads
  // through this; the FSRS / QCM / Mirror Cognitive computations are
  // exposed via `computeFsrsNext` / `computeRecurringErrors` /
  // `computeMirrorFindings` (the module is the SSoT, the repo is the
  // read facade).
  learning: {
    all: () => ['learning'] as const,
    sessions: (userId?: string) =>
      [...qk.learning.all(), 'sessions', userId ?? 'me'] as const,
    reviews: (userId?: string) =>
      [...qk.learning.all(), 'reviews', userId ?? 'me'] as const,
  },
  // Discovery module (A4 — lot B story A4): discovery_items + gaps
  // local-mirror reads (AD-7 read side, 03 S5.8). The /discovery page
  // reads through this; the search is SERVER-ONLY (AD-12/F-09) via
  // `fn-research` EF — the device reads the mirrored results.
  // Reuses the `qk.discovery` namespace (already declared above for the
  // Lot 4 `programs` + `vaults`); adds the `items` + `gaps` entries.
  discoveryItems: {
    all: () => ['discoveryItems'] as const,
    items: (userId?: string) =>
      [...qk.discoveryItems.all(), 'items', userId ?? 'me'] as const,
    gaps: (userId?: string) =>
      [...qk.discoveryItems.all(), 'gaps', userId ?? 'me'] as const,
  },
};

/**
 * Build a QueryClient wired to a data provider. The `onLocalChange` hook
 * (if provided) registers a subscription that invalidates on local-store
 * change — the React Query ↔ watch bridge (03 S5.8).
 */
export function createMobileQueryClient(provider: MobileDataProvider): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // local store: data is always "fresh enough"; retry is cheap and
        // safe (SQLite read, no network — AD-7).
        staleTime: 60_000,
        retry: 1,
      },
    },
  });

  if (provider.onLocalChange) {
    provider.onLocalChange(() => {
      client.invalidateQueries({ queryKey: qk.goal.all() });
      client.invalidateQueries({ queryKey: qk.task.all() });
      // A2: the Ascent local mirror invalidates on the ascent_paths watch.
      client.invalidateQueries({ queryKey: qk.ascent.all() });
      // Discovery card (Lot 4): the programs + vaults invalidate on the
      // automations + discovery_vault watches (AD-7 local reads, 03 S5.8).
      client.invalidateQueries({ queryKey: qk.discovery.all() });
      // Productivity module (A2, lot B): habits / routines / countdowns
      // mirrors invalidate on their own downstream batches (AD-7, 03 S5.8).
      client.invalidateQueries({ queryKey: qk.productivity.all() });
      // Progress module (A1, lot B): skill_states + progress_snapshots
      // mirrors invalidate on their own downstream batches (AD-7, 03 S5.8).
      client.invalidateQueries({ queryKey: qk.progress.all() });
      // Learning module (A3, lot B): learning_sessions + reviews mirrors
      // invalidate on their own downstream batches (AD-7, 03 S5.8).
      client.invalidateQueries({ queryKey: qk.learning.all() });
      // Discovery module (A4, lot B): discovery_items + gaps mirrors
      // invalidate on their own downstream batches (AD-7, 03 S5.8).
      client.invalidateQueries({ queryKey: qk.discoveryItems.all() });
    });
  }

  // G-M2 (04 S6.1): the "first local re-read done" clear signal is NOT
  // wired here. React Query's internal subscription surface
  // (`queryCache.subscribe` / `query.subscribe`) is fragile across
  // bundled builds (the `client.queryCache` property / `query.state`
  // shape changed between versions → repeated `undefined.subscribe`
  // crashes). Instead the signal is dispatched at the LOCAL-READ SSoT
  // path — the repository wrapper in `mobileDataProviderFrom` below
  // (`withFirstLocalReadSignal`, 03 S5.8). That is exactly where the
  // "first local re-read" happens and it uses only `Promise.then`
  // (no library internals, no crash path).

  return client;
}

/**
 * G-M2 (04 S6.1) — the "first local re-read done" signal. Wraps a
 * `LocalQueryRepository` so the FIRST successful local read
 * (`list` / `getById`) dispatches `aurora:first-local-read` EXACTLY ONCE.
 * This is the 03 S5.8 local-read bridge itself (no network, SQLite), so it
 * is the honest "re-read complete" moment that clears the killed-state
 * skeleton (`useKilledDetection`). A local flag + the module flag
 * (`markFirstLocalReadSeen`) keep later hook mounts informed after the
 * one-shot event has already fired.
 */
function withFirstLocalReadSignal<T>(repo: LocalQueryRepository<T>): LocalQueryRepository<T> {
  let signaled = false;
  const signal = () => {
    if (signaled) return;
    signaled = true;
    markFirstLocalReadSeen();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('aurora:first-local-read'));
    }
  };
  return {
    getById: (id) => {
      const p = repo.getById(id);
      void p.then(signal, () => undefined);
      return p;
    },
    list: (filter) => {
      const p = repo.list(filter);
      void p.then(signal, () => undefined);
      return p;
    },
    watch: (filter, onChange) => repo.watch(filter, onChange),
  };
}

/**
 * Build a `MobileDataProvider` from the production data provider
 * (`createAuroraDataProvider`, 03 S8.1). The `onLocalChange` channel is
 * wired to the `AuroraDataProvider.store()` watch — the bridge that
 * surfaces engine downstream batches to the QueryClient (03 S5.8).
 */
export function mobileDataProviderFrom(
  provider: import('../lib/boot-data').AuroraDataProvider,
  agent?: AgentClient,
  integrations?: IntegrationClient,
  skills?: SkillClient,
  canvas?: CanvasClient,
): MobileDataProvider {
  // G-M2: wrap the local read SSoT so the FIRST successful local read
  // dispatches `aurora:first-local-read` (the killed-clear signal). Pure
  // `Promise.then` — no React Query internals, no crash path (03 S5.8).
  const goals = withFirstLocalReadSignal(provider.goals);
  const tasks = withFirstLocalReadSignal(provider.tasks);
  const ascent = provider.ascent
    ? withFirstLocalReadSignal(provider.ascent)
    : undefined;
  // Discovery card (Lot 4): the two read-only mirrors (discovery_vault +
  // automations). They are honest empty states when absent (the card
  // degrades to its empty CTA, AD-7) — no first-local-read signal wrap.
  const discoveryVault = provider.discoveryVault;
  const automations = provider.automations;
  // Productivity module (A2, lot B): the read facade over the productivity
  // mirrors (habits / routines / countdown / tasks / goals / decisions).
  // Built from the provider's `store()` (AD-7 local-only, 03 S8.1). Absent
  // when the provider has no local engine (tests injecting fake repos
  // without a boot provider).
  const productivity = provider.store()
    ? createProductivityRepo(provider.store())
    : undefined;
  // Progress module (A1, lot B): the read facade over the LIMITED
  // progress mirrors (`skill_states` + `progress_snapshots`, 03 S4.2,
  // AD-7 local-only, 03 S8.1). Absent when the provider has no local
  // engine (tests injecting fake repos without a boot provider).
  const progress = provider.store()
    ? createProgressRepo(provider.store())
    : undefined;
  // Learning module (A3, lot B): the read facade over the learning
  // mirrors (`learning_sessions` + `reviews`, 03 S4.2, AD-7 local-only,
  // 03 S8.1). Absent when the provider has no local engine (tests
  // injecting fake repos without a boot provider).
  const learning = provider.store()
    ? createLearningRepo(provider.store())
    : undefined;
  // Discovery module (A4, lot B): the read facade over the discovery
  // mirrors (`discovery_items` + `gaps`, 03 S4.2, AD-7 local-only,
  // 03 S8.1). Absent when the provider has no local engine (tests
  // injecting fake repos without a boot provider).
  const discovery = provider.store()
    ? createDiscoveryRepo(provider.store())
    : undefined;
  return {
    goals,
    tasks,
    // A2: expose the Ascent local-mirror repo (snake→camel-mapped, AD-15).
    ascent,
    // Discovery card (Lot 4): expose the vault + programs read-only mirrors.
    discoveryVault,
    automations,
    // Productivity module (A2, lot B): the read facade over the
    // productivity mirrors (AD-7 local-only, 03 S8.1).
    productivity,
    // Progress module (A1, lot B): the read facade over the LIMITED
    // progress mirrors (AD-7 local-only, 03 S8.1).
    progress,
    // Learning module (A3, lot B): the read facade over the learning
    // mirrors (AD-7 local-only, 03 S8.1).
    learning,
    // Discovery module (A4, lot B): the read facade over the discovery
    // mirrors (AD-7 local-only, 03 S8.1).
    discovery,
    // AD-3: the publishable-scope agent client (kernel enqueue + mirror read).
    agent,
    // AD-3: the publishable-scope integrations client (Composio v3.1
    // sessions via `fn-integrations`; connected accounts + tool execution).
    integrations,
    // AD-3: the publishable-scope skills client (multi-source marketplace
    // via `fn-skills`; catalog read + user skill activation, Task 1).
    skills,
    // AD-3: the publishable-scope canvas client (0022: canvas sessions +
    // comments via PostgREST, per-user RLS).
    canvas,
    // AD-7 / 03 S3.1: expose the local store read side so the knowledge
    // family (semantic_nodes / semantic_edges / node_state) can read its
    // mirror without a dedicated repository (knowledge-repo.ts).
    store: provider.store(),
    onLocalChange: (invalidate) => {
      // The bridge watches the mirror tables; invalidate on downstream
      // batches (03 S5.8). goals + the ascent_paths read-only mirror (A2).
      provider.store().watch({ entity: 'goals' }, () => invalidate());
      provider.store().watch({ entity: 'ascent_paths' }, () => invalidate());
      // Knowledge mirror (AD-7): semantic_nodes / semantic_edges /
      // node_state downstream batches invalidate the knowledge query key.
      provider.store().watch({ entity: 'semantic_nodes' }, () => invalidate());
      provider.store().watch({ entity: 'semantic_edges' }, () => invalidate());
      provider.store().watch({ entity: 'node_state' }, () => invalidate());
      // Discovery card (Lot 4): the vault manifest + program (automations)
      // downstream batches invalidate the discovery query key (AD-7, 03 S5.8).
      provider.store().watch({ entity: 'discovery_vault' }, () => invalidate());
      provider.store().watch({ entity: 'automations' }, () => invalidate());
      // Productivity module (A2, lot B): the habits / routines / countdown
      // downstream batches invalidate the productivity query key (AD-7, 03 S5.8).
      provider.store().watch({ entity: 'habits' }, () => invalidate());
      provider.store().watch({ entity: 'routines' }, () => invalidate());
      provider.store().watch({ entity: 'countdown' }, () => invalidate());
      // Progress module (A1, lot B): the LIMITED skill_states +
      // progress_snapshots downstream batches invalidate the progress query
      // key (AD-7, 03 S5.8).
      provider.store().watch({ entity: 'skill_states' }, () => invalidate());
      provider.store().watch({ entity: 'progress_snapshots' }, () => invalidate());
      // Learning module (A3, lot B): the learning_sessions + reviews
      // downstream batches invalidate the learning query key (AD-7, 03 S5.8).
      provider.store().watch({ entity: 'learning_sessions' }, () => invalidate());
      provider.store().watch({ entity: 'reviews' }, () => invalidate());
      // Discovery module (A4, lot B): the discovery_items + gaps
      // downstream batches invalidate the discoveryItems query key
      // (AD-7, 03 S5.8).
      provider.store().watch({ entity: 'discovery_items' }, () => invalidate());
      provider.store().watch({ entity: 'gaps' }, () => invalidate());
    },
  };
}
