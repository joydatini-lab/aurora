/**
 * Design Space Pro — Brand DNA contract (reference v1.1 §6.2, §6.7, §6.8).
 *
 * The invariant this file protects is the one §6.2 states in prose and no type
 * can enforce on its own:
 *   "Aurora doit distinguer information fournie, proposition générée, décision
 *    acceptée et information inconnue. Les assertions stratégiques ne doivent
 *    pas être présentées comme des faits de marché sans sources."
 *
 * A validator that merely returned `[]` for everything would pass a test that
 * only checked "no crash". Each test below therefore asserts the NEGATIVE case
 * first where it matters: a market assertion generated without a source MUST be
 * flagged, an `unknown` field MUST NOT carry a value. Those are the failures the
 * validator exists to catch — the same discipline as the phantom-empty-state
 * rule (a status must not claim a state the data contradicts).
 *
 * Run: node --experimental-strip-types --no-warnings --test packages/domain/test/brand-dna.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_ASSERTION_FIELDS,
  validateBrandDna,
  diffBrandDna,
  lockedFields,
  hasContent,
  type AssertionStatus,
  type BrandDna,
  type BrandDnaField,
} from '../src/index.ts';

/** A field that is empty and honest about it. */
function unknown<T>(): BrandDnaField<T> {
  return { status: 'unknown', sourceRefs: [] };
}

/** A field the user supplied — the only status that is a fact by origin. */
function provided<T>(value: T): BrandDnaField<T> {
  return { value, status: 'provided', sourceRefs: [] };
}

/** A minimal DNA where every field is honestly `unknown`. */
function emptyDna(): BrandDna {
  const f = <T,>() => unknown<T>();
  return {
    projectId: 'p1',
    userId: 'u1',
    version: 1,
    strategy: {
      name: f<string>(),
      description: f<string>(),
      mission: f<string>(),
      positioning: f<string>(),
      audience: f<string>(),
      marketContext: f<string>(),
      differentiation: f<string>(),
      promise: f<string>(),
    },
    personality: {
      values: f<string[]>(),
      personality: f<string[]>(),
      tone: f<string>(),
      vocabulary: f<string[]>(),
      keyMessages: f<string[]>(),
      slogan: f<string>(),
      writingRules: f<string[]>(),
    },
    visualIdentity: {
      logoArtifactIds: f<string[]>(),
      palettes: f<Array<{ name: string; colors: string[] }>>(),
      typographies: f<Array<{ role: string; family: string }>>(),
      iconography: f<string>(),
      imageStyles: f<string[]>(),
      grid: f<string>(),
      margins: f<string>(),
      compositionPrinciples: f<string[]>(),
    },
    usageRules: {
      onLightBackground: f<string>(),
      onDarkBackground: f<string>(),
      proportions: f<string>(),
      minimumSizes: f<string>(),
      clearSpace: f<string>(),
      forbiddenUsages: f<string[]>(),
      contrast: f<string>(),
    },
    digitalIdentity: {
      designTokens: f<Record<string, string>>(),
      baseComponents: f<string[]>(),
      states: f<string[]>(),
      interfaceStyles: f<string[]>(),
      reuseRules: f<string[]>(),
    },
    provenance: { author: 'u1', createdAt: '2026-10-26T00:00:00Z', changeSummary: [] },
  };
}

test('brand-dna: an all-unknown DNA is valid — "unknown" is a legitimate answer', () => {
  // The reference explicitly allows fields to be absent. A validator that
  // treated "missing" as an error would force invention, which is the defect.
  assert.deepEqual(validateBrandDna(emptyDna()), []);
});

test('brand-dna: a generated market assertion with no source IS flagged (§6.2)', () => {
  // The failure mode §6.2 names: a market claim rendered as an established fact.
  const dna = emptyDna();
  dna.strategy.marketContext = {
    value: 'Le marché européen croît de 12 % par an',
    status: 'generated',
    sourceRefs: [],
  };
  const violations = validateBrandDna(dna);
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.field, 'strategy.marketContext');
  assert.equal(violations[0]!.kind, 'market-assertion-without-source');
});

test('brand-dna: an accepted market assertion with no source is ALSO flagged (§6.2)', () => {
  // Accepting a proposal does not turn it into a sourced fact. Only the
  // user's own statement ('provided') is exempt — it is their claim, not ours.
  const dna = emptyDna();
  dna.strategy.audience = {
    value: 'PME de 10 à 50 salariés',
    status: 'accepted',
    sourceRefs: [],
  };
  const violations = validateBrandDna(dna);
  assert.deepEqual(
    violations.map((v) => [v.field, v.kind]),
    [['strategy.audience', 'market-assertion-without-source']],
  );
});

test('brand-dna: a provided market assertion is exempt — it is the user’s own claim', () => {
  const dna = emptyDna();
  dna.strategy.audience = provided('Artisans indépendants');
  assert.deepEqual(validateBrandDna(dna), []);
});

test('brand-dna: a market assertion WITH a source is valid whatever its status', () => {
  const dna = emptyDna();
  dna.strategy.differentiation = {
    value: 'Seule offre à intégrer le suivi FSRS',
    status: 'generated',
    sourceRefs: ['src-1'],
  };
  assert.deepEqual(validateBrandDna(dna), []);
});

