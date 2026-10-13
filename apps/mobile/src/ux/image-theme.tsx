/**
 * image-theme.tsx — image-theme consumer layer (05 §5.4-annexe, 10-07).
 *
 * The catalog (packages/ui IMAGE_THEMES + resolveImageThemeFile) is data;
 * THIS is the wiring: the chosen theme (ui-state, persisted) becomes
 *   1. a full-screen BACKGROUND of the app — the image itself is the
 *      canvas (ni teinte, ni flouté, §5.4-annexe) + a style-driven
 *      readability scrim (token --aurora-bg-image-scrim) behind the
 *      content;
 *   2. an ACCENT source: the theme's « chromatic anchor » overrides the
 *      accent variables (--aurora-accent-*) ON TOP of the active color
 *      theme (AD-17: the image is a skin — the neutral canvas values and
 *      the semantic states success/warning/danger/info NEVER move).
 *
 * Unknown slugs / 'none' → every override is removed (the color theme
 * regains control, honest state, never a crash). The image file is
 * served from `apps/mobile/public/themes/` (52 files, batch 2026-10-B);
 * orientation is tracked live (landscape → `paysage` variant, fallback
 * portrait — resolveImageThemeFile, catalog-only rule).
 *
 * POLICE DE L'UI (2026-10-10) : le thème COULEUR et le thème IMAGE sont
 * EXCLUSIFS — l'utilisateur n'en a qu'UN actif à la fois (1 SSoT).
 * Quand `auroraTheme !== 'auto'` (un thème couleur est explicitement
 * choisi), le thème image est inactif : le <AuroraThemeProvider> du
 * main.tsx pilote les accents, l'image ne les surécrit plus (le fond
 * image reste affiché tant que le store le porte, mais les accents
 * suivent le thème couleur). Le layer image n'est actif que si
 * `auroraTheme === 'auto'` (le thème couleur est le par défaut).
 */
import { useEffect, useState } from 'react';
import {
  NEUTRAL_STYLES,
  accentInk,
  getImageTheme,
  resolveImageThemeFile,
} from '@aurora/ui';
import { useUiStateStore } from '../state/ui-state';

/** The CSS variables the layer owns (removed on 'none' / unmount). */
const LAYER_VARS = [
  '--aurora-bg-image',
  '--aurora-accent-primary',
  '--aurora-accent-secondary',
  '--aurora-accent-punctual',
  '--aurora-accent-focus-ring',
  '--aurora-accent-on-primary',
] as const;

export function ImageThemeLayer() {
  const imageTheme = useUiStateStore((s) => s.auroraImageTheme);
  const colorTheme = useUiStateStore((s) => s.auroraTheme);
  const rawStyle = useUiStateStore((s) => s.theme);
  // A7 (main.tsx): DARK only when explicitly chosen — 'auto' = light.
  const style = rawStyle === 'dark' ? 'dark' : 'light';

  // POLICE DE L'UI (2026-10-10) : le thème COULEUR et le thème IMAGE sont
  // EXCLUSIFS (1 seul SSoT à la fois). Quand l'utilisateur a choisi un
  // thème couleur explicite (≠ 'auto'), c'est LA couleur qui pilote les
  // accents — le thème image, même s'il est encore sélectionné dans le
  // store, ne doit PLUS écraser l'accent du thème couleur. La condition
  // ci-dessous : le thème image n'est actif QUE si :
  //   1. le store porte une image (≠ 'none'), ET
  //   2. l'utilisateur n'a PAS choisi de thème couleur explicite.
  // Le fond image reste affiché (le body), mais les accents passent au
  // thème couleur (le <AuroraThemeProvider> du main.tsx écrit les
  // --aurora-accent-*, l'image ne les surécrivra plus ici).
  const imageActive = imageTheme !== 'none' && colorTheme === 'auto';

  const [landscape, setLandscape] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(orientation: landscape)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = (e: MediaQueryListEvent) => setLandscape(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const doc = document.documentElement;
    const orientation = landscape ? 'landscape' : 'portrait';
    const entry = imageActive ? getImageTheme(imageTheme) : undefined;
    const file = entry ? resolveImageThemeFile(entry.slug, orientation) : undefined;

    if (!entry || !file) {
      // 'none' / unknown slug / thème couleur actif : le thème couleur
      // reprend le plein contrôle des accents (AD-17, police UI 10-10 :
      // les deux systèmes sont exclusifs). On retire toutes les overrides
      // du layer image (pas seulement les 6 accent : la `--aurora-bg-image`
      // aussi, sinon le fond image resterait affiché).
      for (const v of LAYER_VARS) doc.style.removeProperty(v);
      doc.style.removeProperty('--aurora-bg-image');
      delete doc.dataset.auroraImageTheme;
      return;
    }

    const neutral = NEUTRAL_STYLES[style];
    const anchor = entry.anchorColor;
    const styleInk = neutral['text-primary'];
    // Pure palettes (owner 10-07): the opposite ink is pure black / pure white.
    const oppositeInk = style === 'dark' ? '#000000' : '#FFFFFF';

    doc.dataset.auroraImageTheme = entry.slug;
    doc.style.setProperty('--aurora-bg-image', `url("/themes/${file}")`);
    doc.style.setProperty('--aurora-accent-primary', anchor);
    doc.style.setProperty('--aurora-accent-secondary', anchor);
    doc.style.setProperty('--aurora-accent-punctual', anchor);
    doc.style.setProperty('--aurora-accent-focus-ring', anchor);
    // Readable ink over the anchor accent (WCAG auto-pick, 05 §5.4.1).
    doc.style.setProperty('--aurora-accent-on-primary', accentInk(anchor, styleInk, oppositeInk));

    // The image IS the canvas: painted by the CSS pseudo-element
    // `html[data-aurora-image-theme]::before` (tokens.css) — NOT the body
    // background. A body-level `background-attachment: fixed` is
    // unreliable in Ionic/Capacitor webviews (the image stayed confined /
    // missing behind the content, only the chrome seemed to change). The
    // `fixed` pseudo-element on <html> is standard-painted, covers the full
    // viewport regardless of scroll height, and carries the same
    // readability scrim (--aurora-bg-image-scrim). It activates ONLY while
    // `data-aurora-image-theme` is present, so 'none' / unknown slug = the
    // pseudo-element disappears with the attribute (no manual reset needed).

    return () => {
      for (const v of LAYER_VARS) doc.style.removeProperty(v);
      doc.style.removeProperty('--aurora-bg-image');
      delete doc.dataset.auroraImageTheme;
    };
  }, [imageTheme, imageActive, landscape, style, colorTheme]);

  // Headless: the layer writes CSS variables / body background only.
  return null;
}
