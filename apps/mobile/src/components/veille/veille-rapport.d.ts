/**
 * veille-rapport.d.ts — les types du SSoT pur du rapport de veille (M-44,
 * le plain-JS module `veille-rapport.js`, le pattern de
 * `veille-programs-join.d.ts` : le `.d.ts` SIBLING du `.js` pur — ce
 * fichier n'est JAMAIS chargé par les tests `node:test`, il sert la
 * surface TypeScript du composant `rapport.tsx` + `rapport-md.tsx`).
 */

/** Un renvoi `[n]` du rapport (n = le numéro de la source dans la feuille). */
export interface VaultRef {
  /** le numéro de la source dans la section `## Sources` du VAULT.md. */
  n: number;
  /** le titre de la source (le SSoT de la dédup M-43, le strip du méta). */
  title: string;
}

/** Une section parsée du VAULT.md (`## …`). */
export interface VaultSection {
  /** le titre de la section (le `## Ce que je sais`, …). */
  title: string;
  /** le body de la section (le contenu, les renvois [n] dedans). */
  body: string;
}

/** Le résultat du `parseVaultSections` (le SSoT du rapport). */
export interface VaultReportParsed {
  /** le chapeau (le contenu AVANT la 1re section — le titre `# VAULT …`). */
  lead: string;
  /** les sections `## …` du VAULT.md (le SSoT du `buildVaultMd`). */
  sections: VaultSection[];
  /** l'index des renvois `[n]` (n = le numéro de la source, la feuille). */
  refs: VaultRef[];
}

/**
 * Une source de la feuille (Stitch `discovery_menu_des_sources_pr_cision_
 * fraunces`) : le titre + la crédibilité + la date + l'URL d'ouverture.
 * La structure est dérivée par le consommateur (le `.js` pur est
 * structurellement typé, jamais un import React — le pattern
 * `veille-programs-join.js`).
 */
export interface SourceEntry {
  /** le numéro de la source (le `n` du renvoi `[n]` du rapport). */
  n?: number;
  /** le titre de la source (le SSoT du rapport). */
  title: string;
  /** la crédibilité de la source (`haute` / `moyenne` / `basse`). */
  credibility?: string;
  /** la date de la source (`YYYY-MM-DD`, le SSoT du rapport). */
  date?: string;
  /** l'URL d'ouverture (la source, `https://…`). */
  url?: string;
  /** le méta libre (le sous-titre de la source, le SSoT du rapport). */
  meta?: string;
}

/** Le `VeilleProgram` du `buildVeilleProgram` (le join de la carte). */
export interface VeilleProgramInput {
  automation: { id: string; name?: string; action?: string; cron?: string };
  lastRun: {
    id: string;
    date: string;
    relevance: number;
    newSources: number;
    totalSources?: number;
  } | null;
  delta?: number;
  relevance?: number | null;
  totalSources?: number;
  vault?: { runs: unknown[]; domaine?: string; vaultMd?: string } | null;
}

/** Le chapeau du rapport (le SSoT que la surface ne recalcule JAMAIS). */
export interface ReportMeta {
  /** le titre du rapport (le `automation.name` du programme). */
  title: string;
  /** le run N (l'index du run dans le manifest, 1-indexé ; `0` si pending). */
  runNumber: number;
  /** la date du dernier run (le SSoT du manifest, `null` si pending). */
  date: string | null;
  /** le verdict du run en plain French (`null` si pending / sans run). */
  relevanceLabel: string | null;
  /** la cadence du cron (le SSoT de `cadenceLabel`, `null` si inconnu). */
  cadence: string | null;
  /** le cumul des sources du vault (le SSoT du manifest, `0` si pending). */
  totalSources: number;
  /** `true` si le programme n'a PAS encore de run (l'AD-13 honnête). */
  pending: boolean;
}

/** Le parse du VAULT.md (le SSoT du rapport). */
export function parseVaultSections(md: string | undefined): VaultReportParsed;

/** Le filtre de la feuille (Toutes/Haute/Moyenne/Ce mois-ci, inconnu → tout). */
export function filterSources(
  sources: ReadonlyArray<SourceEntry>,
  filtre: string,
): SourceEntry[];

/** La cadence du cron en plain French (`null` si inconnu / absent). */
export function cadenceLabel(cron?: string | null): string | null;

/** Le chapeau du rapport (le SSoT du manifest, le verdict, la cadence). */
export function buildReportMeta(program: VeilleProgramInput): ReportMeta;

/** Le vocabulaire FERMÉ des filtres de la feuille (le SSoT des chips). */
export const VAULT_REF_FILTERS: readonly string[];
