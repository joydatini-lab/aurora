/**
 * veille-synthesis-join.js (Discovery L5, lot post-ReUI 2026-10-14).
 *
 * Le join PUR de la bannière de synthèse des vaults (AD-7, 03 S3.1,
 * pattern de `veille-programs-join.js` / `filtering.ts`). Ce module ne
 * connaît PAS le type `.ts` du hook ; le hook `use-veille-synthesis.ts`
 * l'importe. La bannière de la page `/discovery` est le document SSoT
 * de synthèse des 10 vaults (le § L5 "Décision 3 figelée", revue
 * 2026-10-14) : 1 vault par programme (single-writer AD-7), la
 * bannière croise les 10 en READ-ONLY (le chat-agent propose les
 * synthèses globales ; la bannière n'est QUE la surface de lecture
 * locale, jamais un writer — AD-7, le seul writer = le run `research`).
 *
 * Les 3 invariants SSoT du L5 (figelés le 2026-10-14, commit
 * `c42f3c9` du doc `2026-10-10-discovery-vault-scenarios.md`) :
 *   (1) **Taux de doublons ≤ 20 %** = le cache du vault préserve le
 *       run N+1 (le run ne re-recherche pas le contenu des runs
 *       précédents). C'est l'invariant de validation de la feature.
 *   (2) **La pertinence SSoT est dérivée du delta** : un delta faible
 *       = un verdict faible (`qualifyDiscoveryItem` SSoT, déjà vrai
 *       dans `@aurora/discovery`). La bannière ne recalcule PAS la
 *       pertinence — elle agrège les verdicts du SSoT (pas un
 *       verdict "inventé" par la surface).
 *   (3) **1 vault par programme** + **le chat-agent croise en
 *       READ-ONLY** ; la bannière `/discovery` = la surface locale de
 *       cette synthèse (la feature séparée du lot B, validée L5).
 */

/**
 * The aggregate summary of all veille programs (the SSoT document of
 * the banner, the L5 feature).
 */
export function buildVeilleSynthesis(programs) {
  // (1) Le taux de doublons du run courant (le sum delta sur les runs
  //     qui ont déjà un vault ; le SSoT de la preuve "le cache
  //     préserve le run").
  const withVault = (programs || []).filter((p) => p.vault && p.vault.runs?.length > 0);
  const totalDelta = withVault.reduce((acc, p) => acc + p.delta, 0);
  // Les runs "anciens" = tous les runs excepté le dernier (le delta
  //  est borné à 0 min par le SSoT de `buildVeilleProgram`, donc
  //  `totalDelta` est le sum des nouveautés de tous les runs).
  const totalRuns = withVault.reduce((acc, p) => acc + p.vault.runs.length, 0);
  const totalSources = withVault.reduce((acc, p) => acc + p.vault.runs.reduce((a, r) => a + r.newSources, 0), 0);
  // Le taux de doublons (le SSoT du critère de validation L5) :
  //   avec cache : ~0–10 % (le run N+1 ne re-recherche QUE le delta).
  //   sans cache : 80–100 % (le run re-trouve tout).
  //   Seuil de validation : ≤ 20 % (le cache préserve le run).
  // La formule : le ratio des sources "uniques" (le delta borné à 0
  //  par le SSoT) sur le total des sources trouvées (le vault ne
  //  compte JAMAIS un source 2 fois — c'est l'invariant AD-7
  //  append-only du manifest, la preuve que le cache fonctionne).
  const uniqueSources = Math.max(totalSources - totalDelta, 0);
  const dupRate = totalSources > 0 ? (totalDelta / totalSources) : 0;
  // (2) La pertinence SSoT (dérivée du delta, agrégée du SSoT pas
  //     recalculée — le verdict du dernier run de chaque vault).
  const lastRuns = withVault.map((p) => p.lastRun).filter((r) => r);
  const avgRelevance = lastRuns.length > 0
    ? lastRuns.reduce((acc, r) => acc + r.relevance, 0) / lastRuns.length
    : null;
  // Les programmes qui n'ont PAS de run (les « En attente du 1er
  //  run », état vide honnête AD-7 — jamais une synthèse factice).
  const pendingCount = (programs || []).filter((p) => !p.vault || p.vault.runs?.length === 0).length;
  // Le total de programmes (le SSoT de la bannière).
  const totalPrograms = (programs || []).length;
  // La date du dernier run (le SSoT du "à jour au" de la bannière).
  const lastDate = lastRuns.length > 0
    ? lastRuns.map((r) => r.date).sort().at(-1)
    : null;
  return {
    totalPrograms,
    totalRuns,
    totalSources,
    totalDelta,
    uniqueSources,
    // L'invariant L5 (1) : le taux de doublons (0..1, borné au SSoT).
    dupRate,
    // L'invariant L5 (2) : la pertinence moyenne (le verdict du
    //   SSoT agrégé, null si aucun run — état vide honnête AD-7).
    avgRelevance,
    pendingCount,
    lastDate,
    // Le verdict du cache (le L5) : true si dupRate ≤ 0.20 (le seuil
    //  SSoT, le critère de validation de la feature).
    cacheValid: dupRate <= 0.20,
  };
}

/* The plain-JS SSoT of the synthesis banner (la bannière `/discovery`
   L5). The hook `use-veille-synthesis.ts` importe ce module ; les
   types sont exposés par le `.d.ts` SIBLING (le pattern de
   `veille-programs-join`). */

