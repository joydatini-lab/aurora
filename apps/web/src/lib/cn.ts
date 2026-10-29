import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Fusion de classes : `clsx` compose, `tailwind-merge` arbitre.
 *
 * Sans `twMerge`, une classe de fond passée en `className` sur un bouton qui
 * porte déjà son propre fond produirait DEUX classes — et c'est l'ordre dans
 * la feuille qui déciderait, pas l'intention de l'appelant. Ici, la dernière
 * intention gagne, toujours.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
