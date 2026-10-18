/**
 * M-21 (plan v2 Veille+Chat, S2) — typed model tiers in the TaskProfile
 * (ADR §6 / Q12): the device's « Réflexion et modèle » sheet picks a TIER
 * (Léger / Standard / Avancé / Auto) — a typed parameter of the task
 * profile, NEVER a keyword in the prompt. The router resolves the tier
 * to a concrete (provider, model) pair from the frozen S2.6 catalog;
 * 'auto' leaves the decision to the router (the existing chain logic).
 *
 * TDD: this test FAILS before the implementation
 * (`TaskProfile.modelTier` absent, `resolveModelTier` not exported).
 *
 * Run: `pnpm --filter @aurora/agent test`
 * Node 22: `node --experimental-strip-types --test test/model-tier.test.ts`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AgnesPrimaryRouter,
  AGNES_REGISTRY,
  buildTaskProfile,
  levelFor,
  type RouterRegistry,
  type TaskProfile,
} from '../src/index.ts';
// M-21 (ADR §6): the typed tier resolution — FAILS to compile/resolve
// before the implementation lands (that is the RED of the TDD cycle).
import { resolveModelTier, MODEL_TIER_CATALOG, MODEL_TIER_CATALOG_TIERS, type ModelTier } from '../src/model-tier.ts';

/** The device's task profile carries the typed tier (not a keyword). */
test('M-21 TaskProfile carries a typed modelTier field (auto | light | standard | advanced)', () => {
  const profile: TaskProfile = {
    ...buildTaskProfile(),
    modelTier: 'advanced',
  };
  assert.equal(profile.modelTier, 'advanced');
  // the closed vocabulary is exhaustive — 'auto' is the router's decision.
  const tiers: ModelTier[] = ['auto', 'light', 'standard', 'advanced'];
  for (const t of tiers) {
    const p: TaskProfile = { ...buildTaskProfile(), modelTier: t };
    assert.equal(p.modelTier, t);
  }
});

test('M-21 resolveModelTier: light/standard/advanced pin a (provider, model) pair from the frozen catalog', () => {
  // The tier catalog mirrors the device's MODEL_CATALOG surface
  // (pages/agent: Agnes / Workers AI / Groq / OpenRouter) and resolves
  // DETERMINISTICALLY onto the frozen S2.6 registry — no LLM, no keyword.
  const light = resolveModelTier('light');
  assert.equal(light.provider, 'agnes');
  assert.equal(light.model, 'agnes-3.0');

  const standard = resolveModelTier('standard');
  assert.equal(standard.provider, 'agnes');
  assert.equal(standard.model, 'agnes-3.0');

  const advanced = resolveModelTier('advanced');
  assert.equal(advanced.provider, 'openrouter');
  assert.equal(advanced.model, 'nemotron-3-ultra');
});

test('M-21 resolveModelTier: every pinned pair exists in the frozen S2.6 registry (AD-1: no invented model name)', () => {
  for (const tier of ['light', 'standard', 'advanced'] as const) {
    const pick = resolveModelTier(tier);
    if (!pick) throw new Error(`tier "${tier}" did not resolve`);
    const entry = AGNES_REGISTRY.find((e) => e.provider === pick!.provider);
    assert.ok(entry, `provider "${pick.provider}" is in the S2.6 registry`);
    assert.ok(
      entry!.models.includes(pick!.model),
      `model "${pick!.model}" is a declared model of provider "${pick!.provider}"`,
    );
  }
});

test('M-21 resolveModelTier: "auto" resolves to undefined — the router decides (existing chain)', () => {
  assert.equal(resolveModelTier('auto'), undefined);
});

test('M-21 router consumption: a tiered profile pins the tier provider/model FIRST in the chain', () => {
  const reg: RouterRegistry = {
    list: () => AGNES_REGISTRY,
    modelFor: (provider, _level, profile) => {
      const entry = AGNES_REGISTRY.find((e) => e.provider === provider);
      if (!entry) return undefined;
      const wantsStrong =
        profile.tools > 0 || profile.reasoning === 'deep' || levelFor(profile) === 'CRITICAL';
      return wantsStrong ? entry.models[0] : entry.models[entry.models.length - 1];
    },
  };
  const router = new AgnesPrimaryRouter(
    reg,
    {
      healthy: () => true,
      inCooldown: () => false,
    },
    { hasQuota: () => true },
    { compatible: () => true },
  );

  // The typed tier is resolved INTO preferredProvider/preferredModel
  // BEFORE the router runs (the tier itself is never sniffed in a prompt,
  // ADR §6) — the router sees only the pinned pair, its S2.6 logic intact.
  const profile: TaskProfile = {
    ...buildTaskProfile(),
    modelTier: 'advanced',
    preferredProvider: 'openrouter',
    preferredModel: 'nemotron-3-ultra',
  };
  const chain = router.chain(profile, 'u1');
  assert.ok(chain.length > 0, 'chain non-vide');
  assert.equal(chain[0]!.provider, 'openrouter', 'le palier avancé est épinglé en tête de chaîne');
  assert.equal(chain[0]!.model, 'nemotron-3-ultra');
});

test('M-21 router consumption: profile.modelTier ALONE (no explicit pin) drives the chain head', () => {
  // The router itself consumes `modelTier` (not a prompt keyword, ADR §6):
  // a profile that only carries the typed tier pins the tier's pair at the
  // head of the chain — 'advanced' → openrouter/nemotron-3-ultra,
  // 'auto' → the Agnes-primary S2.6 chain (no pin).
  const reg: RouterRegistry = {
    list: () => AGNES_REGISTRY,
    modelFor: (provider, _level, profile) => {
      const entry = AGNES_REGISTRY.find((e) => e.provider === provider);
      if (!entry) return undefined;
      const wantsStrong =
        profile.tools > 0 || profile.reasoning === 'deep' || levelFor(profile) === 'CRITICAL';
      return wantsStrong ? entry.models[0] : entry.models[entry.models.length - 1];
    },
  };
  const mk = () =>
    new AgnesPrimaryRouter(
      reg,
      { healthy: () => true, inCooldown: () => false },
      { hasQuota: () => true },
      { compatible: () => true },
    );

  const tierOnly: TaskProfile = { ...buildTaskProfile(), modelTier: 'advanced' };
  const chainAdvanced = mk().chain(tierOnly, 'u1');
  assert.ok(chainAdvanced.length > 0);
  assert.equal(chainAdvanced[0]!.provider, 'openrouter', 'le palier typé pilote le routeur');
  assert.equal(chainAdvanced[0]!.model, 'nemotron-3-ultra');

  const autoOnly: TaskProfile = { ...buildTaskProfile(), modelTier: 'auto' };
  const chainAuto = mk().chain(autoOnly, 'u1');
  assert.ok(chainAuto.length > 0);
  assert.equal(chainAuto[0]!.provider, 'agnes', 'auto = le routeur S2.6 décide (Agnes-first)');
});

test('M-21 MODEL_TIER_CATALOG: the closed tier vocabulary is frozen (auto/light/standard/advanced)', () => {
  assert.deepEqual(
    [...MODEL_TIER_CATALOG_TIERS].sort(),
    ['advanced', 'auto', 'light', 'standard'],
  );
  // The catalog carries exactly one pin per NON-auto tier.
  for (const tier of ['light', 'standard', 'advanced'] as const) {
    const entry = MODEL_TIER_CATALOG[tier];
    assert.ok(entry, `le palier "${tier}" porte un couple (provider, model)`);
  }
  assert.equal(MODEL_TIER_CATALOG.auto, undefined, 'auto = pas d’épinglage, le routeur décide');
});
