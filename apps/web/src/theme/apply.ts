import { toOklchString } from './color';
import type { Palette } from './extract';
import type { ThemePreset } from './presets';

/**
 * Colle entre l'état (preset, palette, fond) et le DOM.
 *
 * Tout passe par des propriétés personnalisées posées en style inline sur
 * `<html>`. Pourquoi pas des classes : un preset, c'est 24 couleurs + un
 * rayon ; générer 240 classes de thème serait à la fois plus lourd et plus
 * fragile qu'une écriture de variables.
 *
 * Les variables sont déclarées `@property` (voir `globals.css`) avec
 * `syntax: '<color>'` : c'est ce qui autorise le navigateur à INTERPOLER
 * entre deux couleurs et donc à faire un fondu de 0,8 s au changement de
 * thème. Sans cet enregistrement, une variable change instantanément.
 */

/** Clés écrites par un preset. `radius` est traité à part. */
const COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const;

function root(): HTMLElement {
  return document.documentElement;
}

/**
 * Applique un preset sur la racine du document.
 *
 * `preset === null` efface les surcharges : la feuille reprend la main et l'on
 * retrouve « Encre & Lumière », le thème par défaut écrit dans `globals.css`.
 * C'est pour cela que le thème maison n'est pas un objet de preset : il n'a
 * pas à être dupliqué pour pouvoir revenir en arrière.
 */
export function applyPreset(preset: ThemePreset | null, mode: 'light' | 'dark'): void {
  const el = root();

  if (!preset) {
    for (const key of COLOR_KEYS) el.style.removeProperty(`--${key}`);
    el.style.removeProperty('--radius');
    // `--tint` n'appartient à aucun preset, mais doit disparaître avec la
    // personnalisation : sinon le voile d'une ancienne image survivrait.
    el.style.removeProperty('--tint');
    el.removeAttribute('data-preset');
    return;
  }

  const colors = preset[mode];
  for (const key of COLOR_KEYS) el.style.setProperty(`--${key}`, colors[key]);
  el.style.setProperty('--radius', preset.radius);
  el.setAttribute('data-preset', preset.id);
}

/**
 * Applique la palette extraite d'une image.
 *
 * Trois variables sémantiques, comme demandé : `--primary`, `--ring`,
 * `--accent`, plus `--tint` pour le voile. Les couleurs de texte associées ne
 * sont pas décoratives : `--primary-foreground` est choisi par calcul de
 * contraste, sans quoi un bouton sur un fond clair extrait deviendrait
 * illisible.
 */
export function applyAccent(palette: Palette | null): void {
  const el = root();

  if (!palette) {
    // Ne PAS effacer --primary/--ring/--accent ici : le preset vient d'être
    // appliqué juste avant, et les effacer rendrait sa couleur d'action vide.
    // Seul `--tint` appartient exclusivement à l'accent (aucun preset ne le
    // définit). C'est ce qu'on appelle `applyPreset` d'abord, toujours.
    el.style.removeProperty('--tint');
    el.removeAttribute('data-accent');
    return;
  }

  el.style.setProperty('--primary', toOklchString(palette.accent));
  el.style.setProperty('--ring', toOklchString(palette.accent));
  el.style.setProperty('--accent', toOklchString(palette.secondary));
  el.style.setProperty('--tint', toOklchString(palette.tint));
  el.style.setProperty('--primary-foreground', palette.onAccent);
  el.style.setProperty('--accent-foreground', palette.onSecondary);
  el.setAttribute('data-accent', 'image');
}

/** Type de fond appliqué à la coquille. */
export type Backdrop =
  | { type: 'none' }
  | { type: 'gradient'; name: string }
  | { type: 'image'; dataUrl: string; source: string };

export function applyBackdrop(backdrop: Backdrop): void {
  const el = root();

  if (backdrop.type === 'none') {
    el.removeAttribute('data-backdrop');
    el.style.removeProperty('--backdrop-image');
    return;
  }

  el.setAttribute('data-backdrop', backdrop.type);

  if (backdrop.type === 'image') {
    el.style.setProperty('--backdrop-image', `url("${backdrop.dataUrl}")`);
    el.style.removeProperty('--backdrop-gradient');
  } else {
    el.style.removeProperty('--backdrop-image');
    // La classe du dégradé est appliquée par le composant de fond : une seule
    // source de vérité pour les 12 noms, la liste dans `gradients.ts`.
    el.style.setProperty('--backdrop-gradient', `var(--gradient-${backdrop.name})`);
  }
}
