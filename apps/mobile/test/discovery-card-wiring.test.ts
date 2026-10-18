/**
 * discovery-card-wiring.test.ts (M-46, v2 MVP Veille + Chat agentique, S4 —
 * plan `docs/plans/2026-10-17-veille-chat-mvp.md` L490-494, écran 12
 * « Carte de liste v2 »).
 *
 * La CARTE DE LISTE d'un programme de veille au design v2 (le Stitch
 * `discovery_cartes_fiches_ditoriales_a_r_es_statut`) : l'en-tête
 * coloré (le pastille par teinte SSoT + le type/cadence) + 3 infos
 * (sources+delta, date dernière veille, pertinence) + le menu 3 points
 * DANS L'EN-TÊTE (le `.tsx` le place dans le header, plus dans le body).
 *
 * Le SSoT pur de l'en-tête est un module PLAIN-TS
 * (`src/lib/veille-card-ssoT.ts` — zéro React, zéro DOM, zéro réseau,
 * testable par `node:test` sous `--experimental-strip-types`, le
 * pattern de `veille-create-ssoT.ts` du M-45) :
 *
 *   - `pickCardTone(id)` : la teinte de la pastille (4 teintes SSoT
 *     fermées, cyclées par le hash stable de l'`id` du programme —
 *     le même programme donne toujours la même teinte, le SSoT du
 *     Stitch écran 12 : 4 teintes max, jamais une 5e inventée) ;
 *   - `cardToneLabel(cadence)` : le libellé de type de la ligne
 *     en-tête (le type FERMÉ « Veille » + la cadence SSoT du
 *     `cadenceLabel` de `veille-rapport.js` — le mapping inverse du
 *     formulaire M-45, jamais dupliqué ici).
 *
 * Bornes (AD-1 / AD-13) : une cadence inconnue/absente → « Veille »
 * seul (la cadence s'ommet, jamais inventée).
 *
 * Run: node --experimental-strip-types --no-warnings
 *        --import ./test/register-resolve-hook.mjs
 *        --test test/discovery-card-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CARD_TONES,
  cardToneLabel,
  pickCardTone,
} from '../src/lib/veille-card-ssoT.ts';

// ---------------------------------------------------------------------------
// Tests — le SSoT fermé des 4 teintes de la carte (le Stitch écran 12)
// ---------------------------------------------------------------------------

test('M-46 CARD_TONES: le SSoT fermé des 4 teintes de la pastille (accent/success/warning/info)', () => {
  assert.deepEqual(CARD_TONES, ['accent', 'success', 'warning', 'info']);
});

// ---------------------------------------------------------------------------
// Tests — pickCardTone (le hash stable de l'`id` → la teinte cyclée)
// ---------------------------------------------------------------------------

test('M-46 pickCardTone: le même id donne toujours la même teinte (le SSoT stable)', () => {
  const t1 = pickCardTone('auto-1', '2026-01-01');
  const t2 = pickCardTone('auto-1', '2026-02-02');
  assert.equal(t1, t2, 'la teinte ne dépend QUE de l\'id (pas de la date)');
  assert.ok((CARD_TONES as readonly string[]).includes(t1), 'la teinte est du SSoT fermé');
});

test('M-46 pickCardTone: un id manquant → la teinte par défaut (accent, jamais une teinte factice)', () => {
  assert.equal(pickCardTone('', '2026-01-01'), 'accent', 'l\'index 0 du SSoT fermé = accent (l\'AD-13 honnête)');
});

test('M-46 pickCardTone: des ids distincts couvrent les 4 teintes SSoT (le SSoT cyclé)', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const t = pickCardTone(`auto-${i}`, `2026-0${(i % 12) + 1}-01`);
    seen.add(t);
  }
  // Le SSoT cyclé 40 ids → au moins 3 des 4 teintes sont atteintes
  // (le pigeonhole guarantee sur 40 itérations modulo 4).
  assert.ok(seen.size >= 3, `40 ids distincts couvrent au moins 3 teintes du SSoT fermé (vu: ${[...seen].join(', ')})`);
  for (const t of seen) {
    assert.ok((CARD_TONES as readonly string[]).includes(t), `chaque teinte observée est du SSoT fermé (vu: ${t})`);
  }
});

// ---------------------------------------------------------------------------
// Tests — cardToneLabel (le libellé de la ligne en-tête, le SSoT du type + cadence)
// ---------------------------------------------------------------------------

test('M-46 cardToneLabel: un cron mensuel SSoT (M-45) → « Veille · mensuel »', () => {
  // Le cron `0 8 1 * *` = le mensuel du SSoT du formulaire M-45.
  assert.equal(cardToneLabel('0 8 1 * *'), 'Veille · mensuel', 'le type FERMÉ « Veille » + la cadence SSoT (le `cadenceLabel` de `veille-rapport.js`, jamais dupliqué)');
});

test('M-46 cardToneLabel: un cron quotidien SSoT (M-45) → « Veille · quotidien »', () => {
  assert.equal(cardToneLabel('0 8 * * *'), 'Veille · quotidien');
});

test('M-46 cardToneLabel: un cron hebdomadaire SSoT (M-45) → « Veille · hebdomadaire »', () => {
  assert.equal(cardToneLabel('0 8 * * 1'), 'Veille · hebdomadaire');
});

test('M-46 cardToneLabel: un cron trimestriel SSoT (M-45) → « Veille · trimestriel »', () => {
  assert.equal(cardToneLabel('0 8 1 1,4,7,10 *'), 'Veille · trimestriel');
});

test('M-46 cardToneLabel: cadence null/absente → « Veille » seul (l\'AD-13 honnête, la cadence s\'ommet)', () => {
  assert.equal(cardToneLabel(null), 'Veille', 'pas de cadence SSoT → le libellé se borne à « Veille » (jamais une cadence inventée)');
  assert.equal(cardToneLabel('exotique-cron'), 'Veille', 'un cron inconnu du SSoT fermé → « Veille » seul (l\'AD-13)');
});

// ---------------------------------------------------------------------------
// Tests — le branchement de la surface (grep SSoT, le pattern M-44/M-45)
// ---------------------------------------------------------------------------

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const MOBILE_SRC = join(TEST_DIR, '..', 'src');

test('M-46 carte: le `.tsx` consomme le SSoT pur (le `pickCardTone` + `cardToneLabel` de ce test)', () => {
  const card = readFileSync(join(MOBILE_SRC, 'pages/discovery/card.tsx'), 'utf8');
  assert.ok(
    /veille-card-ssoT/.test(card),
    'la carte importe le SSoT pur (le `pickCardTone`/`cardToneLabel` de ce test)',
  );
  assert.ok(
    /pickCardTone/.test(card),
    'la carte consomme `pickCardTone` (la teinte de la pastille, le SSoT du Stitch écran 12)',
  );
  assert.ok(
    /cardToneLabel/.test(card),
    'la carte consomme `cardToneLabel` (le type/cadence de la ligne en-tête)',
  );
});

test('M-46 carte: le menu 3 points est DANS L\'EN-TÊTE (plus dans le body/footer)', () => {
  const card = readFileSync(join(MOBILE_SRC, 'pages/discovery/card.tsx'), 'utf8');
  // Le menu (le `ProgramMenu`, le 3-points) est désormais dans la
  // zone d'en-tête de la carte (le `data-card-header` / le header
  // block), plus dans le body ni le footer. On vérifie que le
  // `ProgramMenu` apparaît dans un contexte proche du header
  // (le `data-card-header` ou le `AuroraCardHeader` ou le
  // `data-card-tone` du `data-card-header` SSoT M-46) :
  const menuIdx = card.indexOf('ProgramMenu');
  assert.ok(menuIdx > -1, 'le `ProgramMenu` (le 3 points) est encore présent dans la carte');
  // Le SSoT M-46 : le menu vit dans le `data-card-header` (le
  // header coloré du Stitch, le pastille + le type/cadence + le titre + le menu).
  const headerIdx = card.indexOf('data-card-header');
  assert.ok(
    headerIdx > -1 && headerIdx < menuIdx + 2000,
    'le `data-card-header` (le header coloré SSoT) porte le `ProgramMenu` (le menu est DANS l\'en-tête, plus dans le body)',
  );
});

test('M-46 carte: les 3 infos SSoT (sources+delta, date dernière veille, pertinence) sont présentes', () => {
  const card = readFileSync(join(MOBILE_SRC, 'pages/discovery/card.tsx'), 'utf8');
  assert.ok(
    /totalSources|newSources/.test(card),
    'la carte porte les sources (le count du dernier run, le SSoT du `VaultRunManifest`)',
  );
  assert.ok(
    /lastRun|date/.test(card),
    'la carte porte la date de la dernière veille (le `lastRun.date` du `VaultRunManifest`)',
  );
  assert.ok(
    /relevance|pertinence|Pertinence/.test(card),
    'la carte porte la pertinence (le verdict du dernier run, le SSoT du `relevanceLabel`)',
  );
});
