/**
 * Design Space Pro entities (AD-15 SSoT, reference v1.1 §6).
 *
 * WHY THIS IS NOT A NEW ROOT (reference §7.2, OQ-7): the reference forbids
 * creating a root entity before auditing the existing concepts. The audit
 * (`docs/frontend/design-space-scope.md` §4) found the concepts already exist:
 * a logo, an affiche or a document IS an `Artifact` (versionable, linked to a
 * `Project`), and the Brand DNA is a *structured representation attached to the
 * brand project* — not a second source of truth (AD-6/AD-15). So this file adds
 * the Brand DNA CONTRACT; it adds no table and no new root.
 *
 * THE INVARIANT THIS FILE EXISTS FOR (reference §6.2, §6.6):
 *   "Tous les champs ne sont pas obligatoires pour toutes les marques. Aurora
 *    doit distinguer information fournie, proposition générée, décision acceptée
 *    et information inconnue. Les assertions stratégiques ne doivent pas être
 *    présentées comme des faits de marché sans sources."
 * A generated market claim rendered as an established fact is the exact failure
 * mode this vocabulary prevents — the same class as the phantom empty states
 * (AD-7): the UI must not assert what the data does not support.
 *
 * Vendor-free (AD-1): imports nothing. Pure logic, no DOM (AD-12/F-09).
 */

/**
 * The four epistemic states the reference requires (§6.2). Not a maturity
 * ladder: `unknown` is a legitimate, reportable answer — inventing a value to
 * fill it is the defect.
 *  - `provided`  — the user supplied it (the only state that is a fact by origin);
 *  - `generated` — Aurora proposed it; NOT yet a decision;
 *  - `accepted`  — the user accepted a proposal; a decision, still not a fact;
 *  - `unknown`   — Aurora does not have it. Must carry no value.
 */
export type AssertionStatus = 'provided' | 'generated' | 'accepted' | 'unknown';

/**
 * One Brand DNA field: the value plus what it IS. `sourceRefs` cite Knowledge
 * `SourceRef` ids (AD-11 provenance) — required for a market assertion, because
 * §6.2 forbids presenting one as a fact without sources.
 */
export interface BrandDnaField<T> {
  value?: T;
  status: AssertionStatus;
  /** Knowledge `SourceRef` ids backing the value (AD-11). */
  sourceRefs: string[];
  /** §6.7 attribute lock: a locked field is never overwritten by a generation. */
  locked?: boolean;
}

/** §6.2 "Stratégie". `marketContext`/`audience`/`differentiation` are market
 *  assertions — see `MARKET_ASSERTION_FIELDS`. */
export interface BrandStrategy {
  name: BrandDnaField<string>;
  description: BrandDnaField<string>;
  mission: BrandDnaField<string>;
  positioning: BrandDnaField<string>;
  audience: BrandDnaField<string>;
  marketContext: BrandDnaField<string>;
  differentiation: BrandDnaField<string>;
  promise: BrandDnaField<string>;
}

/** §6.2 "Personnalité et expression". */
export interface BrandPersonality {
  values: BrandDnaField<string[]>;
  personality: BrandDnaField<string[]>;
  tone: BrandDnaField<string>;
  vocabulary: BrandDnaField<string[]>;
  keyMessages: BrandDnaField<string[]>;
  slogan: BrandDnaField<string>;
  writingRules: BrandDnaField<string[]>;
}

/** §6.2 "Identité visuelle". Asset ids point to `Artifact` rows (no binary here). */
export interface BrandVisualIdentity {
  /** Artifact ids of the logo and its variants. */
  logoArtifactIds: BrandDnaField<string[]>;
  palettes: BrandDnaField<Array<{ name: string; colors: string[] }>>;
  typographies: BrandDnaField<Array<{ role: string; family: string }>>;
  iconography: BrandDnaField<string>;
  imageStyles: BrandDnaField<string[]>;
  grid: BrandDnaField<string>;
  margins: BrandDnaField<string>;
  compositionPrinciples: BrandDnaField<string[]>;
}

/** §6.2 "Règles d'usage". */
export interface BrandUsageRules {
  onLightBackground: BrandDnaField<string>;
  onDarkBackground: BrandDnaField<string>;
  proportions: BrandDnaField<string>;
  minimumSizes: BrandDnaField<string>;
  clearSpace: BrandDnaField<string>;
  forbiddenUsages: BrandDnaField<string[]>;
  contrast: BrandDnaField<string>;
}

/** §6.2 "Identité numérique" — feeds the design tokens (AD-17). */
export interface BrandDigitalIdentity {
  designTokens: BrandDnaField<Record<string, string>>;
  baseComponents: BrandDnaField<string[]>;
  states: BrandDnaField<string[]>;
  interfaceStyles: BrandDnaField<string[]>;
  reuseRules: BrandDnaField<string[]>;
}

/** §6.2 "Provenance et version" — who changed what, when, and versus what. */
export interface BrandDnaProvenance {
  author: string;
  createdAt: string;
  /** the version this one was derived from (absent for version 1). */
  basedOnVersion?: number;
  /** one line per changed block (§6.8 impact analysis input). */
  changeSummary: string[];
}

/** The six blocks of §6.2. */
export interface BrandDna {
  /** the brand `Project` this DNA belongs to (reuse, not a new root — §7.2). */
  projectId: string;
  userId: string;
  /** monotonic; every accepted change produces a new immutable version (§6.8). */
  version: number;
  strategy: BrandStrategy;
  personality: BrandPersonality;
  visualIdentity: BrandVisualIdentity;
  usageRules: BrandUsageRules;
  digitalIdentity: BrandDigitalIdentity;
  provenance: BrandDnaProvenance;
}

