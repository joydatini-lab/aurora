/**
 * M-21 (plan v2 Veille+Chat S2, ADR §6 / Q12) — typed model tiers.
 *
 * The device's « Réfxion et modl » sheet (stitch `agent_r_flexion_et_mod_le`)
 * picks a TIER (Léger / Standard / Avancé / Auto) — a **typed parameter of
 * the task profile** (`taskProfile.modelTier`), submitted to policy + AI
 * budget. NEVER a keyword in a prompt (ADR §6: le profil de tche type,
 * jamais de mots-clés).
 *
 * Resolution is DETERMINISTIC: the frozen catalog below maps each tier
 * onto a concrete (provider, model) pair that EXISTS in the S2.6 frozen
 * registry (`AGNES_REGISTRY`, router.ts) — no invented model name (AD-1),
 * no LLM, no string match. `auto` pins nothing: the router's S2.6 chain
 * decides (Agnes primary → fallbacks).
 *
 * The tier is resolved into `preferredProvider` / `preferredModel` BEFORE
 * the router runs — the router's existing consumption
 * (`AgnesPrimaryRouter.chain` step 0 "device prefer") is unchanged; the
 * kernel just feeds it the pinned pair. A tier pin is still subject to
 * AD-5 fallback (cooldown / down → next provider in the chain).
 */
import type { TaskProfile } from './types.ts';

/** The closed tier vocabulary (Q12: Auto / Léger / Standard / Avancé). */
export type ModelTier = 'auto' | 'light' | 'standard' | 'advanced';

export const MODEL_TIERS: readonly ModelTier[] = ['auto', 'light', 'standard', 'advanced'];

/** The tier the device UI renders (French labels, stitch écran 4). */
export const MODEL_TIER_LABELS: Record<ModelTier, string> = {
  auto: 'Auto',
  light: 'Léger',
  standard: 'Standard',
  advanced: 'Avancé',
};

/** One pinned pair per tier (all exist in AGNES_REGISTRY — see router.ts). */
export interface ModelTierPin {
  provider: string;
  model: string;
}

/**
 * The frozen tier catalog. `auto` is deliberately ABSENT: an explicit
 * `resolveModelTier('auto')` returns `undefined` = the router decides
 * (the S2.6 chain, PRIORITY 3 Agnes-first).
 *
 *   light    → agnes / agnes-3.0            (rapide, coût réduit)
 *   standard → agnes / agnes-3.0            (le compromis par défaut)
 *   advanced → openrouter / nemotron-3-ultra (raisonnement poussé, plus lent)
 */
export const MODEL_TIER_CATALOG: Record<Exclude<ModelTier, 'auto'>, ModelTierPin> & {
  auto?: never;
} = {
  light: { provider: 'agnes', model: 'agnes-3.0' },
  standard: { provider: 'agnes', model: 'agnes-3.0' },
  advanced: { provider: 'openrouter', model: 'nemotron-3-ultra' },
};

export const MODEL_TIER_CATALOG_TIERS: readonly ModelTier[] = MODEL_TIERS;

/**
 * Resolve a tier to its pinned (provider, model) pair.
 * `auto` → `undefined` (the router's S2.6 chain decides — Q12).
 */
export function resolveModelTier(tier: ModelTier): ModelTierPin | undefined {
  if (tier === 'auto') return undefined;
  return MODEL_TIER_CATALOG[tier];
}

/**
 * Fold a typed tier into the device preference fields the router already
 * consumes (`preferredProvider` / `preferredModel`, router.ts step 0).
 * Pure — no I/O, no prompt text (ADR §6). An explicit `preferredProvider`
 * the device picked (model picker) WINS over the tier pin: the tier is a
 * default, the explicit picker is the user's direct choice.
 */
export function applyModelTierToProfile(
  profile: TaskProfile,
  tier: ModelTier,
): TaskProfile {
  const pin = resolveModelTier(tier);
  const out: TaskProfile = { ...profile, modelTier: tier };
  if (pin && !profile.preferredProvider) {
    out.preferredProvider = pin.provider;
    out.preferredModel = pin.model;
  }
  return out;
}
