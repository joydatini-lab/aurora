/**
 * ux-states-wiring.test.ts (S7, M-74 — 5 états UX sur chaque écran).
 *
 * M-74 (finitions) : l'audit (non-réécriture) de chaque écran de
 * `pages/{agent,discovery,focus,integrations}` passe ; l'unique écran
 * où l'un des 5 états manquait = la page Focus v2 (`focus/profiles.tsx`),
 * qui n'avait pas l'état hors-ligne (le 5ᵉ état du plan §16, AD-7
 * local-first : les données du miroir restent lisables en offline).
 *
 * Ce test pinne le wiring du 5ᵉ état (le pattern readFileSync de
 * `sync-config-wiring` / `integrations-wiring`, pas de render) :
 *
 *   1. la page branchera `useOnlineStatus()` (le hook partagé du
 *      store, SSoT `apps/mobile/src/hooks/use-online.ts`) ;
 *   2. le root `.focus-v2` porte l'attribute DOM `data-offline` (le
 *      state flag, pas un style inline) ;
 *   3. le bloc offline est rendu conditionnellement (`!online && …`),
 *      l'état DOM `data-ux="offline"` est émis (le test E2E de S8
 *      pourra le lire), le badge « Hors ligne » + le message honnête
 *      (les données restent lisables) sont rendus (AD-7 : jamais une
 *      fausse sync) ;
 *   4. le CSS `.focus-v2-offline` est coché dans `styles/focus.css`
 *      (le style n'est pas orphelin du côté DOM).
 *
 * Run: pnpm -F @aurora/mobile test ux-states-wiring
 *   (node --experimental-strip-types --no-warnings
 *    --import ./test/register-resolve-hook.mjs --test
 *    test/ux-states-wiring.test.ts)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const profilesSrc = readFileSync(
  join(here, '..', 'src', 'pages', 'focus', 'profiles.tsx'),
  'utf8',
);
const focusCss = readFileSync(
  join(here, '..', 'src', 'styles', 'focus.css'),
  'utf8',
);

// ——— 1. le hook partagé est branché (le store SSoT, pas un state local) ———
test('M-74 focus/profiles : useOnlineStatus est branché (le 5ᵉ état UX, AD-7)', () => {
  assert.match(
    profilesSrc,
    /import\s*\{\s*useOnlineStatus\s*\}\s*from\s*'\.\.\/\.\.\/hooks\/use-online';/,
    'l\'import du hook partagé (pas une re-implémentation locale)',
  );
  assert.match(
    profilesSrc,
    /const\s+online\s*=\s*useOnlineStatus\(\)/,
    'le state online est lu dans le composant',
  );
});

// ——— 2. l'attribute DOM du root porte l'état (le test E2E S8 peut le lire) ———
test('M-74 focus/profiles : le root porte data-offline (le DOM state flag)', () => {
  assert.match(
    profilesSrc,
    /data-offline=\{!online\}/,
    'l\'attribute du root reflette l\'online/offline',
  );
});

// ——— 3. le bloc offline est rendu + l'état DOM est émis + le message honnête ———
test('M-74 focus/profiles : le bloc offline (data-ux + badge + message honnête)', () => {
  assert.match(
    profilesSrc,
    /data-ux="offline"/,
    'le state DOM est émis (le contract E2E)',
  );
  assert.match(profilesSrc, /Hors ligne/, 'le badge utilisateur est rendu');
  assert.match(
    profilesSrc,
    /restent lisables/,
    'le message AD-7 honnête : les données du miroir restent lisables (jamais une fausse sync)',
  );
  assert.match(
    profilesSrc,
    /!\s*online\s*&&/,
    'le bloc est conditionnel (affiché seulement en offline)',
  );
});

// ——— 4. le CSS n'est pas orphelin du côté DOM ———
test('M-74 focus.css : .focus-v2-offline est stylé', () => {
  assert.match(
    focusCss,
    /\.focus-v2\[data-offline="true"\] > \.focus-v2-offline\s*\{/,
    'le sélecteur data-offline du root pilote le bloc (l\'attribute du test 2)',
  );
  assert.match(focusCss, /\.focus-v2-offline-hint\s*\{/, 'le hint est stylé');
});
