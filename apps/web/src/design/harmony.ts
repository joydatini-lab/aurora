import { oklchToRgb, parseColor, rgbToOklch, type Oklch } from '../theme/color.ts';
import type { HarmonyTemplate, Palette } from './types.ts';

/**
 * Harmonie chromatique.
 *
 * Le corpus cite Matsuda (7 gabarits V/Y/X/L/T/I/i, secteurs 93,6° / 18° /
 * 79,2° / 180°). Sa géométrie complète n'est pas fournie dans les documents :
 * l'implémenter à moitié produirait une palette fausse sans que personne ne le
 * voie. On implémente donc les gabarits d'Itten, qui sont complets et
 * vérifiables, et on le DIT (`model: 'itten'`) au lieu de prétendre à Matsuda.
 *
 * Les gabarits sont des ensembles d'écarts de teinte sur le cercle :
 *   monochrome           0
 *   analogue             −30 / +30
 *   complémentaire       180
 *   complémentaire-div.  150 / 210
 *   triadique            120 / 240
 *   tétradique           90 / 180 / 270
 */

export const TEMPLATE_OFFSETS: Record<HarmonyTemplate, number[]> = {
  monochrome: [0],
  analogue: [-30, 30],
  complementaire: [180],
  'complementaire-divisee': [150, 210],
  triadique: [120, 240],
  tetradique: [90, 180, 270],
};

export const TEMPLATE_LABELS: Record<HarmonyTemplate, string> = {
  monochrome: 'Monochrome',
  analogue: 'Analogue',
  complementaire: 'Complémentaire',
  'complementaire-divisee': 'Complémentaire divisée',
  triadique: 'Triadique',
  tetradique: 'Tétradique',
};

/**
 * Teinte de départ dérivée du brief.
 *
 * Déterministe : le même brief produit la même teinte, à chaque fois, sur
 * chaque machine. Une direction générée doit pouvoir être rejouée et comparée —
 * un tirage aléatoire rendrait toute revue impossible.
 */
export function seedHue(seed: string): number {
  let hash = 2166136261; // FNV-1a 32 bits
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 360;
}

/**
 * Construit les 5 couleurs d'une palette (ordre du schéma §5.2) :
 * dominante, accent, clair, profond, neutre.
 *
 * Les luminances sont fixées, les teintes varient : c'est ce qui garantit
 * qu'une palette reste lisible quel que soit le gabarit choisi.
 */
export function buildPalette(
  baseHue: number,
  template: HarmonyTemplate,
  orientation = 0,
): Palette {
  const offsets = TEMPLATE_OFFSETS[template];
  const hue = (baseHue + orientation + 360) % 360;
  const accentHue = (hue + (offsets[0] ?? 0) + 360) % 360;

  // La moyenne des écarts restants teinte légèrement le clair et le neutre :
  // sans cela, tous les gabarits produiraient les mêmes gris.
  const rest = offsets.slice(1);
  const meanOffset = rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : 0;

  const dominante: Oklch = { l: 0.38, c: 0.12, h: hue };
  const accent: Oklch = { l: 0.62, c: 0.19, h: accentHue };
  const clair: Oklch = { l: 0.96, c: 0.012, h: (hue + meanOffset + 360) % 360 };
  const profond: Oklch = { l: 0.18, c: 0.04, h: hue };
  const neutre: Oklch = { l: 0.55, c: 0.02, h: (hue + 40) % 360 };

  return {
    model: 'itten',
    template,
    orientation,
    colors: [toHex(dominante), toHex(accent), toHex(clair), toHex(profond), toHex(neutre)],
  };
}

export function toHex(color: Oklch): string {
  const { r, g, b } = oklchToRgb(color);
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function hexToHue(hex: string): number {
  return rgbToOklch(parseColor(hex)).h;
}

/**
 * Choix du gabarit à partir de la personnalité du brief.
 *
 * Règle explicite, pas de goût : une marque « Tech/Minimal » supporte une
 * complémentaire franche ; une marque « Organic/Professional » une analogue,
 * moins agressive. Cette table est la seule heuristique de la fonction.
 */
const TEMPLATE_BY_STYLE: Record<string, HarmonyTemplate> = {
  Tech: 'complementaire',
  Minimal: 'monochrome',
  Bold: 'triadique',
  Playful: 'tetradique',
  Elegant: 'analogue',
  Professional: 'complementaire-divisee',
  Organic: 'analogue',
};

export function templateForStyle(style: string): HarmonyTemplate {
  return TEMPLATE_BY_STYLE[style] ?? 'complementaire-divisee';
}
