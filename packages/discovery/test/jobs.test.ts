/**
 * LOT 1 (discovery-vault plan 2026-10-10) — the `research` handler's
 * per-user filter resolution (discoveryProfile → DiscoveryFilterContext).
 *
 * node:test + --experimental-strip-types (no build step), same style as
 * test/discovery.test.ts / test/veille-pipeline.test.ts.
 *
 * Run: `pnpm --filter @aurora/discovery test`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscoveryResearchHandler,
  DISCOVERY_JOB_HANDLERS,
} from '../src/jobs.ts';
import { buildFilterCtx } from '../src/filtering.ts';
import type {
  DiscoveryFilterContext,
} from '../src/filtering.ts';
import type {
  ResearchProvider,
  ResearchQuery,
  ResearchResult,
  UserContext,
} from '@aurora/domain';

const USER = '00000000-0000-0000-0000-000000000001';

/** A minimal `ResearchProvider` port implementation (no vendor, no
 *  fetch — a pure test double that reports itself configured). */
function mockProvider(results: ResearchResult[]): ResearchProvider {
  return {
    id: 'mock',
    isConfigured: () => true,
    search: async (_q: ResearchQuery): Promise<ResearchResult[]> => results,
  };
}

/** A `ResearchResult` that carries a `discipline` the filter can match. */
function makeHit(over: Partial<ResearchResult> & { discipline: string }): ResearchResult {
  return {
    provider: 'mock',
    kind: 'other',
    title: 'Hit',
    summary: 'Summary',
    confidence: 0.5,
    credibility: 'documented',
    ...over,
  } as unknown as ResearchResult;
}

function userContextWithProfile(
  profile: Record<string, unknown>,
): UserContext {
  return {
    id: 'uc-1',
    userId: USER,
    theme: 'aurora',
    themeStyle: 'light',
    coachCadence: 'normal',
    discoveryProfile: profile,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * LOT 1 core test: `resolveUserContext` returning a UserContext whose
 * `discoveryProfile.disciplines = ['structures', 'concrete']` → the
 * filterCtx RESOLVED by the handler carries those disciplines.
 * Proven indirectly: an in-discipline hit survives (item produced)
 * while an out-of-discipline hit is discarded.
 */
test('LOT 1: resolveUserContext + discoveryProfile.disciplines → the real filterCtx drives qualification', async () => {
  const hitIn = makeHit({
    discipline: 'structures',
    title: 'EC7 soil norm update',
    credibility: 'uncertain', // AD-16b: even a relevant verdict keeps the suffix
  });
  const hitOut = makeHit({
    discipline: 'hydraulics',
    title: 'Pipes catalog',
    credibility: 'uncertain',
  });

  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: [] }, // the static fallback — must NOT be what runs
    provider: mockProvider([hitIn, hitOut]),
    resolveUserContext: async (userId) =>
      userId === USER
        ? userContextWithProfile({
            disciplines: ['structures', 'concrete'],
            region: 'benin',
            professionalTarget: 'bureau_etudes',
            budgetConstraint: 'student',
          })
        : null,
  });

  const res = await handler.handler('j1', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    sheetTitle: 'Veille structures',
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true, 'le handler ne casse jamais (dégradation AD-1)');
  const r = res.result as {
    discoveryItems: Array<{ summary: string; discipline?: string }>;
  };
  // The in-discipline hit ('structures') produced an item; the
  // out-of-discipline one ('hydraulics') was DISCARDED by the filter
  // resolved from the user's REAL profile — proof the disciplines
  // ['structures', 'concrete'] drove the run, not the empty fallback.
  assert.equal(r.discoveryItems.length, 1, "l'hit hors-discipline est écarté par le filterCtx résolu");
  assert.equal(r.discoveryItems[0].summary?.endsWith('(uncertain)'), true, 'AD-16b: suffixe (uncertain) porté par l\'item');
});

/**
 * LOT 1 AD-1 degradation: `resolveUserContext` returning `null`
 * (no user context row) → the filterCtx degrades to the fallback
 * (deps.filterCtx) — never a rupture, the job completes.
 */
test('LOT 1 AD-1: resolveUserContext → null → le fallback ctx est repris (pas de rupture)', async () => {
  let resolverCalled = 0;
  const probeProvider: ResearchProvider = {
    id: 'mock',
    isConfigured: () => true,
    search: async (): Promise<ResearchResult[]> => [
      makeHit({
        discipline: 'fallback-only',
        title: 'In fallback',
        credibility: 'uncertain',
      }),
    ],
  };

  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['fallback-only'] },
    provider: probeProvider,
    resolveUserContext: async () => {
      resolverCalled += 1;
      return null;
    },
  });

  const res = await handler.handler('j2', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    sheetTitle: 'Veille',
    query: { userId: USER, topic: 'x', domains: ['fallback-only'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true, 'AD-1: null user context ne casse pas le job');
  assert.equal(resolverCalled, 1, 'le resolveur a été appelé (pas de court-circuit)');
  const r = res.result as { discoveryItems: unknown[]; notificationJob: { uncertain: boolean } };
  assert.equal(r.discoveryItems.length, 1, 'le fallback ctx (disciplines du deps) est repris');
  assert.equal(r.notificationJob.uncertain, true, 'AD-16b: source uncertain → flag true');
});

