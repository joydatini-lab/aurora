import { buildPalette, seedHue, templateForStyle } from './harmony.ts';
import {
  fourni,
  inconnu,
  propose,
  type BrandDNA,
  type BrandStrategy,
  type Brief,
  type Grid,
  type HarmonyTemplate,
  type StyleCategory,
  type Typography,
  type TypographyRole,
} from './types.ts';

/**
 * Proposition de Brand DNA à partir d'un brief.
 *
 * C'est le rôle dévolu à l'IA dans l'architecture (« interprète, propose »).
 * Ici, la proposition est produite par des RÈGLES déterministes : le même brief
 * donne toujours les mêmes trois directions. Ce choix a deux raisons :
 *
 *   1. aucun modèle n'est joignable depuis l'environnement d'exécution ;
 *   2. une proposition reproductible est vérifiable — on peut la comparer,
 *      la versionner, la tester. Une sortie de LLM sans trace ne l'est pas.
 *
 * Le provider HTTP (voir `ai/provider.ts`) implémente le même contrat : le jour
 * où un modèle est disponible, il remplace les règles sans toucher à l'écran.
 */

const STYLE_KEYWORDS: Array<[StyleCategory, string[]]> = [
  ['Tech', ['tech', 'numérique', 'numerique', 'ia', 'logiciel', 'saas', 'data']],
  ['Professional', ['institutionnel', 'corporate', 'conseil', 'juridique', 'finance', 'b2b']],
  ['Elegant', ['luxe', 'élégant', 'elegant', 'premium', 'artisanal', 'haut de gamme']],
  ['Playful', ['ludique', 'jeune', 'coloré', 'colore', 'enfant', 'festif']],
  ['Bold', ['audacieux', 'direct', 'sport', 'impact', 'manifeste']],
  ['Organic', ['nature', 'bio', 'durable', 'agricole', 'santé', 'sante', 'bien-être']],
  ['Minimal', ['minimal', 'sobre', 'épuré', 'epure', 'essentiel']],
];

/** Police système uniquement : aucun webfont n'est chargé (voir CONTRAINTES). */
const FONT_BY_STYLE: Record<StyleCategory, string> = {
  Tech: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  Professional: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  Elegant: 'ui-serif, Georgia, "Times New Roman", serif',
  Playful: 'ui-rounded, "Segoe UI", system-ui, sans-serif',
  Bold: 'ui-sans-serif, system-ui, "Arial Black", sans-serif',
  Organic: 'ui-serif, "Iowan Old Style", Georgia, serif',
  Minimal: 'ui-sans-serif, system-ui, "Helvetica Neue", sans-serif',
};

const GRID_BY_STYLE: Record<StyleCategory, Grid> = {
  Tech: { columns: 12, margins: 0.06, gutter: 0.02 },
  Professional: { columns: 12, margins: 0.07, gutter: 0.02 },
  Elegant: { columns: 12, margins: 0.09, gutter: 0.025 },
  Playful: { columns: 8, margins: 0.05, gutter: 0.03 },
  Bold: { columns: 6, margins: 0.045, gutter: 0.035 },
  Organic: { columns: 12, margins: 0.08, gutter: 0.022 },
  Minimal: { columns: 12, margins: 0.1, gutter: 0.02 },
};

export function detectStyleCategory(brief: Brief): StyleCategory {
  const haystack = `${brief.sector} ${brief.offer} ${brief.tone.join(' ')}`.toLowerCase();
  // Correspondance sur MOTS ENTIERS. En sous-chaîne, le mot-clé « ia »
  // matchait « transition », « spécialisé » ou « social » : une marque
  // d'agriculture biologique était classée « Tech ». Un mot-clé court exige
  // une frontière, sinon il capture tout.
  const words = new Set(haystack.split(/[^a-zà-ÿ0-9]+/).filter(Boolean));
  for (const [style, keywords] of STYLE_KEYWORDS) {
    if (keywords.some((k) => (k.length <= 4 ? words.has(k) : haystack.includes(k)))) return style;
  }
  // Aucune correspondance : on ne prétend pas deviner. « Minimal » est le
  // choix le moins engageant, et la provenance reste « proposé ».
  return 'Minimal';
}

/**
 * Trois directions réellement différentes.
 *
 * Le gabarit d'harmonie et l'orientation changent : sans cela, « trois
 * directions » ne seraient que trois noms sur la même palette — ce que le
 * document interdit explicitement (§6.3, étape 5 : « plusieurs options
 * différenciées et leurs compromis »).
 */
const DIRECTIONS: Array<{
  name: string;
  template: HarmonyTemplate;
  orientation: number;
  rationale: string;
}> = [
  {
    name: 'Sobre & institutionnel',
    template: 'analogue',
    orientation: 0,
    rationale:
      'Teintes voisines, contrastes doux : la direction la plus facile à décliner sur des documents internes et des supports papier.',
  },
  {
    name: 'Contrasté & direct',
    template: 'complementaire-divisee',
    orientation: 20,
    rationale:
      'Une complémentaire divisée donne un accent franc sans agressivité ; lisible en petit format comme sur une affiche.',
  },
  {
    name: 'Affirmé & éditorial',
    template: 'triadique',
    orientation: -15,
    rationale:
      'Trois familles de teintes : plus de latitude pour hiérarchiser une charte longue, au prix d’une discipline plus stricte.',
  },
];

