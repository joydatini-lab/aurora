/**
 * discovery-rapport-wiring.test.ts (M-44, v2 MVP Veille + Chat agentique, S4 —
 * plan `docs/plans/2026-10-17-veille-chat-mvp.md` L464–476, écrans 13/14).
 *
 * Le RAPPORT DE VEILLE (route `/discovery/:id`) : le VAULT.md du programme
 * est rendu « style édition » (Stitch `discovery_rapport_de_veille_pr_cision_
 * fraunces`) — chapeau + sections, les renvois `[n]` sont CLIQUABLES (ils
 * ouvrent la feuille des sources, AD-16b : le contenu est du contenu de
 * tiers, jamais exécuté), bandeau « lecture seule » (le rapport ne commite
 * jamais, AD-7 single-writer : seul le run `research` écrit le vault),
 * bouton « Sources · N » qui ouvre la FEUILLE DES SOURCES (Stitch
 * `discovery_menu_des_sources_pr_cision_fraunces`) : filtres
 * Toutes/Haute/Moyenne/Ce mois-ci, crédibilité, ouverture, « Copier les
 * références ».
 *
 * Le SSoT du rapport est un module PUR plain-JS
 * (`src/components/veille/veille-rapport.js` — le pattern de
 * `mirror-findings-card.ts` / `veille-programs-join.js` : zéro React, zéro
 * DOM, zéro réseau, testable par `node:test` sans le chemin TS) :
 *
 *   - `parseVaultSections(md)` : les sections du VAULT.md (`## …`), le
 *     chapeau (le contenu AVANT la première section) + l'index des
 *     renvois `[n]` (n = le numéro de la source dans la feuille) ;
 *   - `filterSources(sources, 'Toutes'|'Haute'|'Moyenne'|'Ce mois-ci')` :
 *     le filtre de la feuille (crédibilité haute/moyenne ; « Ce mois-ci »
 *     = la source date du mois courant ; « Toutes » = le tout) ;
 *   - `buildReportMeta(program)` : le chapeau du rapport (le titre du
 *     programme, la cadence, le run N, la date, le verdict de pertinence
 *     en plain French) — le SSoT que la surface ne recalcule JAMAIS.
 *
 * Lecture HORS LIGNE : le rapport lit le miroir PowerSync
 * `discovery_vault` (le `use-veille-programs` join, AD-7 local-first) —
 * l'état vide honnête = « 1er run en attente » (le programme existe mais
 * n'a PAS encore de run, AD-13 état vide, jamais un faux rapport).
 *
 * AD-16b : le rendu markdown passe par le `marked` SÉCURISÉ de
 * `markdownToHtml` (`@aurora/ui`, le SSoT de `VaultMdView` — le HTML brut
 * du vault est neutralisé, jamais exécuté) ; cette neutralisation est
 * validée par les tests `canvas-utils.test.ts` de `packages/ui` (ici on
 * valide le branchement : le module pur EXPOSE l'entry-point, le composant
 * React le consomme).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/discovery-rapport-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseVaultSections,
  filterSources,
  buildReportMeta,
  VAULT_REF_FILTERS,
  type VaultRef,
  type VaultSection,
  type SourceEntry,
} from '../src/components/veille/veille-rapport.js';

// ---------------------------------------------------------------------------
// Fixtures — un VAULT.md conforme au SSoT du `buildVaultMd`
// (packages/discovery/src/vault.ts) + une feuille de sources (les titres
// de la section `## Sources`, le SSoT de la dédup M-43).
// ---------------------------------------------------------------------------

const VAULT_MD = [
  '# VAULT — eurocode-7',
  '',
  '## Ce que je sais',
  '- La révision 2026 de l\'Eurocode 7 est validée par le CEN/TC 205.',
  '',
  '## Ce qui a changé',
  '- Les premières fiches techniques nationales sont publiées.',
  '',
  '## Questions ouvertes',
  '- Quels pays adoptent la révision en premier ?',
  '',
  '## Historique de runs',
  '- 2026-12-01 — 3 nouvelles, total 15',
  '- 2026-11-01 — 5 nouvelles, total 12',
  '',
  '## Sources (liens + date + crédibilité)',
  '(cumul 15 sources au 2026-12-01)',
  '- [1] Projet de révision de l\'Eurocode 7 (haute, 2026-09-15)',
  '- [2] Analyse des modifications du chapitre 5 (moyenne, 2026-09-20)',
  '- [13] Clôture de la consultation publique (haute, 2026-10-28)',
  '- [14] Première fiche technique nationale : France D4 (moyenne, 2026-12-01)',
  '- [15] Première fiche technique nationale : Allemagne DAfStAL (2026-12-01)',
].join('\n');

function makeSource(over: Partial<SourceEntry> & { n: number }): SourceEntry {
  return {
    title: `Source ${over.n}`,
    credibility: 'haute',
    date: '2026-12-01',
    url: `https://example.com/${over.n}`,
    ...over,
  } as SourceEntry;
}

// ---------------------------------------------------------------------------
// Tests — parseVaultSections (le SSoT du rapport)
// ---------------------------------------------------------------------------

test('M-44 parseVaultSections: un VAULT.md vide → 0 section, 0 renvoi, chapeau vide (état « 1er run en attente »)', () => {
  const parsed = parseVaultSections('');
  assert.equal(parsed.sections.length, 0, 'pas de section dans un VAULT vide');
  assert.equal(parsed.refs.length, 0, 'pas de renvoi [n] sans source');
  assert.equal(parsed.lead, '', 'le chapeau est vide (le run n\'a PAS encore de rapport)');
});

test('M-44 parseVaultSections: les sections ## du VAULT.md (le SSoT du buildVaultMd)', () => {
  const parsed = parseVaultSections(VAULT_MD);
  const titles = parsed.sections.map((s) => s.title);
  assert.ok(titles.includes('Ce que je sais'), 'la section « Ce que je sais » est parsée');
  assert.ok(titles.includes('Ce qui a changé'), 'la section « Ce qui a changé » est parsée');
  assert.ok(titles.includes('Questions ouvertes'));
  assert.ok(titles.includes('Historique de runs'));
  assert.ok(titles.includes('Sources (liens + date + crédibilité)'));
  assert.equal(parsed.sections.length, 5, '5 sections (le SSoT du VAULT_MD)');
});

test('M-44 parseVaultSections: le chapeau = le contenu AVANT la 1re section (le run rapporté)', () => {
  const parsed = parseVaultSections(VAULT_MD);
  assert.ok(parsed.lead.includes('VAULT — eurocode-7'), 'le chapeau porte le titre du VAULT');
  assert.ok(!parsed.lead.includes('Ce que je sais'), 'le chapeau n\'includ PAS le 1er body de section');
});

test('M-44 parseVaultSections: les renvois [n] sont indexés (n = le numéro de la source, AD-16b)', () => {
  // Le SSoT de la feuille : les sources sont NUMÉROTÉES (`- [n] <titre>`)
  // dans la section `## Sources` du VAULT.md — le rapport en rend les
  // renvois [n] CLIQUABLES (le n renvoie à la source N de la feuille).
  const parsed = parseVaultSections(VAULT_MD);
  const nums = parsed.refs.map((r) => r.n).sort((a, b) => a - b);
  assert.deepEqual(nums, [1, 2, 13, 14, 15], 'l\'index des renvois = les numéros des sources');
  // Chaque renvoi porte son titre (la feuille l\'utilise pour l\'étiqueter).
  const ref13 = parsed.refs.find((r) => r.n === 13);
  assert.equal(ref13?.title, 'Clôture de la consultation publique');
});

test('M-44 parseVaultSections: le body d\'une section ne reparses PAS les ## imbriqués (le VAULT n\'a pas de sous-sections)', () => {
  const md = ['## A', 'texte avec ## fausse section', '## B', 'autre'].join('\n');
  const parsed = parseVaultSections(md);
  assert.equal(parsed.sections.length, 2, '2 sections (le ## du body n\'est PAS un header)');
  assert.equal(parsed.sections[0]?.title, 'A');
  assert.equal(parsed.sections[1]?.title, 'B');
});

// ---------------------------------------------------------------------------
// Tests — filterSources (le SSoT de la feuille des sources)
// ---------------------------------------------------------------------------

test('M-44 filterSources: "Toutes" = l\'intégralité de la feuille (le défaut)', () => {
  const sources = [makeSource({ n: 1 }), makeSource({ n: 2, credibility: 'moyenne' })];
  const out = filterSources(sources, 'Toutes');
  assert.equal(out.length, 2, 'Toutes → aucune source filtrée');
});

test('M-44 filterSources: "Haute" = le filtre de crédibilité (la haute seule)', () => {
  const sources = [
    makeSource({ n: 1, credibility: 'haute' }),
    makeSource({ n: 2, credibility: 'moyenne' }),
    makeSource({ n: 3, credibility: 'haute' }),
  ];
  const out = filterSources(sources, 'Haute');
  assert.deepEqual(
    out.map((s) => s.n),
    [1, 3],
    'Haute → les sources de crédibilité haute (pas la moyenne)',
  );
});

test('M-44 filterSources: "Moyenne" = le filtre de crédibilité (la moyenne seule)', () => {
  const sources = [
    makeSource({ n: 1, credibility: 'haute' }),
    makeSource({ n: 2, credibility: 'moyenne' }),
  ];
  const out = filterSources(sources, 'Moyenne');
  assert.deepEqual(out.map((s) => s.n), [2], 'Moyenne → la source moyenne');
});

test('M-44 filterSources: "Ce mois-ci" = les sources datées du mois courant', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const thisMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const otherMonth =
    month === 0
      ? `${year - 1}-12`
      : `${year}-${String(month).padStart(2, '0')}`;
  const sources = [
    makeSource({ n: 1, date: `${thisMonth}-05` }),
    makeSource({ n: 2, date: `${otherMonth}-28` }),
    makeSource({ n: 3, date: '' }),
  ];
  const out = filterSources(sources, 'Ce mois-ci');
  assert.deepEqual(out.map((s) => s.n), [1], 'Ce mois-ci → la source du mois courant (pas l\'autre mois, pas la sans date)');
});

test('M-44 VAULT_REF_FILTERS: le vocabulaire fermé de la feuille (le SSoT des chips)', () => {
  assert.deepEqual(VAULT_REF_FILTERS, ['Toutes', 'Haute', 'Moyenne', 'Ce mois-ci']);
});

test('M-44 filterSources: un filtre inconnu → l\'intégralité (dégradation AD-1, jamais une rupture)', () => {
  const sources = [makeSource({ n: 1 })];
  assert.equal(filterSources(sources, 'Inconnu' as never).length, 1, 'filtre inconnu → rien n\'est filtré (AD-1 dégradation)');
});

// ---------------------------------------------------------------------------
// Tests — buildReportMeta (le SSoT du chapeau du rapport)
// ---------------------------------------------------------------------------

test('M-44 buildReportMeta: le chapeau du rapport (run N + date + verdict, le SSoT manifest)', () => {
  const program = {
    automation: { id: 'p1', name: 'Veille Eurocode 7 2026', cron: '0 8 1 * *' } as never,
    lastRun: { id: 'r3', date: '2026-12-01', relevance: 0.9, newSources: 3 } as never,
    vault: { runs: [{}, {}, { id: 'r3', date: '2026-12-01' }] } as never,
    totalSources: 15,
  };
  const meta = buildReportMeta(program);
  assert.equal(meta.title, 'Veille Eurocode 7 2026', 'le titre du rapport = le nom du programme');
  assert.equal(meta.runNumber, 3, 'le run N = l\'index du run dans le manifest (append-only, 1-indexé)');
  assert.equal(meta.date, '2026-12-01', 'la date du dernier run (le SSoT du manifest)');
  assert.equal(meta.relevanceLabel, 'pertinence élevée', 'le verdict du run en plain French (le SSoT du rapport)');
});

test('M-44 buildReportMeta: le programme SANS run → le chapeau « 1er run en attente » (AD-13 état vide honnête)', () => {
  const program = {
    automation: { id: 'p2', name: 'Géosynthétiques 2030', cron: '0 8 1 1,4,7,10 *' } as never,
    lastRun: null,
    vault: { runs: [] } as never,
    totalSources: 0,
  };
  const meta = buildReportMeta(program);
  assert.equal(meta.pending, true, 'pas de run → le rapport est en ATTENTE (jamais un faux rapport, AD-13)');
  assert.equal(meta.title, 'Géosynthétiques 2030');
});

test('M-44 buildReportMeta: la cadence du programme (le cron en plain French, le SSoT du sous-titre Stitch)', () => {
  const program = {
    automation: { id: 'p3', name: 'BIM/GEO', cron: '0 8 * * 1' } as never,
    lastRun: null,
    vault: { runs: [] } as never,
    totalSources: 0,
  };
  const meta = buildReportMeta(program);
  assert.ok(meta.cadence !== undefined, 'la cadence est dérivée du cron (le sous-titre « · mensuel » du Stitch)');
});

// ---------------------------------------------------------------------------
// Tests — le branchement de la surface (grep SSoT, le pattern sync-config)
// ---------------------------------------------------------------------------

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const MOBILE_SRC = join(TEST_DIR, '..', 'src');

test('M-44 route: le routeur déclare /discovery/:id (le rapport, gated discovery)', () => {
  const router = readFileSync(join(MOBILE_SRC, 'router.tsx'), 'utf8');
  assert.ok(
    /\/discovery\/:id/.test(router),
    'le routeur connaît le path /discovery/:id (le rapport de veille)',
  );
  assert.ok(
    /FeatureGate feature="discovery"[^]*RapportDeVeille|RapportDeVeille[^]*discovery/.test(router),
    'la page rapport est gated sur le feature discovery (le G-M7 du routeur)',
  );
});

test('M-44 composants: la feuille des sources + le rapport sont déclarés (le SSoT Stitch)', () => {
  const rapportMd = readFileSync(join(MOBILE_SRC, 'components/veille/rapport-md.tsx'), 'utf8');
  const sourcesSheet = readFileSync(join(MOBILE_SRC, 'components/veille/sources-sheet.tsx'), 'utf8');
  // Le rapport consomme le SSoT pur (le module plain-JS) :
  assert.ok(parseVaultSections, 'le SSoT pur parseVaultSections est importable');
  // Le rapport réutilise le rendu SÉCURISÉ (AD-16b) :
  assert.ok(
    /markdownToHtml|VaultMdView|vault-md/i.test(rapportMd),
    'le rapport-md consomme le rendu sécurisé (le marked de VaultMdView, AD-16b)',
  );
  // La feuille est un DIALOG (la surface « Sources · N », 44px a11y) :
  assert.ok(
    /Sheet|Dialog|dialog|aria/i.test(sourcesSheet),
    'sources-sheet est une feuille accessibilité (le dialog Radix, le 44px tap-target)',
  );
});