/**
 * LOT 1: no `resolveUserContext` injected at all (a module-level static
 * `DISCOVERY_JOB_HANDLERS` consumer) → the deps.filterCtx is used
 * directly — the static wiring still works (no rupture, backward
 * compat).
 */
test('LOT 1: resolveUserContext absent → le deps.filterCtx statique est repris (wiring module intact)', async () => {
  const provider: ResearchProvider = {
    id: 'mock',
    isConfigured: () => true,
    search: async (): Promise<ResearchResult[]> => [
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ],
  };
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider,
    // NO resolveUserContext — the static path
  });

  const res = await handler.handler('j3', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    sheetTitle: 'Veille',
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true);
  const r = res.result as { discoveryItems: unknown[] };
  assert.equal(r.discoveryItems.length, 1, 'le ctx statique qualifie l\'hit in-discipline');
});

/**
 * LOT 1 direct contract: `buildFilterCtx` maps the G-D14 profile fields
 * onto the engine's `DiscoveryFilterContext` (only fields that exist on
 * BOTH sides — nothing invented).
 */
test('LOT 1: buildFilterCtx maps the G-D14 profile (disciplines/region/target/budget) without inventing fields', () => {
  const ctx = buildFilterCtx({
    disciplines: ['structures', 'concrete'],
    region: 'benin',
    professionalTarget: 'bureau_etudes',
    budgetConstraint: 'student',
  });
  assert.deepEqual(ctx.disciplines, ['structures', 'concrete']);
  assert.equal(ctx.region, 'benin');
  assert.equal(ctx.professionalTarget, 'bureau_etudes');
  assert.equal(ctx.budget, 'student');
  // NOT on the typed profile → NOT induced (no invented fields).
  assert.equal(ctx.examinationPeriod, undefined);
  assert.equal(ctx.availableTools, undefined);

  // Absent disciplines (malformed / partial profile) → [] (AD-1).
  assert.deepEqual(buildFilterCtx({ disciplines: [] }).disciplines, []);
});

/**
 * M-72 (S7 finitions) — le payload notificationJob produit par le handler
 * `research` porte le `topic` du run dans le `body` (SSoT correct :
 * « ta veille sur {topic} est prête »), et le `channelId` est l'id du
 * run/vault (pas un placeholder vide) — le trigger push OneSignal fin
 * de run est bien câblé end-to-end.
 */
test('M-72 : le notificationJob du run research porte le topic du run dans le body (SSoT, M-72 S7)', async () => {
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider: mockProvider([
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ]),
  });

  const res = await handler.handler('j72', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'vault-ch1',
    // PAS de sheetTitle/sheetBody portées : le pipeline doit dériver le
    // body depuis le `topic` du run (query.topic).
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true, 'M-72: le handler ne casse jamais (dégradation AD-1)');
  const r = res.result as {
    notificationJob: {
      module: string;
      jobKind: string;
      channelId: string;
      title: string;
      body?: string;
      uncertain: boolean;
    };
  };
  // M-72 SSoT : le body du notification job DOIT porter le `topic` du run
  // (« ta veille sur structures est prête ») — pas un placeholder vide,
  // pas « ta veille est prête » générique sans le topic.
  assert.equal(r.notificationJob.body, 'ta veille sur structures est prête', 'M-72: le body porte le topic du run (SSoT correct)');
  // Le channelId est l'id du run/vault (non vide), pas un placeholder.
  assert.equal(r.notificationJob.channelId, 'vault-ch1', 'M-72: le channelId est l\'id du run/vault (pas un placeholder vide)');
  // Le titre tombe sur le topic quand le sheetTitle n\'est pas porté.
  assert.equal(r.notificationJob.title, 'structures', 'M-72: le title tombe sur le topic du run');
  // La chaîne reste module-scoped 'integrations' + jobKind 'notification' (chevauchement ORION).
  assert.equal(r.notificationJob.module, 'integrations');
  assert.equal(r.notificationJob.jobKind, 'notification');
  // AD-16b : le flag `uncertain` reste porté par le payload.
  assert.equal(typeof r.notificationJob.uncertain, 'boolean');
});

/**
 * M-72 (S7 finitions) — avec un `sheetBody` explicite porté, le pipeline
 * conserve le body fourni (pas de surscription) mais le topic reste
 * SSoT du run quand le sheetBody est absent.
 */
