/**
 * L3 — le contrat de la coquille : les 3 paliers responsive et les tokens.
 *
 * Ces tests sont l'ÉVIDENCE de la porte de sortie de L3 (« 3 paliers
 * responsive »). Ils appellent les fonctions pures de `layout-tokens.ts`, donc
 * ils prouvent le COMPORTEMENT (quel mode pour quelle largeur, quelle forme de
 * navigation, combien de panneaux) et non la présence d'une classe CSS — un
 * test de classe passerait même si la logique était fausse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAKPOINTS,
  LAYOUT_TOKENS,
  gutterForMode,
  modeForWidth,
  navFormForMode,
  panelCountForMode,
  readingMaxForMode,
} from '../src/lib/layout-tokens.ts';

test('web-app: les 5 paliers sont ceux de Tailwind par défaut (aucune valeur inventée)', () => {
  assert.deepEqual(BREAKPOINTS, {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  });
});

test('web-app: la largeur donne le mode attendu, aux bornes exactes', () => {
  // Chaque borne est testée des DEUX côtés : une erreur d'un pixel dans la
  // comparaison (`>` au lieu de `>=`) doit faire échouer le test.
  const cases: Array<[number, string]> = [
    [0, 'phone'],
    [639, 'phone'],
    [640, 'phone-large'],
    [767, 'phone-large'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1279, 'desktop'],
    [1280, 'wide'],
    [1535, 'wide'],
    [1536, 'wide-plus'],
    [2560, 'wide-plus'],
  ];
  for (const [width, expected] of cases) {
    assert.equal(
      modeForWidth(width),
      expected,
      `largeur ${width}px devrait donner le mode ${expected}`,
    );
  }
});

test('web-app: les 3 paliers de navigation (C1) — tab bar, rail, barre latérale', () => {
  // Le contrat C1 (« navigation compacte quand la largeur diminue ») en une
  // assertion : 3 formes, dans cet ordre, avec la bascule sur `lg` = 1024.
  assert.equal(navFormForMode('phone'), 'tabbar');
  assert.equal(navFormForMode('phone-large'), 'tabbar');
  assert.equal(navFormForMode('tablet'), 'rail');
  assert.equal(navFormForMode('desktop'), 'sidebar');
  assert.equal(navFormForMode('wide'), 'sidebar');
  assert.equal(navFormForMode('wide-plus'), 'sidebar');

  // `lg` = 1024 est LE seuil structurant (§2.2) : la forme change là, pas avant.
  assert.equal(navFormForMode(modeForWidth(1023)), 'rail');
  assert.equal(navFormForMode(modeForWidth(1024)), 'sidebar');
});

test('web-app: le nombre de panneaux suit le mode (§2.2)', () => {
  assert.equal(panelCountForMode('phone'), 1);
  assert.equal(panelCountForMode('tablet'), 2);
  assert.equal(panelCountForMode('desktop'), 2);
  assert.equal(panelCountForMode('wide'), 3);
  assert.equal(panelCountForMode('wide-plus'), 3);
});

test('web-app: la gouttière suit les valeurs de §5, et ne disparaît jamais sur téléphone', () => {
  // La référence §4.3 veut que la navigation se compacte, PAS que la marge
  // disparaisse : le téléphone garde 16 px.
  assert.equal(gutterForMode('phone'), 16);
  assert.equal(gutterForMode('phone-large'), 16);
  assert.equal(gutterForMode('tablet'), 24);
  assert.equal(gutterForMode('desktop'), 24);
  assert.equal(gutterForMode('wide'), 32);
  assert.equal(gutterForMode('wide-plus'), 32);
});

test('web-app: la largeur de lecture est plafonnée dès qu’on a la place', () => {
  // Sur téléphone, la colonne prend la largeur ; au-delà, elle est bornée —
  // « lire sur 2 m de large est illisible » (§2.2).
  assert.equal(readingMaxForMode('phone'), Number.POSITIVE_INFINITY);
  assert.equal(readingMaxForMode('phone-large'), Number.POSITIVE_INFINITY);
  assert.equal(readingMaxForMode('desktop'), LAYOUT_TOKENS.readingMax);
  assert.equal(readingMaxForMode('wide'), LAYOUT_TOKENS.readingMax);
});

test('web-app: les tokens de layout §5 sont ceux de la spec', () => {
  // Les valeurs sont figées ici parce qu'elles viennent d'une décision owner
  // (OQ-6). Si quelqu'un les change, ce test le dit au lieu de le laisser
  // dériver silencieusement dans le preset Tailwind.
  assert.deepEqual(LAYOUT_TOKENS, {
    rail: 240,
    railCollapsed: 64,
    panelMin: 360,
    inspector: 360,
    readingMax: 720,
    contentMax: 1280,
    gutter: 24,
    gutterLg: 32,
    tabbar: 56,
  });
});
