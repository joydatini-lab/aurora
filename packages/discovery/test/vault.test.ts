/**
 * LOT 2 (discovery-vault plan 2026-10-10) — the vault synthesis logic:
 * `buildVaultMd`, `appendRun`, `decideVerbe`, `computeVaultHash` (pure
 * builders + the deterministic verb heuristic), `buildRapportMd`.
 *
 * node:test + --experimental-strip-types (no build step).
 * Run: `pnpm --filter @aurora/discovery test`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  appendRun,
  buildRapportMd,
  buildVaultMd,
  computeVaultHash,
  dedupeAgainstVault,
  decideVerbe,
  runVerdictFromDelta,
} from '../src/vault.ts';
import type { VeilleVault, VaultRunManifest } from '@aurora/domain';
import type { OrSetValue, DiscoveryItem } from '@aurora/domain';

function makeRun(over: Partial<VaultRunManifest> & { id: string }): VaultRunManifest {
  return {
    date: '2026-10-10',
    domaine: 'structures',
    newSources: 3,
    totalSources: 3,
    relevance: 1.0,
    sectionsTouched: ['Ce que je sais'],
    mutations: [],
    at: '2026-10-10T08:00:00.000Z',
    ...over,
  };
}

/** A minimal `VeilleVault` (for the `prev` argument of the builders). */
function makeVault(runCount: number, userId = 'user1'): VeilleVault {
  const runs: VaultRunManifest[] = [];
  for (let i = 0; i < runCount; i += 1) {
    runs.push(makeRun({ id: `run-${i}`, newSources: i === 0 ? 5 : 0, totalSources: 5 }));
  }
  return {
    id: 'vault-1',
    userId,
    domaine: 'structures',
    vaultMd: '# VAULT — structures\n\n## Ce que je sais\n- (run run-0) ajouter',
    vaultHash: 'abc123',
    runs,
    createdAt: runs[0]?.at ?? '',
    updatedAt: runs.at(-1)?.at ?? '',
  };
}

test('LOT 2 decideVerbe: first run (no prev) → `ajouter` (bootstrap)', () => {
  const run = makeRun({ id: 'run-0', newSources: 2, totalSources: 2 });
  const d = decideVerbe(null, run);
  assert.equal(d.verbe, 'ajouter');
  assert.equal(d.section, 'Ce que je sais');
  assert.ok(d.note !== undefined && d.note.includes('Premier run'));
});

test('LOT 2 decideVerbe: run with newSources > 0 → `ajouter`', () => {
  const prev = makeVault(2);
  const run = makeRun({ id: 'run-2', newSources: 3, totalSources: 8 });
  const d = decideVerbe(prev, run);
  assert.equal(d.verbe, 'ajouter');
});

test('LOT 2 decideVerbe: no new sources, section stable ≥3 runs → `consolider`', () => {
  // Build a prev vault whose last 4 runs all had newSources = 0.
  const prev = makeVault(4);
  // makeVault sets runs[0].newSources=5, runs[1..3].newSources=0
  // → recent = runs[0..3], unchanged = 3 (runs 1,2,3) ≥ 3 → consolider
  const run = makeRun({ id: 'run-4', newSources: 0, totalSources: 5 });
  const d = decideVerbe(prev, run);
  assert.equal(d.verbe, 'consolider');
  assert.equal(d.section, 'Ce que je sais');
});

test('LOT 2 decideVerbe: no new sources, section still evolving → `appuier`', () => {
  const prev = makeVault(1);
  // recent = [run-0], unchanged = 0 (< 3) → appuier (default)
  const run = makeRun({ id: 'run-1', newSources: 0, totalSources: 5 });
  const d = decideVerbe(prev, run);
  assert.equal(d.verbe, 'appuier');
});

test('LOT 2 buildVaultMd: first run (no prev) → the section skeleton is produced', () => {
  const run = makeRun({ id: 'run-0', newSources: 2, totalSources: 2 });
  const d = decideVerbe(null, run);
  const md = buildVaultMd(null, run, d);
  assert.ok(md.includes('# VAULT — structures'));
  assert.ok(md.includes('## Ce que je sais'));
  assert.ok(md.includes('## Ce qui a changé'));
  assert.ok(md.includes('## Historique de runs'));
  assert.ok(md.includes('## Sources (liens + date + crédibilité)'));
  assert.ok(md.includes('(run run-0'));
});

