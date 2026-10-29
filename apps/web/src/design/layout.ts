import { parseColor, pickForeground } from '../theme/color.ts';
import { slug } from './brand.ts';
import type { BrandDNA, Layer, Layout } from './types.ts';

/**
 * Génération d'une affiche sous forme de CALQUES.
 *
 * Une affiche n'est pas une image : c'est un JSON de calques avec géométrie,
 * style et ordre de rendu. Tout ce qui suit reste donc éditable à la main.
 *
 * CONVENTION DE COORDONNÉES (AFFICHE §5.1)
 * ----------------------------------------
 * `x`, `y`, `w`, `h` sont normalisés dans [0,1] **par rapport à leur propre
 * axe** : `x`/`w` en fraction de largeur, `y`/`h` en fraction de hauteur. Le
 * rapport hauteur/largeur vit dans `canvas.ratio`, jamais dans les coordonnées.
 *
 * TYPOGRAPHIE
 * -----------
 * `a_sty.fontSize` est une fraction de la HAUTEUR du canevas. Le corps n'est
 * jamais choisi à la main : il est résolu pour que le texte tienne, après
 * césure, dans la boîte du calque (`fitText`). Les césures sont calculées, pas
 * laissées au moteur de rendu : l'export SVG et l'aperçu HTML doivent couper
 * exactement au même endroit, sinon l'aperçu ment sur le résultat.
 */

export interface PosterFormat {
  id: string;
  label: string;
  /** Rapport hauteur / largeur. A4 portrait = 297 / 210 ≈ 1,414. */
  ratio: number;
}

export const POSTER_FORMATS: PosterFormat[] = [
  { id: 'a4', label: 'A4 portrait', ratio: 297 / 210 },
  { id: 'carre', label: 'Carré', ratio: 1 },
  { id: 'story', label: 'Story 9:16', ratio: 16 / 9 },
];

/* -------------------------------------------------------------------------- */
/* Césure et ajustement typographique                                          */
/* -------------------------------------------------------------------------- */

/**
 * Avance moyenne d'un caractère, en em.
 *
 * Volontairement HAUTE, avec une marge de sécurité. Mesuré à la rastérisation :
 * une graisse 800 sur une grotesque large atteint 0,75 em de moyenne, et une
 * estimation à 0,62 faisait sortir « Maison » du canevas — sans qu'aucun
 * contrôle ne le voie, puisque le validateur utilisait la même estimation.
 *
 * Un corps un peu trop petit est un défaut visible et réparable ; un
 * débordement hors du support est une faute. On choisit le défaut réparable.
 * Seule la conversion du lettrage en chemins (LOGO §3.6) supprimera cette
 * approximation, puisqu'elle seule connaît les largeurs réelles des glyphes.
 */
const SAFETY = 1.04;

export function estimateAdvance(fontWeight = 400): number {
  const base = fontWeight >= 700 ? 0.74 : fontWeight >= 500 ? 0.68 : 0.6;
  return base * SAFETY;
}

/** Largeur estimée d'une chaîne, en fraction de largeur du canevas. */
function widthOf(value: string, size: number, advance: number): number {
  return value.length * advance * size;
}

/**
 * Césure gloutonne, SANS couper les mots.
 *
 * Découper un mot pour « faire tenir » un texte produit exactement ce que la
 * rastérisation a montré : « Maiso / n / Kora » sur une affiche. Un mot qui ne
 * tient pas n'est pas un problème de césure, c'est un problème de corps — c'est
 * à l'ajustement de réduire, pas au découpage de masquer.
 */
function greedyLines(
  words: string[],
  maxWidth: number,
  size: number,
  advance: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && widthOf(candidate, size, advance) > maxWidth) {
      lines.push(current);
      current = word;
      continue;
    }
    current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Vrai si chaque ligne tient dans la largeur donnée. */
function linesFit(lines: string[], maxWidth: number, size: number, advance: number): boolean {
  return lines.every((line) => widthOf(line, size, advance) <= maxWidth + 1e-9);
}

/**
 * Césure de RENDU : identique à la césure de calcul, sauf pour un mot
 * invraisemblablement long (URL, identifiant), qu'on coupe faute de pouvoir
 * rétrécir indéfiniment — et que le validateur signale alors.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  size: number,
  advance: number,
): string[] {
  const lines = greedyLines(splitWords(text), maxWidth, size, advance);
  return lines.flatMap((line) =>
    widthOf(line, size, advance) <= maxWidth + 1e-9 || line.length <= 3
      ? [line]
      : breakLongWord(line, maxWidth, advance, size),
  );
}

function breakLongWord(word: string, maxWidth: number, advance: number, size: number): string[] {
  const perLine = Math.max(3, Math.floor(maxWidth / (advance * size)));
  const parts: string[] = [];
  for (let i = 0; i < word.length; i += perLine) parts.push(word.slice(i, i + perLine));
  return parts;
}

export interface FittedText {
  /** Fraction de hauteur du canevas. */
  fontSize: number;
  lines: string[];
}