test('brand-dna: "unknown" carrying a value is flagged — the status lies', () => {
  // Same class as a phantom empty state: the status claims a state the data
  // contradicts. An "unknown" with a value means a generation leaked in.
  const dna = emptyDna();
  dna.personality.tone = { value: 'Chaleureux et direct', status: 'unknown', sourceRefs: [] };
  const violations = validateBrandDna(dna);
  assert.deepEqual(
    violations.map((v) => [v.field, v.kind]),
    [['personality.tone', 'unknown-with-value']],
  );
});

test('brand-dna: "accepted" with no value is flagged — nothing was decided', () => {
  const dna = emptyDna();
  dna.visualIdentity.grid = { status: 'accepted', sourceRefs: [] };
  const violations = validateBrandDna(dna);
  assert.deepEqual(
    violations.map((v) => [v.field, v.kind]),
    [['visualIdentity.grid', 'accepted-without-value']],
  );
});

test('brand-dna: the 4 required market-assertion fields are exactly the closed list', () => {
  // If this list grows silently, the validator stops covering a new market
  // claim. Pinned so the change is deliberate.
  assert.deepEqual(
    [...MARKET_ASSERTION_FIELDS].sort(),
    ['strategy.audience', 'strategy.differentiation', 'strategy.marketContext', 'strategy.positioning'],
  );
});

test('brand-dna: a market-assertion path resolves to a real field (not a typo)', () => {
  // Guards against a typo in the list silently disabling a check: the list is
  // matched against the real field paths, not a parallel structure.
  const dna = emptyDna();
  dna.strategy.positioning = {
    value: 'x',
    status: 'generated',
    sourceRefs: [],
  };
  const violations = validateBrandDna(dna);
  assert.ok(
    violations.some((v) => v.field === 'strategy.positioning'),
    'a market assertion path that does not resolve would make the validator vacuous',
  );
});

test('brand-dna: validate is pure — it does not mutate the DNA', () => {
  const dna = emptyDna();
  dna.strategy.marketContext = { value: 'x', status: 'generated', sourceRefs: [] };
  const before = JSON.stringify(dna);
  validateBrandDna(dna);
  assert.equal(JSON.stringify(dna), before);
});

test('brand-dna: diff reports the changed block and the exact fields (§6.8)', () => {
  // §6.8: a logo/palette/typography change must trigger an impact analysis.
  // The diff is the input to that analysis — it must name the fields.
  const before = emptyDna();
  const after = emptyDna();
  after.version = 2;
  after.visualIdentity.palettes = {
    value: [{ name: 'primaire', colors: ['#0B7285'] }],
    status: 'accepted',
    sourceRefs: [],
  };
  after.personality.tone = provided('Direct');

  const changes = diffBrandDna(before, after);
  assert.deepEqual(changes, [
    { block: 'personality', fields: ['personality.tone'] },
    { block: 'visualIdentity', fields: ['visualIdentity.palettes'] },
  ]);
});

test('brand-dna: diff is empty when only provenance/version change', () => {
  // A new version that changes no brand field must not trigger an impact
  // analysis — otherwise every re-save would spam the user with revisions.
  const before = emptyDna();
  const after = emptyDna();
  after.version = 2;
  after.provenance = { author: 'u1', createdAt: '2026-11-01T00:00:00Z', basedOnVersion: 1, changeSummary: ['re-save'] };
  assert.deepEqual(diffBrandDna(before, after), []);
});

test('brand-dna: diff reports a changed LOCKED field rather than hiding it (§6.7)', () => {
  // §6.7: the AI must not overwrite a locked attribute. If one changed anyway,
  // that is a defect to surface, not a change to swallow.
  const before = emptyDna();
  const after = emptyDna();
  after.personality.tone = { value: 'Autoritaire', status: 'generated', sourceRefs: [], locked: true };
  const changes = diffBrandDna(before, after);
  assert.deepEqual(changes, [{ block: 'personality', fields: ['personality.tone'] }]);
});

test('brand-dna: lockedFields lists exactly the locked paths (§6.7)', () => {
  const dna = emptyDna();
  dna.usageRules.contrast = { value: 'AA', status: 'accepted', sourceRefs: [], locked: true };
  dna.strategy.name = { value: 'Acme', status: 'provided', sourceRefs: [], locked: true };
  dna.personality.tone = provided('Direct');
  assert.deepEqual(lockedFields(dna).sort(), ['strategy.name', 'usageRules.contrast']);
});

test('brand-dna: hasContent treats empty containers as absence, not content', () => {
  // The distinction the validator depends on: '' and [] are "not there yet".
  assert.equal(hasContent(undefined), false);
  assert.equal(hasContent(''), false);
  assert.equal(hasContent('   '), false);
  assert.equal(hasContent([]), false);
  assert.equal(hasContent({}), false);
  assert.equal(hasContent('x'), true);
  assert.equal(hasContent(['x']), true);
  assert.equal(hasContent({ a: '1' }), true);
  assert.equal(hasContent(0), true);
});

test('brand-dna: the status vocabulary is exactly the 4 the reference names (§6.2)', () => {
  const all: AssertionStatus[] = ['provided', 'generated', 'accepted', 'unknown'];
  assert.equal(new Set(all).size, 4);
  for (const s of all) assert.equal(typeof s, 'string');
});
