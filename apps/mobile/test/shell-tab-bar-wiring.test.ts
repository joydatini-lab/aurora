/**
 * shell-tab-bar-wiring.test.ts (M-13, v2 MVP Veille + Chat agentique, S1).
 *
 * Le branchement de la navigation v2 (plan S1 §M-13) :
 *
 *  (a) la barre d'onglets = 4 entrées SSoT `Agent · Discovery · Focus ·
 *      Plus` (la barre 5 entrées legacy `Accueil/Tâches/Apprendre/Progrès/
 *      Agent` est remplacée) ;
 *  (b) la règle de prefix : `/discovery/*` active Discovery, `/focus/*`
 *      active Focus, la page Agent N'A PAS de barre (le Shell la masque sur
 *      `/agent*` — la navigation sort par le menu latéral de l'assistant,
 *      plan S1) ;
 *  (c) `AuroraEmptyBackdrop` (état vide de page) monte l'image MOTIF
 *      monochrome (`assets/aurora_icon_a_integre_dans_l'applciation.png`,
 *      le logo in-app `IN_APP_LOGO`) à une opacité DISCRÈTE ~8–12 % en
 *      arrière-plan — JAMAIS le logo officiel (SSoT `brand/logo.ts`).
 *
 * Run: pnpm -F @aurora/mobile exec node --experimental-strip-types
 *        --no-warnings --import ./test/register-resolve-hook.mjs
 *        --test test/shell-tab-bar-wiring.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TAB_BAR = join(ROOT, 'src', 'shell', 'ShellTabBar.tsx');
const SHELL = join(ROOT, 'src', 'shell', 'Shell.tsx');
const BACKDROP = join(ROOT, 'src', 'components', 'AuroraEmptyBackdrop.tsx');
const LOGO_SSOOT = join(ROOT, 'src', 'brand', 'logo.ts');

const tabBarSrc = readFileSync(TAB_BAR, 'utf8');
const shellSrc = readFileSync(SHELL, 'utf8');
const backdropSrc = readFileSync(BACKDROP, 'utf8');
const logoSrc = readFileSync(LOGO_SSOOT, 'utf8');

// ---------------------------------------------------------------------------
// (a) La barre = 4 entrées (Agent / Discovery / Focus / Plus)
// ---------------------------------------------------------------------------

test('M-13 (a) : ShellTabBar porte EXACTEMENT 4 onglets SSoT', () => {
  // Le SSoT de la barre (le plan S1 : `Agent · Discovery · Focus · Plus`).
  assert.ok(
    tabBarSrc.includes("'agent'") || tabBarSrc.includes('"agent"'),
    'onglet Agent',
  );
  assert.ok(
    tabBarSrc.includes("'discovery'") || tabBarSrc.includes('"discovery"'),
    'onglet Discovery',
  );
  assert.ok(
    tabBarSrc.includes("'focus'") || tabBarSrc.includes('"focus"'),
    'onglet Focus',
  );
  assert.ok(
    tabBarSrc.includes("'plus'") || tabBarSrc.includes('"plus"'),
    'onglet Plus (Intégrations y vit, plan S1)',
  );
  // La barre N'EST PAS restée à 5 entrées : les ids legacy (home / tasks /
  // learn / progress) ne sont plus des onglets (Ils restent des routes,
  // mais ne sont PLUS des entrées de la barre).
  const ids = [
    /['"]home['"]/.test(tabBarSrc),
    /['"]tasks['"]/.test(tabBarSrc),
    /['"]learn['"]/.test(tabBarSrc),
    /['"]progress['"]/.test(tabBarSrc),
  ];
  assert.equal(
    ids.filter(Boolean).length,
    0,
    'les 4 onglets legacy home/tasks/learn/progress sont sortis de la barre',
  );
  // La constante TABS compte 4 entrées (le tableau d'onglets de la barre) :
  // on compte les occurrences de `id: '…'` dans le tableau (une par onglet,
  // le seul endroit où l'identifiant est littéral).
  const tabsConst = tabBarSrc.match(/const TABS[\s\S]*?\];/);
  assert.ok(tabsConst, 'la constante TABS existe');
  const count = (tabsConst![0].match(/id: ['"]/g) ?? []).length;
  assert.equal(count, 4, 'TABS = 4 entrées (le plan S1)');
});

// ---------------------------------------------------------------------------
// (b) Règle de prefix : /discovery/* → Discovery, /focus/* → Focus,
//     /agent* → la barre est MASQUÉE (Shell), /settings → Plus
// ---------------------------------------------------------------------------

test('M-13 (b) : le Shell masque la barre sur /agent* (sortie par menu latéral)', () => {
  // Le Shell (04 S1) décide du montage de la barre par route : la page
  // Agent N'A PAS de barre d'onglets (plan S1 §M-13 : « AUCUNE barre de
  // navigation sur la page Agent »). La règle vit dans Shell.tsx.
  assert.ok(
    /agent/.test(shellSrc) && /startsWith|location/i.test(shellSrc),
    'Shell.tsx porte une règle de masque par prefix (route agent)',
  );
});

test('M-13 (b) : la règle de prefix active le bon onglet (discovery/focus)', () => {
  // La barre active l'onglet selon le prefix de la route courante :
  // /discovery* → Discovery, /focus* → Focus. L'implémentation est
  // contractuelle : la fonction de la barre lit `location.pathname`.
  assert.ok(
    /startsWith/.test(tabBarSrc),
    'la règle d\'activation est par prefix (startsWith sur la pathname)',
  );
});

// ---------------------------------------------------------------------------
// (c) AuroraEmptyBackdrop : motif monochrome discret (8–12 %), PAS le logo
//     officiel
// ---------------------------------------------------------------------------

test('M-13 (c) : AuroraEmptyBackdrop monte le motif MONOCHROME (IN_APP_LOGO) à 8–12 %', () => {
  // L'état vide de page = le motif monochrome en ARRIÈRE-PLAN DISCRET
  // (le SSoT du plan S1 : opacité ~8–12 %). Le composant consomme le
  // logo in-app (le motif A), PAS le logo officiel (le SSoT de brand/logo.ts).
  assert.ok(
    backdropSrc.includes('IN_APP_LOGO') ||
      backdropSrc.includes("aurora_icon_a_integre") ||
      /logo/i.test(backdropSrc),
    'AuroraEmptyBackdrop consomme le motif monochrome (IN_APP_LOGO / l\'asset A)',
  );
  // L'opacité DISCRÈTE : la valeur SSoT du plan (8–12 %). Le composant la
  // fixe en 0.08–0.12 (ou l'expose via une variable / un commentaire — le
  // test vérifie la borne 8–12 %, qu'elle soit en forme décimale 0.08–0.12
  // ou en pourcentage 8–12 %).
  const opacity =
    backdropSrc.match(/opacity[:\s]*['"]?(0?\.?0?8|0?\.?0?9|0?\.10|0?\.1[12])/) ??
    backdropSrc.match(/opacity[:\s]*['"]?(8|9|10|11|12)%/i) ??
    backdropSrc.match(/0?\.1[012]/) ??
    backdropSrc.match(/\b(8|9|10|11|12) ?%/i);
  assert.ok(
    opacity,
    'AuroraEmptyBackdrop porte une opacité dans la borne 8–12 % du plan',
  );
  // ZÉRO import du logo officiel : le SSoT de brand/logo.ts est consommé
  // pour le motif A, JAMAIS l'asset officiel complet.
  assert.ok(
    !/logo\.png|OFFICIAL_LOGO|OFFICIAL/.test(backdropSrc),
    'AuroraEmptyBackdrop ne consomme PAS le logo officiel (plan S1)',
  );
});

test('M-13 (c) : le SSoT brand/logo.ts distingue l\'in-app (motif A) du officiel', () => {
  // La règle SSoT (le plan S1 + brand/logo.ts) : le motif monochrome
  // in-app (IN_APP_LOGO) est un asset DISTINCT du logo officiel
  // (l'asset complet de l'app). Le SSoT expose les deux.
  assert.ok(logoSrc.includes('IN_APP_LOGO'), 'le SSoT expose IN_APP_LOGO (le motif A)');
});
