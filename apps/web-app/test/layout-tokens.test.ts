/**
 * L3 — le contrat tokens ↔ Tailwind.
 *
 * POURQUOI CE TEST PORTE SUR LE MÉCANISME, PAS SUR DES VALEURS
 * `tailwind.config.ts` ne RECOPIE pas les valeurs : il les IMPORTE de
 * `src/lib/layout-tokens.ts` et les interpole (`${BREAKPOINTS.sm}px`). Deux
 * copies ne peuvent donc pas diverger — il n'y a qu'une copie.
 *
 * La première version de ce test cherchait les littéraux (`"640px"`) : elle
 * échouait alors que le code était CORRECT, parce qu'elle testait une forme
 * d'écriture au lieu de la propriété qui compte. Ces tests vérifient donc :
 *  1. le config dérive bien de la source unique (import + interpolation) ;
 *  2. il ne branche PAS le preset `@aurora/ui` (dont les couleurs sont des
 *     triplets que le provider n'écrit pas) ;
 *  3. les couleurs viennent des alias du thème.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BREAKPOINTS, LAYOUT_TOKENS } from '../src/lib/layout-tokens.ts';

const tailwindSource = readFileSync(
  new URL('../tailwind.config.ts', import.meta.url),
  'utf8',
);

/** Retire les commentaires : une valeur citée dans un commentaire n'est pas un usage. */
const tailwindCode = tailwindSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

test('web-app: le preset Tailwind DÉRIVE de layout-tokens.ts (source unique, pas de copie)', () => {
  // L'import est la garantie structurelle : sans lui, les valeurs seraient
  // recopiées et pourraient diverger du module que les tests lisent.
  assert.match(
    tailwindCode,
    /import\s*\{[^}]*\bBREAKPOINTS\b[^}]*\bLAYOUT_TOKENS\b[^}]*\}\s*from\s*['"]\.\/src\/lib\/layout-tokens['"]/,
    'tailwind.config.ts doit importer BREAKPOINTS et LAYOUT_TOKENS de la source unique',
  );
});

test('web-app: chaque palier et chaque token de layout est interpolé depuis la source', () => {
  // On vérifie l'INTERPOLATION (le mécanisme), pas la valeur : si le config
  // écrivait `640px` en dur, il passerait ce test à tort — d'où l'assertion
  // sur la forme `${...}`.
  // `2xl` commence par un chiffre : il s'écrit forcément `BREAKPOINTS['2xl']`
  // (notation crochets). On accepte les deux formes, sinon le test échouerait
  // sur du code correct.
  const interpolated = (obj: string, key: string) =>
    tailwindCode.includes(`\${${obj}.${key}}`) ||
    tailwindCode.includes(`\${${obj}['${key}']}`);

  for (const name of Object.keys(BREAKPOINTS)) {
    assert.ok(
      interpolated('BREAKPOINTS', name),
      `le palier ${name} doit être interpolé depuis BREAKPOINTS`,
    );
  }
  for (const token of Object.keys(LAYOUT_TOKENS)) {
    assert.ok(
      interpolated('LAYOUT_TOKENS', token),
      `le token ${token} doit être interpolé depuis LAYOUT_TOKENS`,
    );
  }
});

test('web-app: le config ne branche PAS le preset @aurora/ui (défaut de transparence constaté en live)', () => {
  // `packages/ui/tailwind.config.ts` mappe ses couleurs sur des triplets
  // (`hsl(var(--aurora-bg-h))`) que `<AuroraThemeProvider>` n'écrit PAS — il
  // écrit les alias shadcn en valeur pleine. Brancher ce preset rendait la
  // coquille transparente : mesuré en live, `--aurora-bg-h` vide et
  // `background-color: rgba(0,0,0,0)`. L'assertion porte sur le CODE (les
  // commentaires sont retirés) : mentionner le piège en commentaire est utile,
  // le commettre ne l'est pas.
  assert.ok(
    !tailwindCode.includes('auroraPreset'),
    'ne pas brancher auroraPreset : ses triplets -h ne sont pas écrits par le provider',
  );
  assert.ok(
    !/\bpresets\s*:/.test(tailwindCode),
    'aucun preset de couleurs : les valeurs viennent du provider',
  );
});

test('web-app: les couleurs viennent des alias du thème, jamais d’une palette en dur', () => {
  // AD-17 : le provider écrit `--background`, `--primary`, … sur `<html>`.
  // Le shell les consomme tels quels, donc changer de thème change le rendu.
  for (const alias of ['--background', '--foreground', '--border', '--primary']) {
    assert.ok(
      tailwindCode.includes(`var(${alias})`),
      `la couleur doit venir de l'alias de thème ${alias}`,
    );
  }
  // Aucune couleur littérale (hex) dans le code du config : ce serait une
  // palette en dur qui ignorerait le thème actif.
  const hexColors = tailwindCode.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hexColors, [], `couleurs en dur trouvées: ${hexColors.join(', ')}`);
});
