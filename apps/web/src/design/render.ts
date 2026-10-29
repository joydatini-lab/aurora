import { buildLogo, escapeXml, toSvg as logoToSvg } from './logo.ts';
import { renderOrder, resolvedLines } from './layout.ts';
import type { BrandDNA, Layer, Layout } from './types.ts';

/**
 * Rendu SVG de l'affiche.
 *
 * Deux raisons de le faire en SVG plutôt qu'en canvas :
 *   - le fichier produit est du TEXTE, donc inspectable et diff-able ;
 *   - il ne dépend d'aucun navigateur, ce qui rend le rendu testable.
 *
 * Les coordonnées du modèle sont normalisées : on les multiplie par la taille
 * du canevas exprimée en pixels, choisie par l'appelant. Une seule source de
 * vérité (le JSON de calques), deux sorties (aperçu HTML, export SVG).
 */

export interface RenderOptions {
  /** Largeur du SVG en pixels. La hauteur suit le ratio du canevas. */
  width?: number;
  /** Police de repli si `a_sty.fontFamily` est absent. */
  fallbackFont?: string;
}

function n(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

function renderLayer(layer: Layer, dna: BrandDNA, width: number, height: number): string {
  // `height / width` = ratio du canevas : nécessaire pour recalculer les
  // césures dans la même unité que le modèle (fraction de hauteur).
  const g = layer.a_geo;
  const s = layer.a_sty;
  const x = g.x * width;
  const y = g.y * height;
  const w = g.w * width;
  const h = g.h * height;
  const fill = s.fill ?? 'none';
  const opacity = s.opacity ?? 1;
  const radius = (s.radius ?? 0) * width;

  // `opacity` n'est émis qu'ici : l'ajouter aussi sur les formes produisait un
  // attribut dupliqué, refusé par tout parseur XML.
  const attrs = [
    `id="${layer.id}"`,
    `data-type="${layer.a_sem.type}"`,
    layer.a_sem.role ? `data-role="${layer.a_sem.role}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (layer.a_sem.type === 'text') {
    const fontSize = (s.fontSize ?? 0.05) * height;
    const lineHeight = s.lineHeight ?? 1.15;
    const family = s.fontFamily ?? 'system-ui, sans-serif';
    const anchor = s.align === 'center' ? 'middle' : s.align === 'right' ? 'end' : 'start';
    const anchorX = s.align === 'center' ? x + w / 2 : s.align === 'right' ? x + w : x;

    /*
     * Les césures sont calculées par le modèle, pas par le moteur SVG : sans
     * `tspan`, un `<text>` reste sur une seule ligne et sort du canevas sans
     * qu'aucun parseur ne s'en plaigne. L'aperçu HTML utilise les mêmes lignes.
     */
    const lines = resolvedLines(layer, height / width);
    const spans = (lines.length > 0 ? lines : [''])
      .map(
        (line, index) =>
          `<tspan x="${n(anchorX)}" dy="${index === 0 ? 0 : n(fontSize * lineHeight)}">` +
          `${escapeXml(line)}</tspan>`,
      )
      .join('');

    return [
      `<g ${attrs}>`,
      `<text x="${n(anchorX)}" y="${n(y + fontSize * 0.82)}" font-family="${escapeXml(family)}" ` +
        `font-size="${n(fontSize)}" font-weight="${s.fontWeight ?? 400}" fill="${fill}" ` +
        `text-anchor="${anchor}" xml:space="preserve">`,
      spans,
      '</text>',
      '</g>',
    ].join('');
  }

  if (layer.a_sem.type === 'asset') {
    const logo = buildLogo(dna);
    // Le logo est inséré imbriqué, redimensionné sur sa boîte. `xMidYMid meet`
    // garantit qu'il ne sera jamais déformé, même si la boîte n'est pas carrée.
    return [
      `<svg ${attrs} x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ` +
        `viewBox="${logo.viewBox}" preserveAspectRatio="xMidYMid meet">`,
      logo.layers
        .sort((a, b) => a.o - b.o)
        .map((l) => l.markup)
        .join(''),
      '</svg>',
    ].join('');
  }

  return (
    `<rect ${attrs} x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ` +
    `rx="${n(radius)}" fill="${fill}"${opacity < 1 ? ` opacity="${n(opacity, 3)}"` : ''}/>`
  );
}

/** Sérialise l'affiche entière. L'ordre de rendu vient de `o`, pas du tableau. */
export function posterToSvg(layout: Layout, dna: BrandDNA, options: RenderOptions = {}): string {
  const width = options.width ?? 800;
  const height = width * layout.canvas.ratio;

  const body = renderOrder(layout)
    .map((layer) => renderLayer(layer, dna, width, height))
    .join('\n  ');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" ` +
      `viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escapeXml(dna.brief.name)}">`,
    `  <rect width="100%" height="100%" fill="${layout.canvas.bg}"/>`,
    `  ${body}`,
    '</svg>',
  ].join('\n');
}

/**
 * Détecte les attributs dont la valeur est cassée par un guillemet non échappé.
 *
 * Cas réel rencontré : une pile de polices contenant `"Segoe UI"` insérée telle
 * quelle ferme l'attribut au milieu, et tout parseur XML rejette le document.
 * Un `inspectSvg` qui ne compte que les balises ne voit pas ce défaut.
 */
export function findMalformedAttributes(svg: string): string[] {
  const issues: string[] = [];
  let index = svg.indexOf('="');
  while (index !== -1) {
    const end = svg.indexOf('"', index + 2);
    if (end === -1) {
      issues.push(`attribut non terminé à l’offset ${index}`);
      break;
    }
    const next = svg[end + 1] ?? '';
    // Après la fermeture d'un attribut, seuls un espace, `>` ou `/` sont
    // légitimes. Une lettre signifie qu'on a fermé trop tôt.
    if (next && !/[\s/>]/.test(next)) {
      issues.push(`guillemet non échappé près de « ${svg.slice(index + 2, end + 12).trim()} »`);
    }
    index = svg.indexOf('="', end + 1);
  }

  const unescapedAmp = svg.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (unescapedAmp) issues.push('« & » non échappé dans le document');

  return issues;
}

/** Contrôle structurel minimal : le SVG produit doit être équilibré en balises. */
export function inspectPosterSvg(svg: string): string[] {
  const issues: string[] = findMalformedAttributes(svg);
  if (!svg.startsWith('<svg')) issues.push('le document ne commence pas par <svg');
  if (!svg.trimEnd().endsWith('</svg>')) issues.push('balise <svg> non fermée');

  for (const tag of ['svg', 'text', 'rect', 'g']) {
    const open = (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
    const selfClosed = (svg.match(new RegExp(`<${tag}[^>]*/>`, 'g')) ?? []).length;
    const close = (svg.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    if (open !== selfClosed + close) {
      issues.push(`balises <${tag}> déséquilibrées : ${open} ouvertes, ${selfClosed} auto-fermées, ${close} fermées`);
    }
  }

  if (/\bNaN\b|\bundefined\b/.test(svg)) issues.push('valeur non finie dans le document');
  return issues;
}

export { logoToSvg };
