/**
 * aurora-orb-wiring.test.ts (M-11b, v2 MVP Veille + Chat agentique, S1).
 *
 * Le branchement de l'orbe Aurora dans l'état vide du chat
 * (`/agent`, `pages/agent/index.tsx`) :
 *
 *  (a) le composant `AuroraOrb` EXISTE et est IMPORTÉ par la page
 *      agent (le montage est réel, pas un copier-coller JSX mort) ;
 *  (b) le CSS de l'orbe ne contient AUCUN hex hardcodé
 *      (`#[0-9a-f]{3,6}` → 0 match) — COULEUR DYNAMIQUE OBLIGATOIRE
 *      : l'orbe lit UNIQUEMENT les tokens AD-17
 *      `--aurora-accent-primary/secondary/punctual/on-primary`
 *      (règle d'orbe du plan ; l'image-theme 05 §5.4 surécrit les
 *      variables sur le `<html>`, l'orbe suit donc la palette sans
 *      aucun code dédié) ;
 *  (c) l'orbe est monté dans le bloc `.agent-empty` de la page
 *      (l'état vide du transcript, `data-state="empty"`) — il
 *      remplace l'ancien texte « Commencez par une intention »,
 *      avec le titre « Que puis-je faire pour vous ? » + les
 *      quick-actions pills de la maquette Stitch
 *      `agent_accueil_fraunces` (structure vérifiée, non inventée).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/aurora-orb-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORB_TSX = join(ROOT, 'src', 'components', 'AuroraOrb.tsx');
const ORB_CSS = join(ROOT, 'src', 'styles', 'aurora-orb.css');
const AGENT_PAGE = join(ROOT, 'src', 'pages', 'agent', 'index.tsx');

const orbTsx = readFileSync(ORB_TSX, 'utf8');
const orbCss = readFileSync(ORB_CSS, 'utf8');
const agentPage = readFileSync(AGENT_PAGE, 'utf8');

// ---------------------------------------------------------------------------
// (a) Le composant existe + est importé par la page agent
// ---------------------------------------------------------------------------

test('M-11b (a) : AuroraOrb.tsx existe et exporte le composant AuroraOrb', () => {
  assert.ok(orbTsx.includes('export function AuroraOrb'), 'export AuroraOrb');
  // L'intention est « le composant monte le CSS de l'orbe ». On verifie
  // l'IMPORT du bon fichier, pas un chemin litteral : le composant a ete
  // deplace (../../ -> ../) et le test, jamais execute en CI, est reste
  // sur l'ancien chemin et signalait une fausse regression.
  assert.match(
    orbTsx,
    /import\s+['"][^'"]*styles\/aurora-orb\.css['"]/,
    'montage du CSS orbe',
  );
});

test('M-11b (a) : la page /agent importe et monte AuroraOrb', () => {
  assert.ok(
    agentPage.includes("from '../../components/AuroraOrb'"),
    'import AuroraOrb dans pages/agent/index.tsx',
  );
  assert.ok(agentPage.includes('<AuroraOrb'), 'montage <AuroraOrb />');
});

// ---------------------------------------------------------------------------
// (b) Zéro hex hardcodé — couleur 100 % tokens --aurora-accent-*
// ---------------------------------------------------------------------------

test('M-11b (b) : le CSS de l’orbe ne contient aucun hex hardcodé', () => {
  const hexMatches = orbCss.match(/#[0-9a-fA-F]{3,8}\b/g);
  assert.equal(
    (hexMatches ?? []).length,
    0,
    `règle d'orbe du plan : COULEUR DYNAMIQUE — 0 hex toléré (${hexMatches ?? []} trouvés)`,
  );
});

test('M-11b (b) : le gradient + les yeux + le halo lisent les tokens --aurora-accent-*', () => {
  assert.ok(
    orbCss.includes('var(--aurora-accent-secondary'),
    'stop 0 % du radial-gradient = lueur secondaire',
  );
  assert.ok(
    orbCss.includes('var(--aurora-accent-primary'),
    'stop 55 % du radial-gradient + halo = accent principal',
  );
  assert.ok(
    orbCss.includes('var(--aurora-accent-punctual'),
    'stop 100 % du radial-gradient = ton ponctuel',
  );
  assert.ok(
    orbCss.includes('var(--aurora-accent-on-primary'),
    'les 2 yeux pilules = on-primary (porteuse sur l’accent)',
  );
  // Le gradient est positionné 35 %/30 % comme la maquette Stitch.
  assert.ok(
    /radial-gradient\(\s*circle at 35% 30%/.test(orbCss),
    'centre du gradient = 35 %/30 % (SSoT de la maquette)',
  );
});

// ---------------------------------------------------------------------------
// (c) Montage dans l'état vide `.agent-empty` + titre + pills
// ---------------------------------------------------------------------------

test('M-11b (c) : l’orbe est monté dans le bloc .agent-empty de la page', () => {
  // Le <AuroraOrb /> vit DANS le bloc .agent-empty (l'état vide du
  // transcript : data-state="empty").
  const emptyBlock = agentPage.match(
    /className="agent-empty"[\s\S]{0,2000}?agent-empty__suggestions/,
  );
  assert.ok(emptyBlock, 'le bloc .agent-empty porte l’orbe + le titre + les pills');
  assert.ok(
    emptyBlock![0].includes('<AuroraOrb'),
    '<AuroraOrb /> monté dans .agent-empty',
  );
});

test('M-11b (c) : le titre « Que puis-je faire pour vous ? » + les quick-actions de la maquette', () => {
  assert.ok(
    agentPage.includes('Que puis-je faire pour vous ?'),
    'titre SSoT de la maquette (au-dessus du sous-titre)',
  );
  // Les 3 pills de la structure Stitch : « Créer une veille »,
  // « Planifier un Focus », « Plus » (« Où j'en suis sur… » est
  // replié sur la 1re puce en mode chat, cf. écart Stitch).
  assert.ok(agentPage.includes('Créer une veille'), 'puce « Créer une veille »');
  assert.ok(agentPage.includes('Planifier un Focus'), 'puce « Planifier un Focus »');
  assert.ok(agentPage.includes('agent-empty__suggestion'), 'structure des puces (SSoT maquette)');
});
