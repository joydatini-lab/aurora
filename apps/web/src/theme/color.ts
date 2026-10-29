/**
 * Couleur : conversions et contraste.
 *
 * Fonctions PURES, sans DOM ni dépendance. C'est ce qui les rend testables en
 * Node (voir `test/color.test.ts`) — un calcul de contraste qu'on ne peut pas
 * tester est un calcul qu'on ne peut pas garantir.
 *
 * Deux espaces cohabitent volontairement :
 *   - OKLCH, l'espace du design system (perception uniforme) ;
 *   - la luminance relative WCAG, seule base légitime du ratio de contraste.
 * Le L d'OKLab n'est PAS la luminance WCAG : les confondre fait passer des
 * paires illisibles pour conformes.
 */

export interface Rgb {
  /** 0..1 */
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** 0..1 */
  l: number;
  /** 0..~0.4 */
  c: number;
  /** degrés, 0..360 */
  h: number;
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Convertit une chaîne CSS en sRGB normalisé.
 *
 * Volontairement limité aux formes que produisent nos sources : `#hex`,
 * `rgb()`, `hsl()` et `oklch()`. Tout le reste lève — mieux vaut une erreur
 * franche qu'une couleur silencieusement fausse.
 */
export function parseColor(input: string): Rgb {
  const value = input.trim().toLowerCase();

  if (value.startsWith('#')) return parseHex(value);

  const fn = /^([a-z]+)\((.*)\)$/.exec(value);
  if (!fn) throw new Error(`Couleur non reconnue : ${input}`);

  const [, name = '', body = ''] = fn;
  const numbers = body
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part)));

  if (name === 'rgb' || name === 'rgba') {
    const [r = 0, g = 0, b = 0] = numbers;
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  if (name === 'hsl' || name === 'hsla') {
    const [h = 0, s = 0, l = 0] = numbers;
    return hslToRgb(h, s, l);
  }

  if (name === 'oklch') {
    const [l = 0, c = 0, h = 0] = numbers;
    return oklchToRgb({ l, c, h });
  }

  throw new Error(`Fonction de couleur non gérée : ${name}`);
}

function parseHex(value: string): Rgb {
  const hex = value.slice(1);
  const full =
    hex.length === 3 || hex.length === 4
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}

/* -------------------------------------------------------------------------- */
/* OKLab / OKLCH                                                               */
/* -------------------------------------------------------------------------- */

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const bb = c * Math.sin(hr);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * bb) ** 3;

  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

  return {
    r: clamp01(linearToSrgb(clamp01(r))),
    g: clamp01(linearToSrgb(clamp01(g))),
    b: clamp01(linearToSrgb(clamp01(b))),
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Sérialise en OKLCH, arrondi à 4 décimales comme les presets tweakcn. */
export function toOklchString({ l, c, h }: Oklch): string {
  const cl = Math.min(1, Math.max(0, l));
  const cc = Math.max(0, c);
  const hh = ((h % 360) + 360) % 360;
  return `oklch(${round(cl, 4)} ${round(cc, 4)} ${round(hh, 2)})`;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Réduit la chroma et éclaircit/assombrit — sert à dériver une surface douce. */
export function soften(color: Oklch, { l, chromaScale }: { l: number; chromaScale: number }): Oklch {
  return { l, c: color.c * chromaScale, h: color.h };
}

/* -------------------------------------------------------------------------- */
/* Contraste WCAG                                                              */
/* -------------------------------------------------------------------------- */

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** Ratio de contraste WCAG 2.2, de 1:1 à 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;

const WHITE = { r: 1, g: 1, b: 1 };
const BLACK = { r: 0, g: 0, b: 0 };

/**
 * Couleur de texte à poser sur un fond donné : noir ou blanc, au ratio le plus
 * élevé. Retourne aussi le ratio obtenu, pour pouvoir refuser un fond sur
 * lequel AUCUN des deux n'atteint 4,5:1.
 *
 * Théorème utile : pour TOUTE couleur sRGB, le meilleur des deux extrêmes
 * dépasse 4,58:1 — il existe donc toujours un choix conforme, et `passes`
 * reste un garde-fou pour les valeurs hors gamut, pas un cas courant.
 */
export function pickForeground(
  background: Rgb,
  minimum: number = AA_TEXT,
): { color: string; ratio: number; passes: boolean } {
  const onWhite = contrastRatio(background, WHITE);
  const onBlack = contrastRatio(background, BLACK);
  const useWhite = onWhite >= onBlack;
  const ratio = useWhite ? onWhite : onBlack;
  return { color: useWhite ? '#ffffff' : '#000000', ratio: round(ratio, 2), passes: ratio >= minimum };
}
