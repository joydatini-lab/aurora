import { parseColor, pickForeground } from '../theme/color.ts';
import { slug } from './brand.ts';
import { seedHue } from './harmony.ts';
import type { BrandDNA } from './types.ts';

/**
 * Logo vectoriel STRUCTURÉ.
 *
 * Le point du document (LOGO §3.1, §5.1) : un logo n'est pas une image, c'est
 * une pile de calques identifiables avec un ordre de rendu explicite. Chaque
 * calque porte une description sémantique, pour qu'une reprise soit possible.
 *
 * Limite assumée et affichée dans l'interface : le lettrage utilise `<text>`,
 * donc dépend de la police disponible. La conversion texte → chemins
 * (LOGO §3.6) n'est pas implémentée ; l'export n'est donc pas encore
 * « indépendant de la police ».
 */

export interface LogoLayer {
  id: string;
  /** Description sémantique (LOGO §5.2, nœuds du graphe de couches). */
  description: string;
  /** Élément SVG déjà sérialisé. */
  markup: string;
  o: number;
}

export interface LogoArtifact {
  id: string;
  name: string;
  viewBox: string;
  layers: LogoLayer[];
}

export type LogoVariant = 'monogramme' | 'complet';

/** Construction géométrique choisie par le nom — déterministe, jamais aléatoire. */
type Backplate = 'cercle' | 'carre-arrondi' | 'losange';

const PLATES: Backplate[] = ['cercle', 'carre-arrondi', 'losange'];

function pickPlate(seed: string): Backplate {
  return PLATES[seedHue(seed) % PLATES.length]!;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function plateMarkup(plate: Backplate, fill: string): string {
  const cx = 32;
  const cy = 32;
  if (plate === 'cercle') {
    return `<circle cx="${cx}" cy="${cy}" r="30" fill="${fill}"/>`;
  }
  if (plate === 'losange') {
    return `<path d="M ${cx} 2 L 62 ${cy} L ${cx} 62 L 2 ${cy} Z" fill="${fill}"/>`;
  }
  return `<rect x="2" y="2" width="60" height="60" rx="16" fill="${fill}"/>`;
}

/**
 * Construit le logo. `variant` change la composition, pas le style : la
 * déclinaison doit rester reconnaissable.
 */
export function buildLogo(dna: BrandDNA, variant: LogoVariant = 'monogramme'): LogoArtifact {
  const [, accent, clair, profond] = dna.palette.colors;
  const initial = (dna.brief.name.trim()[0] ?? 'A').toUpperCase();
  const plate = pickPlate(dna.brief.name || 'aurora');

  /*
   * La pastille prend l'ACCENT, pas la dominante : sur une affiche dont le
   * bandeau de pied est déjà en dominante, un logo de la même couleur
   * disparaît. L'accent garantit qu'il se détache sur le fond comme sur le
   * bandeau.
   */
  const plateLayer: LogoLayer = {
    id: 'logo-fond',
    description: `Fond du monogramme (${plate}), couleur d’accent`,
    markup: plateMarkup(plate, accent),
    o: 1,
  };

  const letterLayer: LogoLayer = {
    id: 'logo-lettre',
    description: `Initiale « ${initial} » — lettrage dépendant de la police`,
    markup:
      `<text x="32" y="41" text-anchor="middle" font-family="${escapeXml(dna.typography.titre.font)}" ` +
      `font-size="30" font-weight="${dna.typography.titre.weight}" fill="${pickForeground(parseColor(accent)).color}">${escapeXml(initial)}</text>`,
    o: 2,
  };

  const barLayer: LogoLayer = {
    id: 'logo-accent',
    description: 'Barre d’accent — repère de marque',
    markup: `<rect x="40" y="47" width="14" height="3.5" rx="1.75" fill="${clair}"/>`,
    o: 3,
  };

  const layers = [plateLayer, letterLayer, barLayer];

  if (variant === 'complet') {
    layers.push({
      id: 'logo-wordmark',
      description: 'Nom de marque en accompagnement du monogramme',
      markup:
        `<text x="70" y="38" font-family="${escapeXml(dna.typography.titre.font)}" font-size="14" ` +
        `font-weight="${dna.typography.titre.weight}" fill="${profond}">${escapeXml(dna.brief.name)}</text>`,
      o: 4,
    });
  }

  return {
    id: `logo-${slug(dna.brief.name)}-${variant}`,
    name: dna.brief.name || 'Sans nom',
    // Le viewBox s'élargit avec le wordmark, pas avec la variante monogramme.
    viewBox: variant === 'complet' ? '0 0 200 64' : '0 0 64 64',
    layers: layers.sort((a, b) => a.o - b.o),
  };
}

/** Sérialise en SVG valide. Les calques sont triés par ordre de rendu. */
export function toSvg(artifact: LogoArtifact, options: { background?: string } = {}): string {
  const groups = [...artifact.layers]
    .sort((a, b) => a.o - b.o)
    .map(
      (layer) =>
        `  <g id="${layer.id}" data-description="${escapeXml(layer.description)}">${layer.markup}</g>`,
    )
    .join('\n');

  const backdrop = options.background
    ? `  <rect width="100%" height="100%" fill="${options.background}"/>\n`
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${artifact.viewBox}" role="img" aria-label="${escapeXml(artifact.name)}">`,
    backdrop + groups,
    '</svg>',
  ].join('\n');
}

/** `data:` URL pour un aperçu `<img>` sans requête réseau. */
export function toDataUrl(artifact: LogoArtifact): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(artifact))}`;
}

/* -------------------------------------------------------------------------- */
/* Contrôle structurel                                                         */
/* -------------------------------------------------------------------------- */

export interface SvgIssue {
  layerId: string | null;
  message: string;
}

/**
 * Vérification structurelle du SVG produit.
 *
 * Elle ne juge pas l'esthétique : elle détecte ce qui casse un export —
 * identifiants dupliqués, coordonnées non finies, calque vide. C'est le
 * « render-and-verify » minimal qu'on peut faire sans navigateur.
 */
export function inspectSvg(artifact: LogoArtifact): SvgIssue[] {
  const issues: SvgIssue[] = [];
  const ids = new Set<string>();

  for (const layer of artifact.layers) {
    if (ids.has(layer.id)) {
      issues.push({ layerId: layer.id, message: `identifiant de calque dupliqué : ${layer.id}` });
    }
    ids.add(layer.id);

    if (!layer.markup.trim()) {
      issues.push({ layerId: layer.id, message: 'calque vide' });
    }
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(layer.markup)) {
      issues.push({ layerId: layer.id, message: 'valeur numérique non finie dans le balisage' });
    }
    if (!/<(circle|rect|path|text|g)[\s>]/.test(layer.markup)) {
      issues.push({ layerId: layer.id, message: 'aucune primitive SVG reconnue' });
    }
  }

  const nameLayer = artifact.layers.every((l) => l.o >= 1);
  if (!nameLayer) {
    issues.push({ layerId: null, message: "l'ordre de rendu doit commencer à 1" });
  }

  return issues;
}

export { round };
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