/**
 * The fields whose content is a MARKET ASSERTION, not an internal choice.
 * §6.2: these must not be presented as market facts without sources. Kept as a
 * closed list so `validateBrandDna` is exhaustive rather than heuristic.
 */
export const MARKET_ASSERTION_FIELDS: ReadonlyArray<string> = [
  'strategy.audience',
  'strategy.marketContext',
  'strategy.differentiation',
  'strategy.positioning',
];

/** A typed violation, so the UI can point at the exact field (§6.7). */
export interface BrandDnaViolation {
  /** dotted path of the offending field, e.g. `strategy.marketContext`. */
  field: string;
  kind:
    | 'market-assertion-without-source'
    | 'accepted-without-value'
    | 'unknown-with-value';
  message: string;
}

/** Every `BrandDnaField` reachable from the DNA, with its dotted path. */
function fieldsOf(dna: BrandDna): Array<[string, BrandDnaField<unknown>]> {
  const out: Array<[string, BrandDnaField<unknown>]> = [];
  const collect = (prefix: string, block: Record<string, unknown>): void => {
    for (const [key, raw] of Object.entries(block)) {
      const field = raw as BrandDnaField<unknown> | undefined;
      if (!field || typeof field !== 'object' || !('status' in field)) continue;
      out.push([`${prefix}.${key}`, field]);
    }
  };
  collect('strategy', dna.strategy as unknown as Record<string, unknown>);
  collect('personality', dna.personality as unknown as Record<string, unknown>);
  collect('visualIdentity', dna.visualIdentity as unknown as Record<string, unknown>);
  collect('usageRules', dna.usageRules as unknown as Record<string, unknown>);
  collect('digitalIdentity', dna.digitalIdentity as unknown as Record<string, unknown>);
  return out;
}

/** True when a field carries content (`''`/`[]`/`{}` are empty, not content). */
export function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/**
 * Validate a Brand DNA version. Returns violations in field order; an empty
 * array means the DNA is publishable. Three invariants, all from the reference:
 *
 *  1. §6.2 — a market assertion with content must not be `generated`/`accepted`
 *     without a `SourceRef`. (`provided` is the user's own claim and is exempt:
 *     it is their statement, not Aurora's.)
 *  2. §6.2 — `accepted` means a decision was made; it cannot be empty.
 *  3. §6.2 — `unknown` means Aurora does not have it; it must carry no value.
 *
 * Invariants 2 and 3 are the same discipline as the phantom-empty-state rule:
 * a status must not claim a state the data contradicts.
 */
export function validateBrandDna(dna: BrandDna): BrandDnaViolation[] {
  const violations: BrandDnaViolation[] = [];
  for (const [path, field] of fieldsOf(dna)) {
    const content = hasContent(field.value);

    if (
      MARKET_ASSERTION_FIELDS.includes(path) &&
      content &&
      field.status !== 'provided' &&
      field.sourceRefs.length === 0
    ) {
      violations.push({
        field: path,
        kind: 'market-assertion-without-source',
        message:
          `'${path}' is a market assertion with status '${field.status}' and no ` +
          `source — §6.2 forbids presenting it as a market fact. Cite a SourceRef ` +
          `or mark it 'provided'.`,
      });
    }

    if (field.status === 'accepted' && !content) {
      violations.push({
        field: path,
        kind: 'accepted-without-value',
        message: `'${path}' is 'accepted' but empty — there is no decision to accept.`,
      });
    }

    if (field.status === 'unknown' && content) {
      violations.push({
        field: path,
        kind: 'unknown-with-value',
        message: `'${path}' is 'unknown' but carries a value — 'unknown' must stay empty.`,
      });
    }
  }
  return violations;
}

/** A block that differs between two DNA versions (§6.8 impact analysis). */
export interface BrandDnaChange {
  block:
    | 'strategy'
    | 'personality'
    | 'visualIdentity'
    | 'usageRules'
    | 'digitalIdentity';
  /** dotted paths that changed inside the block. */
  fields: string[];
}

/**
 * Which blocks changed between two versions (§6.8): a change to the logo,
 * palette or typography must trigger an impact analysis, and Aurora "peut
 * identifier les productions affectées et proposer leur révision ; il ne doit
 * pas réécrire silencieusement les fichiers approuvés". This function produces
 * the change list; the caller lists the affected productions. It never mutates.
 *
 * A locked field (§6.7) that changed is still reported — a silent overwrite of
 * a locked attribute is a defect, not a change to hide.
 */
export function diffBrandDna(previous: BrandDna, next: BrandDna): BrandDnaChange[] {
  const prev = new Map(fieldsOf(previous));
  const changes: BrandDnaChange[] = [];
  const byBlock = new Map<BrandDnaChange['block'], string[]>();

  for (const [path, field] of fieldsOf(next)) {
    const before = prev.get(path);
    if (!before) continue;
    if (JSON.stringify(before.value) === JSON.stringify(field.value)) continue;
    const block = path.split('.')[0] as BrandDnaChange['block'];
    const list = byBlock.get(block) ?? [];
    list.push(path);
    byBlock.set(block, list);
  }

  for (const [block, fields] of byBlock) changes.push({ block, fields });
  return changes.sort((a, b) => a.block.localeCompare(b.block));
}

/** Field paths that are locked (§6.7) — a generation must not overwrite them. */
export function lockedFields(dna: BrandDna): string[] {
  return fieldsOf(dna)
    .filter(([, field]) => field.locked === true)
    .map(([path]) => path);
}
