import { contrastRatio, pickForeground, rgbToOklch, type Oklch, type Rgb } from './color.ts';

/**
 * Extraction d'une palette depuis une image de fond.
 *
 * Aucune dépendance : un canvas 48×48 suffit. C'est plus prévisible que
 * colorthief (qui vise des images déjà chargées et n'expose pas les mêmes
 * garanties de contraste) et cela évite 12 ko de code pour une opération que
 * le navigateur sait faire.
 *
 * La partie décisionnelle (`paletteFromPixels`) est PURE : elle prend des
 * octets RGBA et rend une palette. Elle est donc testable en Node, sans canvas.
 */

export interface Palette {
  /** Couleur dominante chromatique → `--primary` et `--ring`. */
  accent: Oklch;
  /** Seconde teinte franchement distincte → `--accent`. */
  secondary: Oklch;
  /** Teinte moyenne sombre, qui sert de voile → `--tint`. */
  tint: Oklch;
  /** Couleur de texte lisible sur `accent` (noir ou blanc). */
  onAccent: string;
  /** Couleur de texte lisible sur `secondary`. */
  onSecondary: string;
  /** Ratio de contraste obtenu pour `onAccent`. */
  accentContrast: number;
}

interface Bucket {
  rgb: Rgb;
  count: number;
  oklch: Oklch;
}

/** Taille de la vignette analysée. 48×48 = 2 304 pixels : assez pour la
 *  distribution, assez peu pour être instantané. */
export const SAMPLE_SIZE = 48;

/**
 * Regroupe les pixels en seaux de couleur, puis choisit trois teintes.
 *
 * Le seau est un cube de 16 niveaux par canal : il tolère le bruit JPEG sans
 * fondre deux teintes distinctes en une seule.
 */
export function paletteFromPixels(pixels: Uint8ClampedArray): Palette {
  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3] ?? 0;
    if (a < 128) continue; // transparent : ne compte pas

    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
      continue;
    }
    const rgb = { r: r / 255, g: g / 255, b: b / 255 };
    buckets.set(key, { rgb, count: 1, oklch: rgbToOklch(rgb) });
  }

  const all = [...buckets.values()].sort((x, y) => y.count - x.count);
  if (all.length === 0) return neutralFallback();

  const chromatic = all.filter((b) => b.oklch.c >= 0.05 && b.oklch.l > 0.12 && b.oklch.l < 0.94);
  const accentBucket = chromatic[0] ?? all[0]!;

  // Seconde teinte : la plus peuplée dont la teinte diffère d'au moins 40°.
  // Sans écart de teinte réel, on garde la même famille et on le dit par le
  // résultat (l'appelant voit deux couleurs proches) plutôt que d'inventer
  // une rotation arbitraire.
  const secondaryBucket =
    chromatic.find((b) => hueDistance(b.oklch.h, accentBucket.oklch.h) >= 40) ??
    chromatic[1] ??
    accentBucket;

  // Voile : le seau le plus peuplé parmi les plus sombres exploitables.
  const darker = all
    .filter((b) => b.oklch.l <= 0.5 && b.oklch.l >= 0.08)
    .sort((x, y) => y.count * (1 - y.oklch.l) - x.count * (1 - x.oklch.l));
  const tintBucket = darker[0] ?? [...all].sort((x, y) => x.oklch.l - y.oklch.l)[0]!;

  const onAccent = pickForeground(accentBucket.rgb);
  const onSecondary = pickForeground(secondaryBucket.rgb);

  return {
    accent: accentBucket.oklch,
    secondary: secondaryBucket.oklch,
    tint: tintBucket.oklch,
    onAccent: onAccent.color,
    onSecondary: onSecondary.color,
    accentContrast: onAccent.ratio,
  };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Image illisible ou entièrement transparente : gris neutre, jamais une
 *  couleur inventée. Le gris est la seule valeur qui ne ment pas sur l'image. */
function neutralFallback(): Palette {
  const grey = { l: 0.55, c: 0, h: 0 };
  return {
    accent: grey,
    secondary: { l: 0.75, c: 0, h: 0 },
    tint: { l: 0.28, c: 0, h: 0 },
    onAccent: pickForeground({ r: 0.53, g: 0.53, b: 0.53 }).color,
    onSecondary: '#000000',
    accentContrast: pickForeground({ r: 0.53, g: 0.53, b: 0.53 }).ratio,
  };
}

/**
 * Lit une image déjà chargée et en tire une palette.
 *
 * `willReadFrequently` évite un aller-retour GPU→CPU coûteux sur les navigateurs
 * qui accélèrent les canvas : on ne dessine qu'une fois, mais on relit les
 * pixels immédiatement.
 */
export function paletteFromImage(image: HTMLImageElement | ImageBitmap): Palette {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponible : impossible d’extraire la palette.');

  ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return paletteFromPixels(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}

/** Charge une URL d'image en `HTMLImageElement` (rejette proprement). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image illisible ou bloquée par CORS.'));
    image.src = src;
  });
}

/**
 * Réduit une image avant persistance.
 *
 * Stocker l'originale en `localStorage` fait sauter le quota (~5 Mo) dès la
 * première photo de téléphone. 1 280 px de large suffisent pour un fond
 * d'écran en `cover`.
 */
export function downscaleImage(image: HTMLImageElement, maxWidth = 1280): string {
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

/** Vérifie qu'une paire accent/texte tient AA. Exposé pour les tests. */
export function accentIsReadable(accent: Rgb, foreground: string): boolean {
  const fg = foreground === '#ffffff' ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 };
  return contrastRatio(accent, fg) >= 4.5;
}
