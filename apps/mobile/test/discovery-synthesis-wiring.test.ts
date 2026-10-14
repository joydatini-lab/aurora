/**
 * discovery-synthesis-wiring.test.ts (Discovery L5, lot post-ReUI 2026-10-14).
 *
 * Le branchement de la bannière de synthèse des vaults (le § L5 "Décision
 * 3 figelée" de la mémoire `discovery-refactor-lots-2-4`, commit
 * `c42f3c9`) : le join SSoT pur `buildVeilleSynthesis` (le plain-JS
 * module `veille-synthesis-join.js`, le pattern de
 * `veille-programs-join.js` — zéro React, zéro réseau, zéro PowerSync,
 * AD-7 local-first). Les tests valident les 3 invariants SSoT du L5
 * (figelés 2026-10-14) sur le SSoT de la bannière :
 *
 *   (1) le **taux de doublons** `dupRate` (0..1) — la preuve que le
 *       cache du vault préserve le run N+1 (le run ne re-recherche
 *       pas le contenu des runs précédents). Seuil SSoT :
 *       `dupRate ≤ 0.20` = le cache préserve le run (`cacheValid`
 *       = true) ; `dupRate > 0.20` = le cache est en veille
 *       (`cacheValid` = false, le vault ne s'évolue plus).
 *   (2) la **pertinence SSoT** `avgRelevance` — agrégée du SSoT
 *       (le verdict du dernier run de chaque vault), jamais
 *       recalculée par la surface.
 *   (3) le **verdict du cache** `cacheValid` — true si `dupRate ≤
 *       0.20` (le seuil SSoT, le critère de validation de la
 *       feature Discovery, le L5 "Décision 1 figelée").
 *
 * Les tests se passent sur le SSoT de la bannière (le join pur),
 * pas sur le hook (le hook `useVeilleSynthesis` est la
 * READ-side projection du SSoT, elle est validée par les tests de
 * branchement des autres hooks du lot B).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/discovery-synthesis-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVeilleSynthesis } from '../src/hooks/veille-synthesis-join.js';

// ---------------------------------------------------------------------------
// Fixtures — le SSoT de la bannière (le L5 feature, le 2026-10-14 gelée
// revue) : 10 programmes de veille (les 10 vaults de la mémoire
// `discovery-refactor-lots-2-4`), chacun avec son SSoT de run.
// ---------------------------------------------------------------------------

/**
 * The SSoT of a veille program (the L5 feature input). The plain-JS
 *  join is structural-typed (no TS import, the pattern of
 *  `veille-programs-join.js` — le SSoT du L5 est le SSoT de la
 *  bannière, jamais un consommateur React).
 */
type Program = {
  automation: { id: string; name?: string };
  lastRun: { newSources: number; relevance: number; date: string } | null;
  delta: number;
  relevance: number | null;
  totalSources: number;
  vault: { runs: { newSources: number }[] } | null;
};

