/**
 * L3 — les tokens de layout du shell web (§5 de
 * `docs/frontend/web-shell-and-responsive.md`, OQ-6 tranchée).
 *
 * Ils n'existaient nulle part avant ce lot : `packages/ui/tailwind.config.ts`
 * ne déclare ni `screens` ni token de layout. Ils sont déclarés ici comme
 * valeurs SÉMANTIQUES et consommés par Tailwind (`apps/web-app/tailwind.config.ts`)
 * — jamais une valeur en dur dans un composant (« Any hardcoded value outside
 * a token = blocking finding », `docs/design-system/overview.md` §2).
 *
 * Ce module est la source unique côté TypeScript : les tests l'importent et
 * vérifient que le preset Tailwind ne peut pas dériver sans que ceci change.
 */

/** Les 5 paliers de largeur (§2.2). L'échelle est celle de Tailwind par défaut. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Le mode d'affichage dérivé de la largeur (§2.2). Un écran ne teste JAMAIS la
 * largeur lui-même : il déclare son gabarit, le shell applique l'arrangement.
 */
export type LayoutMode =
  | 'phone'
  | 'phone-large'
  | 'tablet'
  | 'desktop'
  | 'wide'
  | 'wide-plus';

/** Largeur (px) → mode. `lg` = 1024 est le seuil structurant (1 → 2 panneaux). */
export function modeForWidth(width: number): LayoutMode {
  if (width >= BREAKPOINTS['2xl']) return 'wide-plus';
  if (width >= BREAKPOINTS.xl) return 'wide';
  if (width >= BREAKPOINTS.lg) return 'desktop';
  if (width >= BREAKPOINTS.md) return 'tablet';
  if (width >= BREAKPOINTS.sm) return 'phone-large';
  return 'phone';
}

/** La navigation primaire change de forme par mode (§3.3, contrat C1). */
export type NavForm = 'tabbar' | 'rail' | 'sidebar';

export function navFormForMode(mode: LayoutMode): NavForm {
  if (mode === 'phone' || mode === 'phone-large') return 'tabbar';
  if (mode === 'tablet') return 'rail';
  return 'sidebar';
}

/** Nombre de panneaux de contenu que le mode autorise (§2.2). */
export function panelCountForMode(mode: LayoutMode): 1 | 2 | 3 {
  switch (mode) {
    case 'phone':
    case 'phone-large':
      return 1;
    case 'tablet':
    case 'desktop':
      return 2;
    default:
      return 3;
  }
}

/**
 * Tokens de layout (§5). Chaque valeur est un nombre de pixels : les tests
 * comparent directement, et Tailwind les reprend dans son `theme.extend`.
 */
export const LAYOUT_TOKENS = {
  rail: 240,
  railCollapsed: 64,
  panelMin: 360,
  inspector: 360,
  readingMax: 720,
  contentMax: 1280,
  gutter: 24,
  gutterLg: 32,
  tabbar: 56,
} as const;

export type LayoutToken = keyof typeof LAYOUT_TOKENS;

/**
 * Gouttière par palier (§5 : 16 / 24 / 24 / 32 / 32). `phone` et `phone-large`
 * partagent 16 px — la référence §4.3 veut que la navigation se compacte, pas
 * que la marge disparaisse.
 */
export function gutterForMode(mode: LayoutMode): number {
  switch (mode) {
    case 'phone':
    case 'phone-large':
      return 16;
    case 'tablet':
    case 'desktop':
      return LAYOUT_TOKENS.gutter;
    default:
      return LAYOUT_TOKENS.gutterLg;
  }
}

/**
 * Le contenu long est plafonné (§2.2 : « lire sur 2 m de large est illisible »).
 * Au-delà de `lg`, la largeur de lecture ne grandit plus.
 */
export function readingMaxForMode(mode: LayoutMode): number {
  return mode === 'phone' || mode === 'phone-large'
    ? Number.POSITIVE_INFINITY
    : LAYOUT_TOKENS.readingMax;
}