test('M-72 : le sheetBody explicite est conservé ; le topic du run est le SSoT quand absent', async () => {
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider: mockProvider([
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ]),
  });

  // Cas 1 : sheetBody explicit → le body fourni est conservé.
  const res1 = await handler.handler('j72a', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    sheetBody: 'custom body',
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });
  const r1 = res1.result as { notificationJob: { body?: string } };
  assert.equal(r1.notificationJob.body, 'custom body', 'M-72: le sheetBody explicite est conservé');

  // Cas 2 : sheetTitle porté + sheetBody absent → le body retombe sur le
  // topic du run (SSoT M-72).
  const res2 = await handler.handler('j72b', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    sheetTitle: 'Veille structures',
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });
  const r2 = res2.result as { notificationJob: { body?: string; title: string } };
  assert.equal(r2.notificationJob.title, 'Veille structures', 'M-72: le sheetTitle explicite est conservé');
  assert.equal(r2.notificationJob.body, 'ta veille sur structures est prête', 'M-72: le body retombe sur le topic du run quand le sheetBody est absent');
});

/**
 * M-72 (S7 finitions) — le body tombe sur le topic aussi quand le
 * topic est vide : la dégradation AD-1 produit un message générique
 * « ta veille est prête » (pas une rupture).
 */
test('M-72 : topic vide → le body retombe sur le message générique (dégradation AD-1)', async () => {
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider: mockProvider([
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ]),
  });

  const res = await handler.handler('j72c', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'ch1',
    query: { userId: USER, topic: '', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true);
  const r = res.result as { notificationJob: { body?: string; title: string } };
  assert.equal(r.notificationJob.body, 'ta veille est prête', 'M-72: topic vide → message générique (AD-1 dégradation)');
});

/**
 * M-72 (S7 finitions) — le `channelId` par défaut est « default »
 * (pas un placeholder vide), quand le payload n\'en porte pas.
 */
test('M-72 : le channelId par défaut est « default » (pas un placeholder vide)', async () => {
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider: mockProvider([
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ]),
  });

  const res = await handler.handler('j72d', USER, {
    op: 'multi-source',
    discoverySheet: true,
    // PAS de channelId porté → le défaut « default » doit s\'appliquer.
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true);
  const r = res.result as { notificationJob: { channelId: string } };
  assert.equal(r.notificationJob.channelId, 'default', 'M-72: le channelId par défaut est « default »');
});

/**
 * M-72 (S7 finitions) — le trigger end-to-end : le `research` handler du
 * module Discovery retourne le `notificationJob` payload que le dispatcher
 * (ORION) enfile sur le module `integrations` / jobKind `notification`
 * (le handler `integrations/notification` de `automations.ts` l\'exécute,
 * le client OneSignal est appelé, AD-1 : le vendor reste dans l'adapter).
 * Le test pinne la chaîne de wiring : le payload a le `module`/`jobKind`
 * exact que le dispatcher attend.
 */
test('M-72 end-to-end : le notificationJob retourné par le handler research est routable par le dispatcher ORION (wiring trigger)', async () => {
  const handler = buildDiscoveryResearchHandler({
    filterCtx: { disciplines: ['structures'] },
    provider: mockProvider([
      makeHit({ discipline: 'structures', title: 'S', credibility: 'documented' }),
    ]),
  });

  const res = await handler.handler('j72e', USER, {
    op: 'multi-source',
    discoverySheet: true,
    channelId: 'vault-ch1',
    query: { userId: USER, topic: 'structures', domains: ['structures'], kinds: ['other'] } as never,
  });

  assert.equal(res.ok, true);
  const r = res.result as {
    discoveryItems: unknown[];
    notificationJob: { module: string; jobKind: string; channelId: string; title: string; body?: string; uncertain: boolean };
  };
  // Le dispatcher (fn-job-dispatcher L217 wireGlobalJobSwitch) route par
  // (jobKind, module) — le payload doit porter EXACTEMENT le tuple
  // ('notification', 'integrations') pour être routable.
  assert.equal(r.notificationJob.jobKind, 'notification', 'M-72 e2e: le jobKind est « notification » (routable par ORION)');
  assert.equal(r.notificationJob.module, 'integrations', 'M-72 e2e: le module est « integrations » (le handler OneSignal y vit)');
  // Le topic du run est dans le body (SSoT M-72).
  assert.equal(r.notificationJob.body, 'ta veille sur structures est prête', 'M-72 e2e: le body porte le topic du run');
  // Le channelId est l\'id du run/vault (non vide).
  assert.equal(r.notificationJob.channelId, 'vault-ch1');
  // AD-16b : le flag uncertain est porté.
  assert.equal(typeof r.notificationJob.uncertain, 'boolean');
});

/**
 * LOT 1: `DISCOVERY_JOB_HANDLERS` still exposes the module's static
 * 'research' handler (the export the module owns + tests pin) — the
 * dispatcher re-builds it with env seams, the table stays intact.
 */
test('LOT 1: DISCOVERY_JOB_HANDLERS exposes the static research/discovery handler (module export pinned)', () => {
  assert.ok(
    DISCOVERY_JOB_HANDLERS.some((h) => h.jobKind === 'research' && h.module === 'discovery'),
    'le module conserve sa table statique (le dispatcher reconstruit avec env)',
  );
});