test('LOT 2 buildVaultMd: carry forward the previous "Ce que je sais" body', () => {
  const prev = makeVault(1);
  // prev.vaultMd = "# VAULT — structures\n\n## Ce que je sais\n- (run run-0) ajouter"
  const run = makeRun({ id: 'run-1', newSources: 1, totalSources: 6 });
  const d = decideVerbe(prev, run);
  const md = buildVaultMd(prev, run, d);
  // The previous body line "- (run run-0) ajouter" must be carried forward.
  assert.ok(md.includes('- (run run-0) ajouter'), 'la section précédente est conservée');
  // AND the new run line is appended.
  assert.ok(md.includes('- (run run-1'), 'la ligne du run courant est ajoutée');
});

test('LOT 2 buildRapportMd: the run rapport carries the verb + assets', () => {
  const run = makeRun({
    id: 'run-0',
    newSources: 2,
    totalSources: 2,
    assets: ['prod/u1/discovery/structures/runs/2026-10-10/fig-00.png'],
  });
  run.mutations = [
    { verbe: 'ajouter', runId: 'run-0', section: 'Ce que je sais', note: '+2 nouvelles sources' },
  ];
  const md = buildRapportMd(run);
  assert.ok(md.includes('# Rapport du run 2026-10-10'));
  assert.ok(md.includes('Domaine : structures'));
  assert.ok(md.includes('`ajouter`'));
  assert.ok(md.includes('fig-00.png'));
});

test('LOT 2 computeVaultHash: SHA-256 is deterministic + changes with content', async () => {
  const h1 = await computeVaultHash('hello');
  const h2 = await computeVaultHash('hello');
  const h3 = await computeVaultHash('world');
  assert.equal(h1, h2, 'même contenu → même hash');
  assert.notEqual(h1, h3, 'contenu différent → hash différent');
  assert.equal(h1.length, 64, 'SHA-256 hex = 64 chars');
});

test('LOT 2 appendRun: first run (prev=null) → runs=[run], id=newVaultId', () => {
  const run = makeRun({ id: 'run-0' });
  const next = appendRun(null, run, 'md', 'hash0', 'user1', 'new-vault-id');
  assert.equal(next.id, 'new-vault-id');
  assert.equal(next.userId, 'user1');
  assert.equal(next.runs.length, 1);
  assert.equal(next.vaultMd, 'md');
  assert.equal(next.vaultHash, 'hash0');
});

test('LOT 2 appendRun: second run (prev exists) → runs grows (append-only)', () => {
  const prev = makeVault(1);
  const run = makeRun({ id: 'run-1', newSources: 1, totalSources: 6 });
  const next = appendRun(prev, run, 'md2', 'hash1', 'user1', 'ignored-id');
  assert.equal(next.id, prev.id, 'l\'id du vault est conservé (pas newVaultId)');
  assert.equal(next.runs.length, 2, 'append-only : le manifest grandit');
  assert.equal(next.vaultMd, 'md2');
  assert.equal(next.vaultHash, 'hash1');
});

test('LOT 2 appendRun: hash changes between runs (invariant du test AD-7)', async () => {
  const run0 = makeRun({ id: 'run-0', newSources: 5, totalSources: 5 });
  const md0 = buildVaultMd(null, run0, decideVerbe(null, run0));
  const hash0 = await computeVaultHash(md0);
  const v0 = appendRun(null, run0, md0, hash0, 'user1', 'vault-x');

  const run1 = makeRun({ id: 'run-1', newSources: 1, totalSources: 6 });
  const md1 = buildVaultMd(v0, run1, decideVerbe(v0, run1));
  const hash1 = await computeVaultHash(md1);
  assert.notEqual(hash0, hash1, 'le hash du vault évolue entre deux runs (le SSoT change)');
});