/**
 * Résout le plus grand corps tel que le texte césuré tienne dans la boîte.
 *
 * Recherche dichotomique plutôt que formule fermée : la formule ignore la
 * césure, et c'est précisément ce qui faisait déborder « Maison Kora » hors de
 * l'affiche.
 */
export function fitText(args: {
  text: string;
  boxW: number;
  boxH: number;
  ratio: number;
  fontWeight?: number;
  lineHeight?: number;
  /** Corps minimal acceptable, en fraction de hauteur. */
  min?: number;
  /** Plafond, pour tenir une échelle typographique. */
  max?: number;
}): FittedText {
  const { text, boxW, boxH, ratio } = args;
  const lineHeight = args.lineHeight ?? 1.15;
  const advance = estimateAdvance(args.fontWeight ?? 400);
  const min = args.min ?? 0.008;
  const words = splitWords(text);

  const fitsAt = (size: number): { ok: boolean; lines: string[] } => {
    const sizeInWidthUnits = size * ratio;
    const lines = greedyLines(words, boxW, sizeInWidthUnits, advance);
    const usedHeight = lines.length * sizeInWidthUnits * lineHeight;
    const ok =
      linesFit(lines, boxW, sizeInWidthUnits, advance) && usedHeight <= boxH * ratio + 1e-9;
    return { ok, lines };
  };

  // Bornes exprimées en fraction de HAUTEUR.
  let low = min;
  let high = Math.max(min, Math.min(boxH, args.max ?? boxH));
  let best: FittedText = { fontSize: min, lines: fitsAt(min).lines };

  for (let i = 0; i < 28; i += 1) {
    const size = (low + high) / 2;
    const { ok, lines } = fitsAt(size);
    if (ok) {
      best = { fontSize: size, lines };
      low = size;
    } else {
      high = size;
    }
    if (high - low < 1e-5) break;
  }

  return best;
}

/**
 * Recalcule les lignes d'un calque existant, avec le corps déjà inscrit dans
 * son style. Utilisé par tous les rendus pour que les césures coïncident.
 */
