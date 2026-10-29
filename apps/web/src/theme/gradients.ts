/**
 * Identifiants des dégradés disponibles.
 *
 * Généré depuis `src/styles/gradients.css` — les noms doivent rester alignés
 * sur les variables `--gradient-*`. Aucune couleur ici : la donnée vit dans le
 * CSS, ce fichier ne sert qu'à construire le sélecteur.
 */
export const GRADIENT_NAMES = [
  'warm-flame',
  'night-fade',
  'young-passion',
  'sunny-morning',
  'winter-neva',
  'ripe-malinka',
  'malibu-beach',
  'new-life',
  'true-sunset',
  'plum-plate',
  'aqua-splash',
  'midnight-bloom',
] as const;

export type GradientName = (typeof GRADIENT_NAMES)[number];