export function proposeDirections(brief: Brief): BrandDNA[] {
  const style = detectStyleCategory(brief);
  const preferred = templateForStyle(style);
  const baseHue = seedHue(`${brief.name}|${brief.sector}|${brief.offer}`);

  // La direction préférée par le style passe en premier, les deux autres
  // suivent : l'ordre porte une recommandation, il n'est pas décoratif.
  const ordered = [...DIRECTIONS].sort((a, b) => {
    if (a.template === preferred) return -1;
    if (b.template === preferred) return 1;
    return 0;
  });

  return ordered.map((direction, index) =>
    buildDna(brief, style, baseHue, direction, index + 1),
  );
}

function buildDna(
  brief: Brief,
  style: StyleCategory,
  baseHue: number,
  direction: (typeof DIRECTIONS)[number],
  version: number,
): BrandDNA {
  const palette = buildPalette(baseHue, direction.template, direction.orientation);
  // Une seule source pour la typographie et la grille : les règles et l'IA
  // doivent produire des chartes comparables, sinon on ne peut pas les juger
  // sur le même validateur.
  const typography = typographyFor(style);
  const grid = gridFor(style);
  const strategy = buildStrategy(brief, style);

  return {
    id: `dna-${slug(brief.name)}-${direction.template}`,
    version,
    createdAt: new Date(0).toISOString(),
    brief,
    strategy,
    palette,
    typography,
    grid,
    directionName: direction.name,
    rationale: direction.rationale,
  };
}

/**
 * Stratégie : ce qui est fourni reste fourni, ce qui est déduit est proposé,
 * ce qui manque reste inconnu. Aucune phrase de marché n'est inventée comme un
 * fait (Référence produit §6.2, dernier paragraphe).
 */
export function buildStrategy(brief: Brief, style: StyleCategory): BrandStrategy {
  const hasOffer = brief.offer.trim().length > 0;
  const hasAudience = brief.audience.trim().length > 0;
  const hasSector = brief.sector.trim().length > 0;

  return {
    promise: hasOffer
      ? fourni(firstSentence(brief.offer))
      : inconnu<string>(),
    positioning: hasSector
      ? propose(
          `Acteur ${brief.sector.trim().toLowerCase()}, positionné sur ${hasOffer ? firstSentence(brief.offer).toLowerCase() : 'une offre à préciser'}.`,
          'déduction : secteur + offre du brief',
        )
      : inconnu<string>(),
    audience: hasAudience ? fourni(brief.audience.trim()) : inconnu<string>(),
    personality: brief.tone.length
      ? fourni(brief.tone)
      : propose(keywordsFor(style), 'déduction : catégorie de style'),
    vocabulary: propose(vocabularyFor(style), 'déduction : catégorie de style'),
    styleCategory: propose(style, 'déduction : mots-clés du brief'),
  };
}

/** Polices et grille d'une catégorie : partagées par les règles et par l'IA. */
export function typographyFor(style: StyleCategory): Typography {
  const font = FONT_BY_STYLE[style];
  return {
    titre: { font, weight: weightFor(style), sizeScale: 1 },
    sousTitre: { font, weight: 600, sizeScale: 0.62 },
    corps: { font, weight: 400, sizeScale: 0.4 },
    note: { font, weight: 400, sizeScale: 0.3 },
  };
}

export function gridFor(style: StyleCategory): Grid {
  return GRID_BY_STYLE[style];
}

export function weightFor(style: StyleCategory): TypographyRole['weight'] {
  switch (style) {
    case 'Bold':
      return 900;
    case 'Playful':
      return 800;
    case 'Elegant':
      return 600;
    case 'Minimal':
    case 'Tech':
      return 700;
    default:
      return 800;
  }
}

function keywordsFor(style: StyleCategory): string[] {
  const map: Record<StyleCategory, string[]> = {
    Tech: ['précis', 'factuel', 'direct'],
    Professional: ['fiable', 'clair', 'structuré'],
    Elegant: ['sobre', 'raffiné', 'patient'],
    Playful: ['spontané', 'chaleureux', 'vivant'],
    Bold: ['franc', 'engagé', 'net'],
    Organic: ['ancré', 'naturel', 'durable'],
    Minimal: ['essentiel', 'silencieux', 'lisible'],
  };
  return map[style];
}

function vocabularyFor(style: StyleCategory): string[] {
  const map: Record<StyleCategory, string[]> = {
    Tech: ['système', 'mesure', 'précision'],
    Professional: ['accompagnement', 'méthode', 'résultat'],
    Elegant: ['geste', 'matière', 'durée'],
    Playful: ['envie', 'découverte', 'ensemble'],
    Bold: ['cap', 'preuve', 'terrain'],
    Organic: ['sol', 'cycle', 'juste'],
    Minimal: ['espace', 'essentiel', 'silence'],
  };
  return map[style];
}

function firstSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  const cut = trimmed.split(/(?<=[.!?])\s/)[0] ?? trimmed;
  return cut.length > 140 ? `${cut.slice(0, 137)}…` : cut;
}

export function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'marque';
}