export function resolvedLines(layer: Layer, ratio: number): string[] {
  if (layer.a_sem.type !== 'text') return [];
  return wrapLines(
    layer.a_sem.text ?? '',
    layer.a_geo.w,
    (layer.a_sty.fontSize ?? 0.05) * ratio,
    estimateAdvance(layer.a_sty.fontWeight ?? 400),
  );
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                 */
/* -------------------------------------------------------------------------- */

function baseText(args: {
  id: string;
  text: string;
  role: keyof BrandDNA['typography'];
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
}): Pick<Layer, 'id' | 'a_sem' | 'a_geo' | 'o' | 'M'> & { a_sty: Partial<Layer['a_sty']> } {
  return {
    id: args.id,
    a_sem: { type: 'text', text: args.text, role: args.role },
    a_geo: { x: args.x, y: args.y, w: args.w, h: args.h, rotation: 0, crop: null, mask: null },
    a_sty: { opacity: 1, align: 'left', lineHeight: 1.15 },
    o: args.order,
    // Un texte généré n'est jamais verrouillé : c'est le premier endroit que
    // l'utilisateur veut corriger.
    M: { lock_x: false, lock_y: false, lock_w: false, lock_h: false, lock_cat: false },
  };
}

/**
 * Construit l'affiche.
 *
 * La séquence suit le corpus (§6.2) : texte → sous-couches → logo. L'ordre de
 * RENDU (`o`) en découle, mais reste explicite : c'est lui qui fait foi, jamais
 * la position dans le tableau.
 */
export function buildPoster(dna: BrandDNA, format: PosterFormat = POSTER_FORMATS[0]!): Layout {
  const [dominante, accent, clair, profond] = dna.palette.colors;
  const R = format.ratio;

  /** Marge horizontale, en fraction de largeur. */
  const margin = dna.grid.margins;
  /** La même marge en hauteur : une marge doit être égale en pixels. */
  const marginV = margin / R;
  /** Convertit une longueur « en % de largeur » en fraction de hauteur. */
  const u = 1 / R;

  const innerW = 1 - margin * 2;
  const onDeep = pickForeground(parseColor(profond)).color;

  const title = dna.brief.name.trim() || 'Sans titre';
  const subtitle = dna.strategy.promise.value ?? dna.brief.offer ?? 'Direction à préciser';
  const body = dna.brief.audience.trim()
    ? `Pour ${dna.brief.audience.trim()}.`
    : 'Public à préciser dans le brief.';

  /* --- rythme vertical, en % de largeur converti en hauteur --------------- */
  const bandH = 0.17 * u; // hauteur du bandeau de pied
  const bandY = 1 - bandH;
  const titleY = marginV + 0.1 * u;
  const titleBudget = bandY - titleY - 0.32 * u;
  const titleFit = fitText({
    text: title,
    boxW: innerW,
    boxH: titleBudget,
    ratio: R,
    fontWeight: dna.typography.titre.weight,
    lineHeight: 1.1,
  });
  /*
   * Échelle typographique explicite : le sous-titre ne dépasse jamais 52 % du
   * titre, le corps 30 %, la mention 22 %. Sans plafond, trois blocs de texte
   * se retrouvent au même corps et la hiérarchie disparaît.
   */
  const MAX_SUB = titleFit.fontSize * 0.34;
  const MAX_BODY = titleFit.fontSize * 0.2;
  const titleH = titleFit.lines.length * titleFit.fontSize * 1.1;
  const pad = 0.022 * u;

  const subtitleY = titleY + titleH + pad + 0.03 * u;
  const subtitleFit = fitText({
    text: subtitle,
    boxW: innerW,
    boxH: bandY - subtitleY - 0.16 * u,
    ratio: R,
    fontWeight: dna.typography.sousTitre.weight,
    lineHeight: 1.25,
    max: MAX_SUB,
  });
  const subtitleH = subtitleFit.lines.length * subtitleFit.fontSize * 1.25;

  const bodyFit = fitText({
    text: body,
    boxW: innerW * 0.7,
    boxH: Math.max(0.05 * u, bandY - subtitleY - subtitleH - 0.22 * u),
    ratio: R,
    fontWeight: dna.typography.corps.weight,
    lineHeight: 1.4,
    max: MAX_BODY,
  });
  const bodyH = bodyFit.lines.length * bodyFit.fontSize * 1.4;
  // Le corps est ancré AU-DESSUS du bandeau : le vide se place entre le
  // sous-titre et lui, et se lit comme une respiration, pas comme un oubli.
  const bodyY = bandY - 0.05 * u - bodyH;

  /** Largeur du logo, en fraction de largeur. */
  const LOGO_W = 0.11;

  const calques: Layer[] = [
    // 1 — fond
    {
      id: 'l-fond',
      a_sem: { type: 'deco' },
      a_geo: { x: 0, y: 0, w: 1, h: 1, rotation: 0, crop: null, mask: null },
      a_sty: { fill: profond, opacity: 1 },
      o: 1,
      M: { lock_x: true, lock_y: true, lock_w: true, lock_h: true, lock_cat: true },
      detail: 'Fond plein. Verrouillé : un raffinement ne doit pas le déplacer.',
    },

    // 2 — bandeau de pied : structure la composition et remplit le bas
    {
      id: 'l-pied',
      a_sem: { type: 'deco' },
      a_geo: { x: 0, y: bandY, w: 1, h: bandH, rotation: 0, crop: null, mask: null },
      a_sty: { fill: dominante, opacity: 1 },
      o: 2,
      M: { lock_x: true, lock_y: true, lock_w: true, lock_h: true, lock_cat: false },
      detail: 'Bandeau de pied. Ancre la marque et équilibre le vide laissé par le texte.',
    },

    // 3 — filet d'accent, à la jonction du bandeau
    {
      id: 'l-filet',
      a_sem: { type: 'deco' },
      a_geo: { x: margin, y: bandY - 0.004 * u, w: innerW * 0.4, h: 0.008 * u, rotation: 0, crop: null, mask: null },
      a_sty: { fill: accent, opacity: 1, radius: 0.004 * u },
      o: 3,
      M: { lock_x: false, lock_y: true, lock_w: false, lock_h: true, lock_cat: false },
      detail: 'Filet d’accent. Sa largeur est libre, sa position non.',
    },

    // 4 — repère de marque en haut
    {
      id: 'l-bandeau',
      a_sem: { type: 'deco' },
      a_geo: { x: margin, y: marginV * 0.55, w: innerW * 0.22, h: 0.01 * u, rotation: 0, crop: null, mask: null },
      a_sty: { fill: accent, opacity: 1, radius: 0.005 * u },
      o: 4,
      M: { lock_x: false, lock_y: true, lock_w: false, lock_h: true, lock_cat: false },
      detail: 'Repère de marque. Largeur libre, position et épaisseur verrouillées.',
    },

    // 5 — sous-couche de lisibilité, dimensionnée sur le texte réel
    {
      id: 'l-underlay',
      a_sem: { type: 'underlay' },
      a_geo: {
        // Alignée sur la marge : la grille est une règle, pas une suggestion.
        // Le débord vertical, lui, est ce qui fait lire la sous-couche comme
        // un fond et non comme un cadre.
        x: margin,
        y: titleY - pad,
        w: innerW,
        h: titleH + pad * 2,
        rotation: 0,
        crop: null,
        mask: null,
      },
      a_sty: { fill: dominante, opacity: 0.5, radius: pad },
      o: 5,
      M: { lock_x: true, lock_y: false, lock_w: true, lock_h: false, lock_cat: false },
      detail: 'Voile sous le titre : garantit le contraste même sur un texte long.',
    },

    // 6 — titre
    {
      ...baseText({ id: 'l-titre', text: title, role: 'titre', x: margin, y: titleY, w: innerW, h: titleH, order: 6 }),
      a_sty: {
        fontFamily: dna.typography.titre.font,
        fontSize: titleFit.fontSize,
        fontWeight: dna.typography.titre.weight,
        fill: onDeep,
        opacity: 1,
        align: 'left',
        lineHeight: 1.1,
      },
    },

    // 7 — sous-titre
    {
      ...baseText({
        id: 'l-soustitre',
        text: subtitle,
        role: 'sousTitre',
        x: margin,
        y: subtitleY,
        w: innerW,
        h: subtitleH,
        order: 7,
      }),
      a_sty: {
        fontFamily: dna.typography.sousTitre.font,
        fontSize: subtitleFit.fontSize,
        fontWeight: dna.typography.sousTitre.weight,
        fill: clair,
        opacity: 0.92,
        align: 'left',
        lineHeight: 1.25,
      },
    },

    // 8 — corps
    {
      ...baseText({
        id: 'l-corps',
        text: body,
        role: 'corps',
        x: margin,
        y: bodyY,
        w: innerW * 0.7,
        h: bodyH,
        order: 8,
      }),
      a_sty: {
        fontFamily: dna.typography.corps.font,
        fontSize: bodyFit.fontSize,
        fontWeight: dna.typography.corps.weight,
        fill: clair,
        opacity: 0.78,
        align: 'left',
        lineHeight: 1.4,
      },
    },

    // 9 — logo, dans le bandeau de pied
    {
      id: 'l-logo',
      a_sem: { type: 'asset', asset: `logo_${slug(dna.brief.name)}` },
      a_geo: {
        // Pour que le logo reste CARRÉ en pixels : h = w / ratio.
        x: 1 - margin - LOGO_W,
        y: bandY + (bandH - LOGO_W / R) / 2,
        w: LOGO_W,
        h: LOGO_W / R,
        rotation: 0,
        crop: null,
        mask: null,
      },
      a_sty: { fill: clair, opacity: 1 },
      o: 9,
      M: { lock_x: true, lock_y: true, lock_w: true, lock_h: true, lock_cat: true },
      detail: 'Signature de marque. Verrouillée : sa position est une règle, pas un choix.',
    },

    // 10 — mention de pied, en vis-à-vis du logo
    {
      ...baseText({
        id: 'l-mention',
        text: dna.brief.sector.trim() || 'Marque',
        role: 'corps',
        x: margin,
        y: bandY + bandH / 2 - 0.02 * u,
        w: innerW - LOGO_W - 0.06 * u,
        h: 0.04 * u,
        order: 10,
      }),
      a_sty: {
        fontFamily: dna.typography.corps.font,
        fontSize: fitText({
          text: dna.brief.sector.trim() || 'Marque',
          boxW: innerW - LOGO_W - 0.06 * u,
          boxH: 0.04 * u,
          ratio: R,
          fontWeight: dna.typography.corps.weight,
          lineHeight: 1.3,
          max: titleFit.fontSize * 0.16,
        }).fontSize,
        fontWeight: dna.typography.corps.weight,
        fill: clair,
        opacity: 0.85,
        align: 'left',
        lineHeight: 1.3,
      },
    },
  ];

  return {
    canvas: { w: 1, h: 1, ratio: R, bg: profond },
    calques,
  };
}

/** Tri par ordre de rendu explicite — jamais par position dans le tableau. */
export function renderOrder(layout: Layout): Layer[] {
  return [...layout.calques].sort((a, b) => a.o - b.o);
}

/** Couleur du texte à poser sur le bandeau de pied, pour l'UI et les exports. */
export function footerForeground(dna: BrandDNA): string {
  return pickForeground(parseColor(dna.palette.colors[0])).color;
}
