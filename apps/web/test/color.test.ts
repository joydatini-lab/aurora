import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contrastRatio,
  parseColor,
  pickForeground,
  rgbToOklch,
  oklchToRgb,
  toOklchString,
} from '../src/theme/color.ts';

/**
 * Ces tests verrouillent les deux choses qui rendent le reste sûr :
 * la conversion de couleur et le calcul de contraste. Une erreur ici ne se
 * voit pas à l'œil — elle se voit sur la capture d'écran d'un utilisateur.
 */

test('aller-retour sRGB → OKLCH → sRGB', () => {
  const samples = [
    { r: 1, g: 1, b: 1 },
    { r: 0, g: 0, b: 0 },
    { r: 0.48, g: 0.2, b: 0.9 },
    { r: 0.13, g: 0.55, b: 0.42 },
  ];

  for (const rgb of samples) {
    const back = oklchToRgb(rgbToOklch(rgb));
    assert.ok(Math.abs(back.r - rgb.r) < 0.002, `r ${back.r} vs ${rgb.r}`);
    assert.ok(Math.abs(back.g - rgb.g) < 0.002, `g ${back.g} vs ${rgb.g}`);
    assert.ok(Math.abs(back.b - rgb.b) < 0.002, `b ${back.b} vs ${rgb.b}`);
  }
});

test('OKLCH connus : blanc en L=1, noir en L=0', () => {
  const white = rgbToOklch({ r: 1, g: 1, b: 1 });
  const black = rgbToOklch({ r: 0, g: 0, b: 0 });
  assert.ok(Math.abs(white.l - 1) < 0.001);
  assert.ok(Math.abs(black.l) < 0.001);
  assert.ok(white.c < 0.001);
  assert.ok(black.c < 0.001);
});

test('parseColor accepte les formes présentes dans nos sources', () => {
  assert.deepEqual(parseColor('#fff'), { r: 1, g: 1, b: 1 });
  assert.deepEqual(parseColor('#000000'), { r: 0, g: 0, b: 0 });

  const rgb = parseColor('rgb(255 0 0)');
  assert.equal(rgb.r, 1);
  assert.equal(rgb.g, 0);

  const hsl = parseColor('hsl(0 100% 50%)');
  assert.ok(Math.abs(hsl.r - 1) < 0.001);
  assert.ok(hsl.g < 0.001);

  // Une valeur oklch doit revenir au même sRGB que son équivalent hex.
  const viaOklch = parseColor('oklch(1 0 0)');
  assert.ok(Math.abs(viaOklch.r - 1) < 0.002);
});

test('parseColor refuse une syntaxe inconnue plutôt que de deviner', () => {
  assert.throws(() => parseColor('magenta-fantaisie'), /non reconnue/i);
  assert.throws(() => parseColor('lab(50 20 30)'), /non gérée/i);
});

test('ratios de contraste de référence WCAG', () => {
  const white = { r: 1, g: 1, b: 1 };
  const black = { r: 0, g: 0, b: 0 };

  assert.equal(Math.round(contrastRatio(white, black) * 100) / 100, 21);
  assert.equal(Math.round(contrastRatio(white, white) * 100) / 100, 1);

  // #767676 sur blanc : la limite historique du AA (≈ 4,54:1).
  const grey = parseColor('#767676');
  const ratio = contrastRatio(grey, white);
  assert.ok(ratio > 4.5 && ratio < 4.6, `attendu ~4,54, obtenu ${ratio}`);
});

test('pickForeground choisit le texte lisible, pas le plus joli', () => {
  const veryDark = pickForeground(parseColor('oklch(0.25 0 0)'));
  assert.equal(veryDark.color, '#ffffff');
  assert.ok(veryDark.passes);

  const veryLight = pickForeground(parseColor('oklch(0.95 0 0)'));
  assert.equal(veryLight.color, '#000000');
  assert.ok(veryLight.passes);
});

test('invariante : noir ou blanc suffit toujours à dépasser 4,5:1', () => {
  // Résultat établi : pour toute couleur sRGB, max(contraste blanc,
  // contraste noir) ≥ 4,58:1. On le vérifie sur une grille de 343 couleurs
  // (7 niveaux par canal) plutôt que de le supposer.
  const levels = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1];
  let worst = Infinity;
  for (const r of levels) {
    for (const g of levels) {
      for (const b of levels) {
        const picked = pickForeground({ r, g, b });
        assert.equal(picked.passes, true, `échec sur rgb(${r},${g},${b}) — ${picked.ratio}:1`);
        worst = Math.min(worst, picked.ratio);
      }
    }
  }
  // La borne théorique est ~4,58:1 : on la retrouve empiriquement.
  assert.ok(worst > 4.5 && worst < 4.7, `minimum observé : ${worst.toFixed(3)}`);
});

test('toOklchString produit une valeur réinjectable', () => {
  const value = toOklchString({ l: 0.48, c: 0.2, h: 295 });
  assert.equal(value, 'oklch(0.48 0.2 295)');
  assert.doesNotThrow(() => parseColor(value));
});
