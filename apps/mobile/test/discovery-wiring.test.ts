/**
 * discovery-wiring.test.ts (lot B, story A4 — branchement
 * `@aurora/discovery`).
 *
 * Contratuel node:test : le repo `createDiscoveryRepo` (AD-15, couche
 * provider) + les wrappers de calcul `readDiscovery` /
 * `computeQualify` / `computeBuildDiscoveryItem` /
 * `computeBuildDiscoveryItemCreated` / `computeDetectGap` /
 * `computeWeighGapsAgainstStates` / `computeApplyDiscoveryFilters` /
 * `computeRunVeillePipeline` / `computeBuildVaultMd` / `computeAppendRun` /
 * `computeDecideVerbe` sont TESTÉS SUR MÉMOIRE (le `InMemoryLocalStore`
 * de `packages/data` — zéro PowerSync, zéro réseau, AD-7). Le module
 * `@aurora/discovery` (logique pure) est résolu via l'alias vite / le
 * package source.
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/discovery-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryLocalStore,
  type LocalStore,
} from '@aurora/data';
import {
  createDiscoveryRepo,
  readDiscovery,
  computeQualify,
  computeBuildDiscoveryItem,
  computeBuildDiscoveryItemCreated,
  computeDetectGap,
  computeWeighGapsAgainstStates,
  computeApplyDiscoveryFilters,
  computeRunVeillePipeline,
  computeBuildVaultMd,
  computeAppendRun,
  computeDecideVerbe,
  buildDiscoveryService,
  type DiscoveryItemRow,
  type GapRow,
} from '../src/lib/discovery-repo.ts';
import type {
  DiscoveryItem,
  SkillState,
  ResearchResult,
  VeilleVault,
  VaultRunManifest,
  ResearchProvider,
} from '@aurora/domain';

// ---------------------------------------------------------------------------
// Fixtures — snake_case mirror rows (PowerSync mirror shape, AD-15)
// ---------------------------------------------------------------------------

function makeDiscoveryItemRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'di1',
    user_id: 'user1',
    title: 'Item 1',
    url: 'https://example.com/1',
    summary: 'résumé 1',
    source: 'web',
    status: 'active',
    crdt_added: JSON.stringify([{ v: 'ev1', ts: 1, c: 'discovery' }]),
    crdt_removed: '[]',
    local_mutation_id: 'lm1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function makeGapRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'g1',
    user_id: 'user1',
    title: 'Gap 1',
    description: 'description 1',
    status: 'open',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function seedStore(): LocalStore {
  const store = new InMemoryLocalStore();
  store.upsert('discovery_items', makeDiscoveryItemRow({}) as never);
  store.upsert('discovery_items', makeDiscoveryItemRow({ id: 'di2', title: 'Item 2', status: 'archived' }) as never);
  store.upsert('gaps', makeGapRow({}) as never);
  return store;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('A4 readDiscovery: snake→camel mapping — discovery_items + gaps', () => {
  const store = seedStore();
  const read = readDiscovery(store);
  assert.equal(read.items.length, 2);
  const di1 = read.items.find((i) => i.id === 'di1') as DiscoveryItemRow;
  assert.equal(di1.title, 'Item 1');
  assert.equal(di1.status, 'active');
  assert.equal(read.gaps.length, 1);
  const g1 = read.gaps[0]!;
  assert.equal(g1.title, 'Gap 1');
});

test('A4 createDiscoveryRepo: items list (LocalQueryRepository facet)', async () => {
  const store = seedStore();
  const repo = createDiscoveryRepo(store);
  const items = await repo.items.list({ entity: 'discovery_items' });
  assert.equal(items.length, 2);
  assert.equal(items[0]!.userId, 'user1');
});

test('A4 createDiscoveryRepo: gaps list', async () => {
  const store = seedStore();
  const repo = createDiscoveryRepo(store);
  const gaps = await repo.gaps.list({ entity: 'gaps' });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0]!.title, 'Gap 1');
});

test('A4 createDiscoveryRepo: watch delivers the current projection + reacts', async () => {
  const store = seedStore();
  const repo = createDiscoveryRepo(store);
  const seen: string[][] = [];
  const unsub = repo.items.watch(
    { entity: 'discovery_items' },
    (rows) => seen.push(rows.map((r) => r.id)),
  );
  // Le watch du repo + le watch du store livrent chacun la projection
  // initiale de façon synchrone. `seen` capture donc 2 livraisons.
  assert.deepEqual(seen[0], ['di1', 'di2'], 'watch delivers the current projection');
  store.upsert('discovery_items', makeDiscoveryItemRow({ id: 'di3', title: 'Item 3' }) as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    seen.length >= 3 && seen[seen.length - 1]!.includes('di3'),
    'watch reacts to a local upsync (03 S5.2.2)',
  );
  unsub();
});

test('A4 computeBuildDiscoveryItem: AD-7 single-writer + OR-Set encoding', () => {
  // Le builder produit le DiscoveryItem + encode les sources en OR-Set
  // (03 S5.3 : { v, ts, c }). Le kind 'UNCERTAINTY' + la décision
  // 'uncertain' marquent le summary "(uncertain)" (ADR S13.7).
  // NOTE : `kind` (FACT/TREND/…) est un `DiscoveryItemKind` du
  // `SheetDraft` (module, ADR S13.7) — il n'est PAS un champ de
  // `DiscoveryItem` (AD-15 SSoT, entities-discovery.ts). Le test
  // assert le `summary` marqué + les sources OR-Set, pas le kind.
  const decision = { verdict: 'uncertain', rule: 'novel', confidence: 0.5 };
  const item = computeBuildDiscoveryItem(
    {
      userId: 'user1',
      title: 'Sheet 1',
      whyNow: 'now',
      summary: 'summary 1',
      kind: 'UNCERTAINTY',
      results: [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          summary: 's',
          source: { kind: 'web' as const },
          credibility: 'documented' as const,
          provenance: {},
        },
      ] as unknown as ResearchResult[],
      domains: ['domaine'],
      now: '2026-10-13T00:00:00.000Z',
    },
    decision,
  );
  assert.equal(item.title, 'Sheet 1');
  assert.equal(item.summary, 'summary 1 (uncertain)', 'le summary est marqué uncertain');
  assert.equal(item.sources.length, 1, 'une source OR-Set');
  assert.equal(item.sources[0]!.v, 'Result 1', 'le OR-Set v = le title du result');
  assert.deepEqual(item.recommendedActions, ['follow'], "verdict uncertain → action 'follow'");
});

test('A4 computeBuildDiscoveryItemCreated: AD-9 event (SSoT shape)', () => {
  const item: DiscoveryItem = {
    id: 'di1',
    userId: 'user1',
    title: 'Item 1',
    whyNow: 'now',
    summary: 's',
    sources: [{ v: 'ev1', ts: 1, c: 'discovery' }],
    recommendedActions: ['read'],
    semanticNodeIds: [],
    relatedGoalIds: [],
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
  } as DiscoveryItem;
  const event = computeBuildDiscoveryItemCreated(item, '2026-10-13T00:00:00.000Z');
  assert.equal(event.type, 'DiscoveryItemCreated');
  assert.equal(event.payload.discoveryItemId, 'di1');
  assert.equal(event.payload.userId, 'user1');
});

test('A4 computeDetectGap: a result NOT in the tree + no existing gap → DetectedGap', () => {
  // Le concept du result (`result.title`) n'est PAS dans le semantic tree
  // (`nodes`) et il n'y a PAS de gap existant pour ce concept →
  // détection (S1.2).
  const detected = computeDetectGap({
    userId: 'user1',
    result: {
      title: 'FEM validation',
      url: 'https://example.com/fem',
      summary: 's',
      kind: 'regulatory' as const,
      source: { kind: 'web' as const },
      credibility: 'documented' as const,
      provenance: {},
    } as unknown as ResearchResult,
    nodes: [
      { id: 'n1', label: 'Autre concept', kind: 'concept' as const },
    ],
    existingGaps: [],
    discipline: 'structures',
  });
  assert.ok(detected, 'gap détecté (concept manquant)');
  assert.equal(detected!.concept, 'FEM validation');
  assert.equal(detected!.urgency, 'high', 'kind regulatory → urgency high');
  assert.equal(detected!.kind, 'skill');
});

test('A4 computeDetectGap: a result ALREADY in the tree → null (pas de gap)', () => {
  const detected = computeDetectGap({
    userId: 'user1',
    result: {
      title: 'FEM validation',
      url: 'https://example.com/fem',
      summary: 's',
      kind: 'regulatory' as const,
      source: { kind: 'web' as const },
      credibility: 'documented' as const,
      provenance: {},
    } as unknown as ResearchResult,
    nodes: [
      { id: 'n1', label: 'FEM validation', kind: 'concept' as const },
    ],
    existingGaps: [],
    discipline: 'structures',
  });
  assert.equal(detected, null, 'le concept est dans le tree → pas de gap');
});

test('A4 computeDetectGap: an EXISTING gap for the concept → null (dedupe S1.3)', () => {
  const detected = computeDetectGap({
    userId: 'user1',
    result: {
      title: 'FEM validation',
      url: 'https://example.com/fem',
      summary: 's',
      kind: 'regulatory' as const,
      source: { kind: 'web' as const },
      credibility: 'documented' as const,
      provenance: {},
    } as unknown as ResearchResult,
    nodes: [],
    existingGaps: [
      { id: 'g1', kind: 'skill' as const, description: 'FEM validation' },
    ],
    discipline: 'structures',
  });
  assert.equal(detected, null, 'un gap existant pour le même concept → dedupe');
});

test('A4 computeWeighGapsAgainstStates: a mastered skill → urgency downgraded to "low"', () => {
  const gap = computeDetectGap({
    userId: 'user1',
    result: {
      title: 'FEM validation',
      url: 'https://example.com/fem',
      summary: 's',
      kind: 'regulatory' as const,
      source: { kind: 'web' as const },
      credibility: 'documented' as const,
      provenance: {},
    } as unknown as ResearchResult,
    nodes: [],
    existingGaps: [],
    discipline: 'structures',
  })!;
  assert.equal(gap.urgency, 'high', 'avant pesée : urgency high');
  const weighed = computeWeighGapsAgainstStates(
    [gap],
    [
      {
        skillId: 'FEM validation',
        level: 'mastered' as SkillState['level'],
        confidence: 0.9,
      },
    ],
  );
  assert.equal(weighed[0]!.urgency, 'low', 'skill mastered → urgency downgrade à low');
});

test('A4 computeApplyDiscoveryFilters: a hit OUTSIDE the discipline → discarded', () => {
  // Le hit a un `discipline` hors du set actif du ctx → rule 1
  // (domain-match) discard (S5.1).
  const ctx = {
    disciplines: ['structures'],
  } as unknown as Parameters<typeof computeApplyDiscoveryFilters>[0];
  const item = {
    discipline: 'aerospace',
  } as unknown as Parameters<typeof computeApplyDiscoveryFilters>[1];
  const decision = computeApplyDiscoveryFilters(ctx, item, []);
  assert.equal(decision.verdict, 'discarded', 'hors-discipline → discard');
  assert.equal(decision.rule, 'domain-match');
});

test('A4 computeRunVeillePipeline: an empty result set → uncertain flag', () => {
  // L'absence de source n'éclate jamais le produit (AD-1, 01 §6) : le
  // pipeline produit un verdict `uncertain` + les items vides. Le flag
  // `uncertain` vit dans le `NotificationJobPayload` (AD-16b), pas à
  // la racine de l'output (VeillePipelineOutput = { discoveryItems,
  // notificationJob }).
  const ctx = {
    disciplines: ['structures'],
  } as unknown as Parameters<typeof computeRunVeillePipeline>[2];
  const out = computeRunVeillePipeline([], {}, ctx, { channelId: 'c', title: 't' });
  assert.equal(out.discoveryItems.length, 0, 'pas de hit → pas d item');
  assert.equal(out.notificationJob.uncertain, true, 'résultat vide → flag uncertain (AD-16b)');
  assert.equal(out.notificationJob.jobKind, 'notification');
});

test('A4 computeDecideVerbe: a first run (no prev vault) → "ajouter" (bootstrap)', () => {
  const run: VaultRunManifest = {
    id: 'r1',
    date: '2026-10-13',
    domaine: 'structures',
    newSources: 5,
    totalSources: 5,
    relevance: 0.9,
    sectionsTouched: ['Ce que je sais'],
    mutations: [],
    at: '2026-10-13T08:00:00.000Z',
  };
  const decision = computeDecideVerbe(null, run);
  assert.equal(decision.verbe, 'ajouter', 'premier run → bootstrap ajouter');
  assert.equal(decision.section, 'Ce que je sais');
  assert.ok(decision.note?.includes('bootstrap'), 'la note mentionne le bootstrap');
});

test('A4 computeAppendRun: first run seeds the vault + appends the manifest', () => {
  const run: VaultRunManifest = {
    id: 'r1',
    date: '2026-10-13',
    domaine: 'structures',
    newSources: 5,
    totalSources: 5,
    relevance: 0.9,
    sectionsTouched: ['Ce que je sais'],
    mutations: [],
    at: '2026-10-13T08:00:00.000Z',
  };
  const vault = computeAppendRun(null, run, '# VAULT', 'hash1', 'user1', 'vault-ulid');
  assert.equal(vault.id, 'vault-ulid', 'le premier run seed l id du vault');
  assert.equal(vault.userId, 'user1');
  assert.equal(vault.domaine, 'structures');
  assert.equal(vault.vaultMd, '# VAULT');
  assert.equal(vault.vaultHash, 'hash1');
  assert.equal(vault.runs.length, 1, 'manifest append-only (1 run)');
  assert.equal(vault.runs[0]!.id, 'r1');
});

test('A4 buildDiscoveryService: the OfflineResearchProvider default (AD-1 fallback)', () => {
  // Sans provider injecté, le repo construit le service sur le
  // `OfflineResearchProvider` (isConfigured=false) : le search renvoie
  // `[]` + le qualify degrade à `uncertain` (01 S6 : l absence de
  // provider n éclate jamais le produit).
  const ctx = {
    disciplines: ['structures'],
  } as unknown as Parameters<typeof buildDiscoveryService>[0];
  const service = buildDiscoveryService(ctx);
  assert.equal(service.provider.id, 'offline', 'le provider par défaut est le offline');
  assert.equal(service.provider.isConfigured(), false, 'offline → isConfigured false');
});

test('A4 buildDiscoveryService: an injected provider (Exa/Tavily via EF) is used', () => {
  const fakeProvider: ResearchProvider = {
    id: 'exa',
    isConfigured: () => true,
    search: async () => [],
  };
  const ctx = {
    disciplines: ['structures'],
  } as unknown as Parameters<typeof buildDiscoveryService>[0];
  const service = buildDiscoveryService(ctx, fakeProvider);
  assert.equal(service.provider.id, 'exa', 'le provider injecté est utilisé');
  assert.equal(service.provider.isConfigured(), true);
});
