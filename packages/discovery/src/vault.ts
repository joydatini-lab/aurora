/**
 * Discovery module — the vault synthesis logic (Lot 2, discovery-vault plan
 * 2026-10-10).
 *
 * Pure builders: `VAULT.md` (the evolving single document) + the
 * append-only `runs` manifest + SHA-256 hash + the 6 deterministic
 * verbs (V1 heuristic — LLM verb-choice = backlog). The `research`
 * job handler (jobs.ts) is the SOLE writer (AD-7); this module only
 * computes the next vault state from the previous + the new run.
 */
import type {
  OrSetValue,
  VeilleVault,
  VaultRunManifest,
  VaultVerbe,
} from '@aurora/domain';

/** The stable VAULT.md sections (Yumi's structure). */
export const VAULT_SECTIONS = [
  'Ce que je sais',
  'Ce qui a changé',
  'Questions ouvertes',
  'Historique de runs',
  'Sources (liens + date + crédibilité)',
] as const;

/**
 * Deterministic verb decision (V1 heuristic, AD-7: the run decides, not
 * the chat agent). Input: the PREVIOUS vault state + the NEW run's
 * findings. Output: the verb + the section it touches.
 *
 * Heuristics:
 *  - new sources (run.newSources > 0, section "Ce que je sais" unchanged
 *    since the last run) → `ajouter`
 *  - section unchanged since N runs (N ≥ 3) → `consolider`
 *  - a previously-"Ce que je sais" entry is now re-confirmed by a new
 *    source → `appuier`
 *  - a previously-"Questions ouvertes" entry is answered → `ameliorer`
 *  - two entries now contradict → `comparer`
 *  - a previously-"Ce que je sais" entry is superseded → `supprimer`
 *
 * In V1 the verb is `ajouter` by default (the common case: a new run
 * adds sources). The heuristic refinement (consolidation / comparison)
 * requires the LLM = backlog.
 */
export function decideVerbe(
  prevVault: VeilleVault | null,
  run: VaultRunManifest,
): { verbe: VaultVerbe; section: string; note?: string } {
  // No previous vault → first run, always `ajouter` (bootstrap).
  if (prevVault === null || prevVault.runs.length === 0) {
    return {
      verbe: 'ajouter',
      section: 'Ce que je sais',
      note: `Premier run — bootstrap du vault (${run.domaine}).`,
    };
  }
  // The previous run also added sources → this run adds too.
  if (run.newSources > 0) {
    return {
      verbe: 'ajouter',
      section: 'Ce que je sais',
      note: `+${run.newSources} nouvelle(s) source(s) (total ${run.totalSources}).`,
    };
  }
  // No new sources: check whether "Ce que je sais" has been unchanged
  // for ≥ 3 consecutive runs → `consolider` (stabilisation).
  const recent = prevVault.runs.slice(-4);
  const unchangedCount = recent.filter((r) => r.newSources === 0).length;
  if (unchangedCount >= 3) {
    return {
      verbe: 'consolider',
      section: 'Ce que je sais',
      note: `Section stable depuis ${unchangedCount} runs — consolidation.`,
    };
  }
  // Default: no new sources, section still evolving → `appuier`
  // (re-confirm the existing knowledge, no new material).
  return {
    verbe: 'appuier',
    section: 'Ce que je sais',
    note: `Aucune nouvelle source — reconfirmation des connaissances existantes.`,
  };
}

