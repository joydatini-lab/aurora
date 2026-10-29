import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseColor, contrastRatio } from '../src/theme/color.ts';
import { THEME_PRESETS, DEFAULT_PRESET_ID, findPreset } from '../src/theme/presets.ts';
import { GRADIENT_NAMES } from '../src/theme/gradients.ts';

/**
 * Intégrité des données importées.
 *
 * Ces tests ne jugent pas les presets : ils vérifient qu'ils sont COMPLETS,
 * que chaque valeur est une couleur valide, et ils figent l'inventaire des
 * paires qui ne tiennent pas AA. Sans ce dernier point, quelqu'un pourrait
 * « corriger » un preset — ce qui est interdit, les couleurs sont copiées
 * telles quelles — sans que personne ne s'en aperçoive.
 */

test('10 presets sont chargés et identifiables', () => {
  assert.equal(THEME_PRESETS.length, 10);
  const ids = new Set(THEME_PRESETS.map((p) => p.id));
  assert.equal(ids.size, 10, 'identifiants en double');
  for (const preset of THEME_PRESETS) {
    assert.ok(preset.name.length > 0);
    assert.ok(['neutre', 'sombre', 'coloré', 'radical'].includes(preset.family));
  }
});

test('chaque preset définit les 24 couleurs dans les deux modes', () => {
  for (const preset of THEME_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      const colors = preset[mode];
      for (const [key, value] of Object.entries(colors)) {
        assert.equal(typeof value, 'string', `${preset.id}/${mode}/${key}`);
        assert.doesNotThrow(
          () => parseColor(value),
          `${preset.id}/${mode}/${key} n'est pas une couleur valide : ${value}`,
        );
      }
      assert.equal(Object.keys(colors).length, 24, `${preset.id}/${mode}`);
    }
  }
});

test('le rayon de chaque preset est une longueur CSS', () => {
  for (const preset of THEME_PRESETS) {
    assert.match(preset.radius, /^(\d*\.?\d+)(rem|px|em)$/, `${preset.id} : ${preset.radius}`);
  }
});

test('tous les thèmes tiennent AA sur le couple fond / texte', () => {
  for (const preset of THEME_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      const c = preset[mode];
      const ratio = contrastRatio(parseColor(c.background), parseColor(c.foreground));
      assert.ok(ratio >= 4.5, `${preset.id}/${mode} : ${ratio.toFixed(2)}:1`);
    }
  }
});

/**
 * Inventaire mesuré, pas supposé.
 *
 * Les presets tweakcn ne sont PAS tous conformes sur le texte des boutons
 * primaires (le pire descend à 2,28:1). On ne modifie pas leurs couleurs :
 * on constate, on affiche l'information dans l'interface, et on fige ici la
 * liste pour qu'elle ne dérive pas en silence.
 */
const BELOW_AA_PRIMARY = [
  'modern-minimal/light',
  'modern-minimal/dark',
  'darkmatter/light',
  'amethyst-haze/light',
  'ocean-breeze/light',
  'sunset-horizon/light',
  'sunset-horizon/dark',
  'tangerine/light',
  'tangerine/dark',
  'neo-brutalism/light',
].sort();

test('l’inventaire des couples primaires sous AA est celui mesuré', () => {
  const measured: string[] = [];
  for (const preset of THEME_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      const c = preset[mode];
      const ratio = contrastRatio(parseColor(c.primary), parseColor(c['primary-foreground']));
      if (ratio < 4.5) measured.push(`${preset.id}/${mode}`);
    }
  }

  assert.deepEqual(
    measured.sort(),
    BELOW_AA_PRIMARY,
    'la liste des presets non conformes a changé : vérifier les données avant de mettre à jour',
  );
});

test('aucun preset ne descend sous 2:1 sur le texte des boutons', () => {
  // Plancher absolu : en dessous, le libellé est illisible, pas seulement
  // « non conforme ». Si un preset y tombe, c'est une erreur de données.
  for (const preset of THEME_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      const c = preset[mode];
      const ratio = contrastRatio(parseColor(c.primary), parseColor(c['primary-foreground']));
      assert.ok(ratio >= 2, `${preset.id}/${mode} : ${ratio.toFixed(2)}:1`);
    }
  }
});

test('les dégradés référencés existent et sont uniques', () => {
  assert.equal(GRADIENT_NAMES.length, 12);
  assert.equal(new Set(GRADIENT_NAMES).size, 12);
  for (const name of GRADIENT_NAMES) {
    assert.match(name, /^[a-z0-9-]+$/, `nom de dégradé suspect : ${name}`);
  }
});

test('findPreset retrouve un identifiant et ignore l’inconnu', () => {
  assert.equal(findPreset('cosmic-night')?.name, 'Cosmic Night');
  assert.equal(findPreset('nexiste-pas'), undefined);
  assert.equal(findPreset(DEFAULT_PRESET_ID), undefined, 'le thème maison ne doit pas être un preset');
});
