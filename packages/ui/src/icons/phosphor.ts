/**
 * SSoT — Bascule des icônes vers Phosphor (`@phosphor-icons/react`).
 *
 * L'API Phosphor v2 est plate : chaque icône est un composant forwardRef qui
 * reçoit `weight` en prop. Le SSoT de ce module construit les objets
 * `AURORA_ICONS` / `AURORA_ICONS_FILL` / `AURORA_ICONS_BOLD` (un par weight),
 * indexés par le nom Lucide d'origine (pour la bascule sans retoucher les
 * 196 fichiers importeurs).
 *
 * Usage dans les composants :
 * ```tsx
 * import { AURORA_ICONS, AURORA_ICONS_FILL } from '@aurora/ui';
 * <AURORA_ICONS.Search size={16} />          // duotone (défaut)
 * <AURORA_ICONS_FILL.Check size={16} />      // fill (accents)
 * ```
 */

import * as React from 'react';
import {
  PHOSPHOR_NAME_MAP,
  PHOSPHOR_WEIGHT,
  PHOSPHOR_COMPONENTS,
  type LucideName,
  type PhosphorWeight,
} from './phosphor-mapping';

/**
 * Type commun : un composant d'icône Phosphor (forwardRef), sans le `weight`
 * appliqué (celui-ci est injecté à la création de la famille).
 */
export type PhosphorComponent = React.ComponentType<
  React.ComponentProps<(typeof PHOSPHOR_COMPONENTS)['Gear']>
>;

/**
 * Construit un objet famille indexé par le nom Lucide, avec le weight
 * demandé appliqué à chaque composant. Les noms non listés dans
 * `PHOSPHOR_NAME_MAP` sont exclus (le type est exhaustif, aucun trou).
 *
 * On lit le REGISTRE STATIQUE (`PHOSPHOR_COMPONENTS`), jamais un namespace :
 * c'est ce qui garde l'arbre secouable (cf. phosphor-mapping.ts).
 */
function buildFamily(weight: PhosphorWeight) {
  const out: Partial<Record<LucideName, PhosphorComponent>> = {};
  for (const [lucideName, phosphorName] of Object.entries(PHOSPHOR_NAME_MAP)) {
    const Comp = PHOSPHOR_COMPONENTS[phosphorName as keyof typeof PHOSPHOR_COMPONENTS];
    if (!Comp) continue;
    const C = Comp as React.ComponentType<React.ComponentProps<(typeof PHOSPHOR_COMPONENTS)['Gear']>>;
    const effectiveWeight = PHOSPHOR_WEIGHT[lucideName as LucideName] ?? weight;
    out[lucideName as LucideName] = (props) =>
      React.createElement(C, { weight: effectiveWeight, ...props });
  }
  return out as Record<LucideName, PhosphorComponent>;
}

/** Le SSoT duotone par défaut (majorité des icônes). */
export const AURORA_ICONS = buildFamily('duotone');

/** Le SSoT fill (accents : CTA, pastilles, badges). */
export const AURORA_ICONS_FILL = buildFamily('fill');

/** Le SSoT bold (titres, boutons principaux). */
export const AURORA_ICONS_BOLD = buildFamily('bold');

/**
 * L'API Lucide `strokeWidth={N}` → le SSoT Phosphor weight.
 * `2` (défaut Lucide) = duotone ; `1.5` = fill ; `2.25` = bold.
 * (Utilisable pour migrer les appels Lucide existants sans les supprimer à la main.)
 */
export function strokeWeightToPhosphorWeight(strokeWidth?: number): PhosphorWeight {
  if (strokeWidth === undefined || strokeWidth >= 2) return 'duotone';
  if (strokeWidth >= 1.5) return 'fill';
  return 'bold';
}

export type { LucideName, PhosphorWeight };