/**
 * M-43 (S4 plan veille 2026-10-17, gel 10/10 + doc 10/14 « Décisions à
 * figeler ») — le delta SSoT du run N+1 : la mémoire du vault est la
 * section `## Sources` de `VAULT.md` (chaque source est une ligne
 * `[n] <titre> (…)` ; le `DiscoveryItem` porte ce titre dans son OR-Set
 * de sources, `buildDiscoveryItem` L97 : `sourceIds = results.map(r.title)`).
 *
 * `dedupeAgainstVault` ne garde que le **delta** : les items dont le
 * titre de source est DÉJÀ présent dans le vault sont des doublons
 * (le run N+1 « sans mémoire » re-trouve tout — le SSoT mesure le taux
 * de doublons : avec cache 0–10 %, sans cache 80–100 %, seuil de
 * validation ≤ 20 %). `dupes` compte le cumul (le double tir d'une
 * même source au sein du run compte 2x) ; `dupeRate` est la fraction
 * du total — le critère de validation de la feature.
 *
 * Premier run (`prev === null`) → tout est delta (le bootstrap ne peut
 * pas être en doublon). AD-16b : la dédup ne touche PAS au flag
 * `uncertain` (celui-ci vit dans le `NotificationJobPayload` du
 * pipeline, `runVeillePipeline` — il est JAMAIS supprimé ici).
 */
export interface DedupeResult<T extends { summary: string; title?: string; sources?: ReadonlyArray<OrSetValue> }> {
  /** les items qui n'étaient PAS dans le vault (le delta) */
  delta: T[];
  /** le nombre de doublons (cumul des occurrences redondantes) */
  dupes: number;
  /** le taux de doublons (0..1, SSoT : fraction de doublons / total) */
  dupeRate: number;
}

