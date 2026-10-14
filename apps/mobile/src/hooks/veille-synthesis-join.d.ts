/**
 * veille-synthesis-join.d.ts (Discovery L5, lot post-ReUI 2026-10-14).
 *
 * La surface TypeScript du module de join PUR `veille-synthesis-join.js`
 * : la fonction `buildVeilleSynthesis` + le type `VeilleSynthesis`. Le
 * `.js` est le module runtime (chargé par le test `node:test` et par le
 * hook `use-veille-synthesis.ts`) ; ce `.d.ts` porte les types qu'il
 * n'a pas (plain-JS, pas de types inline) — le consommateur TypeScript
 * y va par l'import `from './veille-synthesis-join'` (le TS
 * `moduleResolution` bundler résout le `.d.ts` avant le `.js`).
 *
 * Les 3 invariants SSoT du L5 (figelés le 2026-10-14, commit `c42f3c9`)
 * sont portés par ce type :
 *   (1) `dupRate` (0..1) = le taux de doublons du run courant (le
 *       SSoT de la preuve "le cache préserve le run N+1").
 *   (2) `avgRelevance` = la pertinence SSoT agrégée (dérivée du
 *       delta, jamais recalculée par la surface).
 *   (3) `cacheValid` = le verdict du cache (le L5) : true si
 *       `dupRate ≤ 0.20` (le seuil SSoT, le critère de validation de
 *       la feature).
 */
import type { VeilleProgram } from './veille-programs-join';

/** The SSoT of the synthesis banner (le L5 feature). */
export interface VeilleSynthesis {
  /** The total number of veille programs (the SSoT count). */
  totalPrograms: number;
  /** The total number of runs across all programs (append-only manifest). */
  totalRuns: number;
  /** The total accumulated sources across all programs (the vault SSoT count). */
  totalSources: number;
  /** The sum of deltas across all programs (the "new since last run" count). */
  totalDelta: number;
  /** The "unique sources" invariant (AD-7 append-only : le vault ne compte JAMAIS un source 2 fois). */
  uniqueSources: number;
  /** L5 invariant (1) : the dup-rate (0..1, the SSoT of the cache validation). */
  dupRate: number;
  /** L5 invariant (2) : the aggregated SSoT relevance (null when no run yet — état vide honnête AD-7). */
  avgRelevance: number | null;
  /** The count of programs still awaiting their 1st run (état vide honnête AD-7). */
  pendingCount: number;
  /** The last run date across all programs (the "à jour au" of the banner). */
  lastDate: string | null;
  /** L5 invariant (3) : the cache verdict (true iff dupRate ≤ 0.20, the SSoT threshold). */
  cacheValid: boolean;
}

/**
 * Build the SSoT synthesis banner from the 10 veille programs (the L5
 *  feature, the 2026-10-14 gelée revue). The 3 SSoT invariants are
 *  computed here (the pure join, the hook is the READ-side projection
 *  of the SSoT, AD-7).
 */
export function buildVeilleSynthesis(programs: VeilleProgram[]): VeilleSynthesis;