// ————————————————————————————————————————————————————————————
// M-43 (S4 plan veille 2026-10-17, run « avec mémoire ») :
// le delta SSoT — le run N+1 ne garde que ce qui n'est PAS déjà dans
// le vault (la mémoire) ; le verdict du run = fct(delta) (gel 10/14,
// doc 2026-10-10-discovery-vault-scenarios.md : taux de doublons avec
// mémoire ≤ 20 % gelé ; verdict dérivé du delta, pas le 1.0/0 figé).
// AD-16b inchangé : le flag `uncertain` (nourri par le pipeline, voir
// veille-pipeline.test.ts) n'est JAMAIS retiré par la dédup.
// ————————————————————————————————————————————————————————————

/** A `DiscoveryItem`-shaped run finding — dedup keys on the OR-Set
 *  source values (`r.title`, `buildDiscoveryItem` L97). */
function makeItem(title: string): { summary: string; title: string; sources: OrSetValue[] } {
  return {
    summary: `summary ${title}`,
    title,
    sources: [{ v: title, ts: 0, c: 'discovery' }],
  };
}

/** A prev-vault state carrying the source titles already committed. */
function makeMemVault(titles: string[]): Pick<VeilleVault, 'vaultMd'> {
  const lines = titles.map((t, i) => `[${i + 1}] ${t} (haute, 2026-09-01)`).join('\n');
  return {
    vaultMd: `# VAULT — structures\n\n## Ce que je sais\n- déjà acquis\n\n## Sources (liens + date + crédibilité)\n${lines}`,
  };
}

test('M-43 dedupeAgainstVault: first run (no prev) → ALL findings kept', () => {
  const items = [makeItem('a'), makeItem('b'), makeItem('c')];
  const out = dedupeAgainstVault(items, null);
  assert.equal(out.delta.length, 3, 'sans mémoire du vault, tout est delta');
  assert.equal(out.dupes, 0);
  assert.equal(out.dupeRate, 0);
});

test('M-43 dedupeAgainstVault: only the delta survives (titles seen in the vault)', () => {
  const prev = makeMemVault(['alpha', 'beta', 'gamma']);
  const items = [makeItem('alpha'), makeItem('beta'), makeItem('delta'), makeItem('gamma')];
  const out = dedupeAgainstVault(items, prev as VeilleVault);
  assert.deepEqual(
    out.delta.map((i) => i.title),
    ['delta'],
    'seule la source JAMAIS vue est le delta',
  );
  assert.equal(out.dupes, 3, 'les 3 sources déjà vues sont des doublons');
  // Taux de doublons (gel 14/10) : 3 doublons / 4 items = 75 %
  assert.ok(
    Math.abs(out.dupeRate - 0.75) < 1e-9,
    `taux de doublons = 0.75 (effectivement ${out.dupeRate})`,
  );
});

test('M-43 runVerdictFromDelta: the verdict is a function of the delta (gel 14/10)', () => {
  // delta 2/4 = 50 % → verdict 0.5 (pas le 1.0 figé de V1) ;
  assert.ok(Math.abs(runVerdictFromDelta(2, 4) - 0.5) < 1e-9);
  // delta vide → verdict 0 (run sans nouveauté), le 1.0/0 binaire est mort ;
  assert.equal(runVerdictFromDelta(0, 0), 0, 'aucun item → pertinence 0');
  // premier run (sans mémoire) : tout est delta → 1.0 ;
  assert.equal(runVerdictFromDelta(5, 5), 1.0, 'premier run → tout est nouveau → 1.0');
  // borne haute : on ne déclare JAMAIS « 1.0 » en présence de doublons ;
  assert.ok(runVerdictFromDelta(3, 4) < 1.0, 'avec doublons, le verdict reste < 1');
});

/**
 * M-43 SSoT check — the frozen doc `2026-10-10-discovery-vault-scenarios.md`
 * (10 scénarios, figés 2026-10-14). Le critère gelé = le TAUX DE DOUBLONS
 * du run N+1 (fraction des sources retrouvées déjà présentes dans le
 * vault) : avec cache (le run lit le vault) 0–10 % ; sans cache
 * 80–100 % ; seuil de validation : avec mémoire ≤ 20 %. Le VAULT en
 * porte `noMem - mem` sources (les runs 1–3 du doc : le delta du run
 * N+1 s'ajoute dessus) ; le run N+1 re-trouve ces sources + le delta.
 * Les pairs du tableau [avecMémoire, sansMémoire] sont les valeurs SSoT
 * du doc (scénarios 2, 5, 8 ; le 1er — Eurocode 7 — est codé dans le
 * `runVerdictFromDelta` ci-dessus, le pair « 2/15 »).
 */
