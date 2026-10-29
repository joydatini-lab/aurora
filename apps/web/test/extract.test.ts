import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accentIsReadable, paletteFromPixels } from '../src/theme/extract.ts';

/**
 * Extraction de palette, sans navigateur.
 *
 * `paletteFromPixels` ne touche ni au canvas ni au DOM : on peut donc lui
 * donner des images synthétiques dont on CONNAÎT la réponse. C'est la seule
 * façon de vérifier qu'un ciel bleu donne un accent bleu et pas un gris.
 */

/** Fabrique un tampon RGBA à partir d'une liste de couleurs et de poids. */
function pixels(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return data;
}

function repeat(color: [number, number, number, number], times: number) {
  return Array.from({ length: times }, () => color);
}

test('une image bleue donne un accent bleu, avec un texte blanc', () => {
  const palette = paletteFromPixels(pixels([...repeat([20, 40, 200, 255], 200), ...repeat([30, 60, 220, 255], 50)]));

  // Le bleu se situe autour de 264° en OKLCH.
  assert.ok(palette.accent.h > 240 && palette.accent.h < 290, `teinte ${palette.accent.h}`);
  assert.ok(palette.accent.c > 0.05, 'la chroma du bleu doit être franche');
  assert.equal(palette.onAccent, '#ffffff');
  assert.ok(palette.accentContrast >= 4.5, `ratio ${palette.accentContrast}`);
});

test('une image claire donne un texte noir', () => {
  const palette = paletteFromPixels(pixels(repeat([245, 240, 235, 255], 300)));
  assert.equal(palette.onAccent, '#000000');
  assert.ok(palette.accentContrast >= 4.5);
});

test('les pixels transparents ne comptent pas', () => {
  // 300 pixels transparents d'un vert vif + 40 pixels bleus opaques : le vert
  // ne doit pas peser dans la décision.
  const palette = paletteFromPixels(
    pixels([...repeat([0, 255, 0, 0], 300), ...repeat([20, 40, 200, 255], 40)]),
  );
  assert.ok(palette.accent.h > 240 && palette.accent.h < 290, `teinte ${palette.accent.h}`);
});

test('une image entièrement transparente retombe sur un gris, sans invention', () => {
  const palette = paletteFromPixels(pixels(repeat([255, 0, 0, 0], 50)));
  assert.equal(palette.accent.c, 0, 'aucune couleur ne doit être inventée');
  assert.equal(palette.secondary.c, 0);
  assert.equal(palette.tint.c, 0);
});

test('deux teintes distinctes donnent un accent et un secondaire séparés', () => {
  const palette = paletteFromPixels(
    pixels([...repeat([0, 0, 255, 255], 100), ...repeat([255, 128, 0, 255], 100)]),
  );

  const distance = Math.abs(palette.accent.h - palette.secondary.h);
  const hueGap = Math.min(distance, 360 - distance);
  assert.ok(hueGap >= 40, `écart de teinte trop faible : ${hueGap.toFixed(1)}°`);
});

test('le voile est plus sombre que l’accent', () => {
  const palette = paletteFromPixels(
    pixels([...repeat([120, 180, 240, 255], 120), ...repeat([20, 30, 60, 255], 60)]),
  );
  assert.ok(palette.tint.l < 0.6, `luminosité du voile : ${palette.tint.l}`);
});

test('accentIsReadable confirme la paire retenue', () => {
  const palette = paletteFromPixels(pixels(repeat([30, 60, 220, 255], 100)));
  const accentRgb = { r: 30 / 255, g: 60 / 255, b: 220 / 255 };
  assert.equal(accentIsReadable(accentRgb, palette.onAccent), true);
});

test('une image monochrome ne fabrique pas de seconde teinte', () => {
  // Que du gris : pas de teinte à opposer, donc secondaire = accent.
  const palette = paletteFromPixels(pixels(repeat([128, 128, 128, 255], 200)));
  // Un gris n'a pas de chroma, à l'erreur de conversion près (~1e-8).
  assert.ok(palette.accent.c < 1e-4, `chroma ${palette.accent.c}`);
  assert.ok(palette.secondary.c < 1e-4, `chroma ${palette.secondary.c}`);
});