function makeProgram(
  id: string,
  opts: { runs?: number; newSources?: number; relevance?: number } = {},
): Program {
  const { runs = 3, newSources = 5, relevance = 0.8 } = opts;
  const runList = Array.from({ length: runs }, (_, i) => ({
    newSources: i === runs - 1 ? newSources : 3,
  }));
  return {
    automation: { id, name: `Programme ${id}` },
    lastRun:
      runs > 0
        ? { newSources, relevance, date: '2026-10-01' }
        : null,
    delta: newSources,
    relevance: relevance,
    totalSources: runList.reduce((acc, r) => acc + r.newSources, 0),
    vault:
      runs > 0
        ? { runs: runList }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('L5 (1) buildVeilleSynthesis: 0 programmes (le SSoT vide honnête, AD-7)', () => {
  // Le SSoT vide de la bannière (le § L5 "jamais une synthèse
  //  factice" — le SSoT par défaut d'un cache inconnu n'est PAS
  //  « valide », mais le SSoT vide honnête de l'état AD-7).
  const s = buildVeilleSynthesis([]);
  assert.equal(s.totalPrograms, 0, '0 programmes');
  assert.equal(s.totalRuns, 0, '0 runs');
  assert.equal(s.totalSources, 0, '0 sources');
  assert.equal(s.dupRate, 0, 'le SSoT vide : dupRate = 0 (le cache inconnu n est PAS un verdict factice)');
  assert.equal(s.avgRelevance, null, 'le SSoT vide : avgRelevance = null (pas de verdict SSoT sans run)');
  assert.equal(s.cacheValid, true, 'le SSoT vide : cacheValid = true (le SSoT par défaut, jamais un verdict factice)');
});

test('L5 (2) buildVeilleSynthesis: 10 programmes avec runs (le SSoT de la bannière)', () => {
  // Les 10 vaults de la mémoire `discovery-refactor-lots-2-4`
  //  (Eurocode 7, géosynthétiques, BIM/GEO, NF P 5-3, matériaux
  //  durables, IA+dim, essais, logiciels, Eurocode 8, composites) —
  //  le SSoT de la bannière sur le SSoT réel.
  const programs: Program[] = Array.from({ length: 10 }, (_, i) =>
    makeProgram(`p${i}`, { runs: 3, newSources: 5, relevance: 0.85 }),
  );
  const s = buildVeilleSynthesis(programs);
  assert.equal(s.totalPrograms, 10, 'le SSoT de la bannière : 10 programmes');
  // 3 runs × 10 programmes = 30 runs ; les sources : 2 runs de 3
  //  (6) + 1 run de 5 (5) = 11 par programme, 110 au total.
  assert.equal(s.totalRuns, 30, '30 runs (3 par programme × 10)');
  assert.equal(s.totalSources, 110, 'le SSoT de l append-only manifest : 110 sources au total');
  assert.equal(s.totalDelta, 50, 'le SSoT du delta : 5 sources par programme × 10 = 50');
  assert.equal(s.uniqueSources, 60, 'le SSoT AD-7 append-only : 110 - 50 = 60 sources uniques');
  // Le SSoT du L5 (2) : la pertinence agrégée du SSoT (le verdict du
  //  dernier run de chaque vault, jamais recalculé par la surface).
  assert.ok(Math.abs(s.avgRelevance - 0.85) < 1e-9, 'le SSoT de la bannière : 0.85 (la moyenne des 10 derniers runs, le verdict SSoT agrégé)');
  assert.equal(s.lastDate, '2026-10-01', 'le SSoT du "à jour au" de la bannière');
});

test('L5 (3) buildVeilleSynthesis: le SSoT du verdict du cache (le taux de doublons)', () => {
  // Le SSoT du L5 (1) : le taux de doublons (le sum des newSources
  //  du dernier run / le total des sources de tous les runs). Avec
  //  10 programmes, chacun 3 runs (2 de 3 + 1 de 5) : le delta =
  //  5 (le SSoT de `buildVeilleProgram`, le sum du lastRun),
  //  totalSources = 110 → dupRate = 50/110 ≈ 0.4545 > 0.20 →
  //  cacheValid = false (le SSoT du "le cache ne préserve PAS le
  //  run N+1" — le vault ne s'évolue plus).
  const programs: Program[] = Array.from({ length: 10 }, (_, i) =>
    makeProgram(`p${i}`, { runs: 3, newSources: 5, relevance: 0.85 }),
  );
  const s = buildVeilleSynthesis(programs);
  assert.ok(s.dupRate > 0.20, 'le SSoT du taux de doublons : 50/110 > 20 %');
  assert.equal(s.cacheValid, false, 'le SSoT du L5 (3) : cacheValid = false (le cache est en veille, le vault ne evolue plus)');
});

test('L5 (4) buildVeilleSynthesis: le SSoT du cache valide (taux de doublons ≤ 20 %)', () => {
  // Le SSoT du L5 (1) : le taux de doublons ≤ 20 % = le cache
  //  préserve le run N+1 (le run ne re-recherche PAS le contenu des
  //  runs précédents). Avec 10 programmes, chacun 1 run de 5
  //  (le delta = 5, totalSources = 5) → dupRate = 5/5 = 1.0 ? Non,
  //  le SSoT du L5 : le sum du `delta` (le newSources du dernier
  //  run) sur le `totalSources` (le sum de tous les newSources de
  //  tous les runs) : avec 1 run par programme, le delta =
  //  totalSources = 5 → dupRate = 5/5 = 1.0 > 0.20 (le SSoT du
  //  premier run n'a PAS de "run précédent" — le cache est inconnu,
  //  le SSoT par défaut d'un vault à 1 run n'est PAS « valide »).
  //
  // Le SSoT du L5 (1) : le cache est « valide » quand le taux de
  //  doublons est ≤ 20 % — ce qui exige QUE le vault ait ≥ 2 runs
  //  (le sum du delta = le newSources du dernier run, le sum des
  //  totalSources = le sum de tous les newSources de tous les
  //  runs ; avec 2 runs (1 de 3 + 1 de 1) : delta = 1,
  //  totalSources = 4 → dupRate = 1/4 = 0.25 > 0.20, encore en
  //  veille. Avec 2 runs (1 de 3 + 1 de 1) × 10 programmes =
  //  totalDelta = 10, totalSources = 40 → dupRate = 10/40 = 0.25.
  //  Pour valider le SSoT (le cache préserve le run), il faut
  //  QUE le delta soit ≤ 20 % du total — le SSoT du run qui ne
  //  re-recherche QUE le delta (le § L5 "le run N+1 avec mémoire
  //  ne cherche QUE 2–4 sources", le delta minuscule par rapport
  //  au total des sources du vault).
  const programs: Program[] = Array.from({ length: 10 }, (_, i) =>
    makeProgram(`p${i}`, {
      runs: 4,
      newSources: 1,
      relevance: 0.7,
    }),
  );
  // 4 runs par programme : 3 de 3 (9) + 1 de 1 (1) = 10 sources /
  //  programme, 100 au total. Le delta = 1 / programme, 10 au
  //  total. dupRate = 10/100 = 0.10 ≤ 0.20 → cacheValid = true.
  const s = buildVeilleSynthesis(programs);
  assert.equal(s.dupRate, 0.1, 'le SSoT du cache valide : 10/100 = 0.10 ≤ 0.20');
  assert.equal(s.cacheValid, true, 'le SSoT du L5 (3) : cacheValid = true (le cache préserve le run N+1, le taux de doublons ≤ 20 %)');
});

test('L5 (5) buildVeilleSynthesis: les programmes en attente (AD-7 état vide honnête)', () => {
  // Le SSoT du L5 : les programmes qui n ont PAS de run (le SSoT de
  //  la carte « En attente du 1er run », AD-7 état vide honnête,
  //  jamais une synthèse factice). La bannière n'est PAS cachée pour
  //  cause (le SSoT de la bannière est le SSoT de la feature, la
  //  carte reste vide mais le SSoT de la bannière est le SSoT de la
  //  synthèse des vaults qui ont un run).
  const programs: Program[] = [
    makeProgram('p0', { runs: 3, newSources: 5, relevance: 0.85 }),
    makeProgram('p1', { runs: 0 }),
    makeProgram('p2', { runs: 0 }),
  ];
  const s = buildVeilleSynthesis(programs);
  assert.equal(s.totalPrograms, 3, 'le SSoT de la bannière : 3 programmes (pas que les vaults qui ont un run)');
  assert.equal(s.pendingCount, 2, 'le SSoT du "en attente du 1er run" : 2 programmes');
  // Le SSoT du cache (le sum du delta sur les vaults qui ont un run) :
  // 1 vault × 3 runs = 3 runs ; delta = 5 ; totalSources = 11 →
  // dupRate = 5/11 ≈ 0.4545 > 0.20 → cacheValid = false.
  assert.ok(s.dupRate > 0.20, 'le SSoT du cache sur le vault actif seul : 5/11 > 20 %');
  assert.equal(s.cacheValid, false, 'le SSoT du L5 (3) : cacheValid = false (le vault actif a un taux de doublons trop élevé)');
  assert.equal(s.avgRelevance, 0.85, 'le SSoT de la pertinence : agrégée UNIQUEMENT des vaults qui ont un run (pas les 2 vaults en attente)');
});

test('L5 (6) buildVeilleSynthesis: la born du SSoT vide (0 vaults actifs)', () => {
  // Le SSoT de la bannière (le § L5 "jamais une synthèse factice") :
  //  si AUCUN vault n a de run, le SSoT par défaut (le dupRate = 0,
  //  l avgRelevance = null, le cacheValid = true par défaut — le
  //  SSoT du "le cache est inconnu" n est PAS un verdict factice,
  //  c est le SSoT vide honnête de l AD-7).
  const programs: Program[] = [
    makeProgram('p0', { runs: 0 }),
    makeProgram('p1', { runs: 0 }),
  ];
  const s = buildVeilleSynthesis(programs);
  assert.equal(s.totalPrograms, 2, 'le SSoT de la bannière : 2 programmes (pas que les vaults qui ont un run)');
  assert.equal(s.pendingCount, 2, 'le SSoT du "en attente du 1er run" : 2 programmes');
  assert.equal(s.dupRate, 0, 'le SSoT vide : dupRate = 0');
  assert.equal(s.avgRelevance, null, 'le SSoT vide : avgRelevance = null');
  assert.equal(s.cacheValid, true, 'le SSoT vide : cacheValid = true (le SSoT par défaut, jamais un verdict factice)');
});

test('L5 (7) buildVeilleSynthesis: le SSoT de la bannière (le 10 vaults du L5)', () => {
  // Le SSoT du L5 (le 10 vaults de la mémoire
  //  `discovery-refactor-lots-2-4`) : la bannière est le SSoT de
  //  la synthèse des 10 vaults (le § L5 "Décision 3 figelée" — le
  //  document SSoT de synthèse des vaults, le SSoT du chat-agent
  //  en READ-ONLY). Le SSoT de la bannière n est PAS le SSoT d un
  //  vault individuel (la carte), c est le SSoT transversal des
  //  10 vaults (le L5 "le chat-agent croise les 10 vaults, il
  //  propose des synthèses globales").
  //
  // Le SSoT du L5 (1) : le taux de doublons sur le SSoT de la
  //  bannière (le 10 vaults, chacun 4 runs (3 de 3 + 1 de 1) =
  //  10 sources / vault, 100 au total ; delta = 1 / vault, 10 au
  //  total) → dupRate = 10/100 = 0.10 ≤ 0.20 → cacheValid = true.
  const programs: Program[] = Array.from({ length: 10 }, (_, i) =>
    makeProgram(`p${i}`, { runs: 4, newSources: 1, relevance: 0.7 }),
  );
  const s = buildVeilleSynthesis(programs);
  assert.equal(s.totalPrograms, 10, 'le SSoT de la bannière : 10 programmes (le 10 vaults du L5)');
  assert.equal(s.totalRuns, 40, 'le SSoT du manifest : 4 runs × 10 = 40 runs');
  assert.equal(s.totalSources, 100, 'le SSoT AD-7 append-only : 100 sources au total');
  assert.equal(s.totalDelta, 10, 'le SSoT du delta : 10 (1 par vault)');
  assert.equal(s.uniqueSources, 90, 'le SSoT de l invariant : 100 - 10 = 90 sources uniques');
  assert.equal(s.dupRate, 0.1, 'le SSoT du L5 (1) : 10/100 = 0.10 ≤ 0.20 (le cache préserve le run N+1)');
  assert.equal(s.cacheValid, true, 'le SSoT du L5 (3) : cacheValid = true (le cache est valide sur le SSoT de la bannière)');
  assert.ok(Math.abs(s.avgRelevance - 0.7) < 1e-9, 'le SSoT du L5 (2) : 0.7 (la moyenne des 10 derniers runs, le verdict SSoT agrégé)');
});