/** The vault's known source titles — parsed from `VAULT.md` `## Sources`. */
function knownSourceTitles(vaultMd: string | undefined): Set<string> {
  const known = new Set<string>();
  if (vaultMd === undefined || vaultMd === '') return known;
  const sections = vaultMd.split(/(?=^## )/m);
  const sourcesSection = sections.find((s) => s.startsWith('## Sources'));
  if (sourcesSection === undefined) return known;
  const lines = sourcesSection
    .replace(/^## Sources[^\n]*\n?/, '')
    .split('\n')
    .map((l) => l.trim());
  for (const line of lines) {
    // `[n] <titre> (…)` — la ligne est bornée par `[` puis le numéro ;
    // le titre = tout ce qui reste après `] ` jusqu'à ` (` (méta).
    const m = /^\[(\d+)\]\s+(.*)$/.exec(line);
    if (m === null || m[2] === undefined) continue;
    const title = m[2]
      .replace(/\s*\([^)]*\)\s*$/, '') // strip le méta (crédibilité, date)
      .trim();
    if (title !== '') known.add(title);
  }
  return known;
}

/** A run finding's dedup keys = its OR-Set source values (OR-Set
 *  SSoT `buildDiscoveryItem` L97 : chaque source = le titre du hit). */
function itemSourceValues(item: { title?: string; sources?: ReadonlyArray<OrSetValue> }): string[] {
  const values: string[] = [];
  for (const s of item.sources ?? []) {
    if (s !== undefined && s.v !== '') values.push(s.v);
  }
  if (values.length === 0 && item.title !== undefined && item.title !== '') {
    values.push(item.title);
  }
  return values;
}

/**
 * M-43 — ne garder que le delta (le run N+1 ne refait pas les recherches
 * des runs précédents : le vault a servi de mémoire). Pure : même
 * input → même output.
 */
export function dedupeAgainstVault<T extends { summary: string; title?: string; sources?: ReadonlyArray<OrSetValue> }>(
  items: ReadonlyArray<T>,
  prevVault: { vaultMd?: string } | null,
): DedupeResult<T> {
  const known =
    prevVault !== null ? knownSourceTitles(prevVault.vaultMd) : new Set<string>();
  let dupes = 0;
  const delta = items.filter((item) => {
    const values = itemSourceValues(item);
    const isDupe =
      values.length > 0 && values.every((v) => known.has(v));
    if (isDupe) dupes += 1;
    return !isDupe;
  });
  const total = items.length;
  return {
    delta,
    dupes,
    dupeRate: total === 0 ? 0 : dupes / total,
  };
}

/**
 * M-43 — le verdict du run = fct(delta) (gel 10/10 : « la pertinence
 * SSoT du run N+1 est DÉRIVÉE du delta » — un delta élevé = une
 * pertinence élevée ; un delta faible = une pertinence faible).
 *
 * Remplace le `relevance = discoveryItems.length === 0 ? 0 : 1.0`
 * figé de V1 (bug V1, plan S4 M-43). Le verdict = la fraction de
 * l'item-set qui est effectivement du **delta** :
 *   - aucun item → 0 (rien à qualifier) ;
 *   - tout est nouveau (premier run, ou run sans doublon) → 1.0 ;
 *   - des doublons sont présents → la fraction du delta, bornée
 *     ≤ 0.95 (on ne déclare jamais « 1.0 » quand le run re-trouve
 *     des sources du vault — le cache a servi, le delta porte la
 *     pertinence).
 *
 * `dupes` n'est PAS nécessaire ici : la fraction est `deltaCount /
 * totalItems` (le total = items du run = delta + doublons).
 *
 * Pure : même input → même verdict. AD-16b : le verdict ne supprime
 * JAMAIS le flag `uncertain` (celui-ci vit dans le
 * `NotificationJobPayload` du pipeline, un autre canal que la
 * pertinence du run).
 */
export function runVerdictFromDelta(deltaCount: number, totalItems: number): number {
  if (totalItems === 0) return 0;
  if (deltaCount === totalItems) return 1.0;
  const frac = deltaCount / totalItems;
  // doublons présents : le verdict reste strictement < 1 (borne haute 0.95)
  return Math.min(0.95, Math.round(frac * 100) / 100);
}

/**
 * Build the VAULT.md content for the next vault state. Pure: same input
 * → same output. The sections are stable (Yumi's structure); the content
 * evolves per run (append-only for "Historique de runs"; "Ce que je
 * sais" / "Ce qui a changé" are updated in place).
 *
 * The "Ce que je sais" body is carried forward from the previous vault
 * (the evolving SSoT) — split on the stable `## ` section header, keep
 * the first section's body verbatim, append this run's line.
 *
 * M-43 (run « avec mémoire ») : le paramètre optionnel `deltaSources`
 * porte les TITRES des sources DU DELTA (le résultat de
 * `dedupeAgainstVault` — les items dont le titre n'était PAS dans le
 * vault) ; seule la source delta est ajoutée à la section `## Sources`
 * de la SSoT (les doublons ne sont JAMAIS ré-apportés : c'est le
 * cache qui préserve le run N+1, SSoT doc 10/14). Absent → le
 * comportement V1 (la SSoT porte seulement le cumul du manifest).
 */
export function buildVaultMd(
  prev: VeilleVault | null,
  run: VaultRunManifest,
  decision: { verbe: VaultVerbe; section: string; note?: string },
  deltaSources?: ReadonlyArray<string>,
): string {
  const lines: string[] = [];
  lines.push(`# VAULT — ${run.domaine}`);
  lines.push('');
  lines.push('## Ce que je sais');
  if (prev !== null && prev.vaultMd !== '') {
    // Carry forward the "Ce que je sais" body from the previous vault.
    // Split on `## ` headers; the first header is "Ce que je sais".
    const sections = prev.vaultMd.split(/(?=^## )/m);
    const knowsBody = sections.find((s) => s.startsWith('## Ce que je sais'));
    if (knowsBody !== undefined) {
      const body = knowsBody.replace(/^## Ce que je sais\s*\n?/, '').trim();
      if (body !== '') lines.push(body);
    }
  }
  lines.push(`- (run ${run.id}, ${run.date}) ${decision.note ?? decision.verbe}`);
  lines.push('');
  lines.push('## Ce qui a changé');
  lines.push(`- (run ${run.id}) ${decision.verbe} — ${decision.section}`);
  lines.push('');
  lines.push('## Questions ouvertes');
  lines.push('(à compléter par le run suivant)');
  lines.push('');
  lines.push('## Historique de runs');
  const runs = prev !== null ? [...prev.runs, run] : [run];
  for (const r of runs) {
    lines.push(`- ${r.date} — ${r.newSources} nouvelle(s), total ${r.totalSources}`);
  }
  lines.push('');
  lines.push('## Sources (liens + date + crédibilité)');
  lines.push(`(cumul ${run.totalSources} sources au ${run.date})`);
  // M-43 : la mémoire du vault = la section Sources d'ici. Seules les
  // sources DU DELTA sont ajoutées (les doublons ne sont JAMAIS
  // ré-apportés — le run N+1 lit cette section et sait ce qu'il a déjà).
  const numbered = (n: number, text: string) => `- [${n}] ${text}`;
  const prevSourcesCount = prev !== null ? knownSourceTitles(prev.vaultMd).size : 0;
  let nextN = prevSourcesCount;
  if (deltaSources !== undefined) {
    for (const title of deltaSources) {
      if (title === '') continue;
      nextN += 1;
      lines.push(numbered(nextN, title));
    }
  } else if (prev === null) {
    // Premier run (pas de mémoire) : le bootstrap seed la SSoT avec
    // le compte du run (`newSources` — la SSoT n'a pas les titres).
    for (let i = 0; i < run.newSources; i += 1) {
      nextN += 1;
      lines.push(numbered(nextN, `(source ${nextN})`));
    }
  }
  return lines.join('\n');
}

/**
 * Build the run's rapport.md (append-only, stored in
 * runs/YYYY-MM-DD/). Pure.
 */
export function buildRapportMd(run: VaultRunManifest): string {
  const lines: string[] = [];
  lines.push(`# Rapport du run ${run.date}`);
  lines.push('');
  lines.push(`- Domaine : ${run.domaine}`);
  lines.push(`- Date : ${run.date}`);
  lines.push(`- Relevance : ${run.relevance.toFixed(2)}`);
  lines.push(`- Nouvelles sources : ${run.newSources}`);
  lines.push(`- Total sources : ${run.totalSources}`);
  lines.push(`- Sections touchées : ${run.sectionsTouched.join(', ') || '(aucune)'}`);
  lines.push('');
  lines.push('## Mutations');
  for (const m of run.mutations) {
    lines.push(`- \`${m.verbe}\` — ${m.section}${m.note ? ` — ${m.note}` : ''}`);
  }
  lines.push('');
  lines.push('## Assets');
  for (const a of run.assets ?? []) {
    lines.push(`- !(${a})`);
  }
  return lines.join('\n');
}

/**
 * SHA-256 hash of the vault content (hex). Pure. Used for integrity
 * check (hash ≠ manifest = corrupted, the Lot 4 "error" UX state).
 *
 * Uses Node's built-in `node:crypto` (the module runs in the EF + the
 * node:test harness; browser-side callers would use a different
 * implementation — this module is server-only, AD-3).
 */
export async function computeVaultHash(content: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Append a run to the vault (append-only: the manifest grows, the VAULT.md
 * evolves in place). Returns the next vault state. Pure.
 *
 * AD-7: this is the ONLY function that mutates the vault state — the
 * `research` job handler calls it, then `VaultStore.write` persists.
 *
 * `userId` is passed explicitly (the handler knows it); `prev` may be
 * null (first run for this user+domain) — in that case the vault's id
 * is seeded by the caller's `newVaultId` (a ULID from the job), and
 * `createdAt` = the run's timestamp.
 */
export function appendRun(
  prev: VeilleVault | null,
  run: VaultRunManifest,
  vaultMd: string,
  hash: string,
  userId: string,
  newVaultId: string,
): VeilleVault {
  const now = run.at;
  return {
    id: prev?.id ?? newVaultId,
    userId,
    domaine: run.domaine,
    vaultMd,
    vaultHash: hash,
    runs: prev !== null ? [...prev.runs, run] : [run],
    storagePrefix: prev?.storagePrefix,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}