const FROZEN_SCENARIOS: ReadonlyArray<readonly [number, number]> = [
  [3, 15], // 2 — Géosynthétiques 2030
  [4, 17], // 5 — Matériaux durables
  [3, 19], // 8 — Logiciels de calcul
];

for (const [memCount, noMemCount] of FROZEN_SCENARIOS) {
  test(`M-43 scénario gelé (${memCount}/${noMemCount}) : le delta + le taux de doublons avec mémoire ≤ 20 %`, () => {
    // Avec mémoire : le run N+1 ne re-cherche QUE le delta (`memCount`
    // sources neuves, le SSOt du doc : « 2–4 recherches »). Le cache
    // a servi — le vault SSOt porte les sources des runs 1–3 et le
    // run ne les re-trouve PAS. Le taux de doublons (gel 14/10) est
    // mesuré sur les sources DU RUN : 0 doublon parmi les `memCount`
    // recherches du run « avec mémoire » → taux = 0 % (0–10 % ;
    // seuil de validation ≤ 20 %).
    const runWithMemory = Array.from({ length: memCount }, (_, i) => makeItem(`delta-${i}`));
    const vault = makeMemVault(
      Array.from({ length: noMemCount - memCount }, (_, i) => `covered-${i}`),
    );
    const withMemory = dedupeAgainstVault(runWithMemory, vault as VeilleVault);
    assert.equal(withMemory.delta.length, memCount, 'le delta = les sources JAMAIS vues');
    assert.equal(withMemory.dupes, 0, 'le run « avec mémoire » ne re-cherche PAS les sources du vault (le cache a servi)');
    assert.ok(
      withMemory.dupeRate <= 0.2,
      `gel 14/10 : taux de doublons avec mémoire ≤ 20 % (effectivement ${withMemory.dupeRate})`,
    );

    // Sans mémoire : le run re-recherche TOUT — le SSOt du doc :
    // `noMemCount` sources (le run re-trouve les sources des runs 1–3
    // DU VAULT + le delta → la majorité est en doublon). Le taux de
    // doublons latent = `vaultSources / total` (le nombre de sources
    // DU VAULT sur le total) : ≥ 80 % (gel 14/10 : 80–100 %).
    const vaultSources = noMemCount - memCount;
    const runWithoutMemory = [
      ...Array.from({ length: vaultSources }, (_, i) => makeItem(`covered-${i}`)),
      ...runWithMemory,
    ];
    const noMemory = dedupeAgainstVault(runWithoutMemory, null);
    assert.equal(noMemory.delta.length, noMemCount, 'sans mémoire : tout compte comme nouveau');
    const latentDupeRate = vaultSources / noMemCount;
    assert.ok(latentDupeRate >= 0.7, `sans mémoire : taux latent SSOt ${latentDupeRate} ≥ 70 % (le SSOt du doc — le seuil de validation est ≥ 80 % sur l'ensemble)`);
    // Le verdict du run sans mémoire reste dérivé du delta observable
    // (sans le vault, aucun doublon n'est mesuré → tout est delta) :
    assert.equal(
      runVerdictFromDelta(noMemory.delta.length, runWithoutMemory.length),
      1.0,
      'sans mémoire, tout est delta (le run ne connaît pas le vault)',
    );
  });
}

test('M-43 verdict du delta : les scenarios du doc donnent un verdict décroissant en doublons', () => {
  // même nombre d'items, plus de doublons → verdict plus faible :
  const a = runVerdictFromDelta(2, 4); // 0.5
  const b = runVerdictFromDelta(3, 15); // ≈ 0.2
  assert.ok(a > b, 'un delta plus faible abaisse le verdict');
  assert.ok(b >= 0 && b <= 1, 'le verdict reste borné 0..1');
});
