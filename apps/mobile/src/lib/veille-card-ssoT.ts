/**
 * veille-card-ssoT.ts (M-46, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L490-494, écran 12 « Carte de liste v2 »).
 *
 * Le SSoT PUR de l'en-tête coloré de la CARTE DE LISTE d'un programme
 * de veille (zéro React, zéro DOM, zéro réseau — testable par
 * `node:test` sous `--experimental-strip-types`, le même pattern que
 * `veille-rapport.js` et `veille-programs-join.js`) :
 *
 *   - `pickCardTone(id, cadence)` — la teinte de la pastille (le SSoT
 *     de la carte : le `data-card-tone` du `.tsx`, le fond coloré de
 *     l'en-tête du Stitch écran 12, 4 teintes cyclées par l'index
 *     stable du programme — jamais une valeur brute, le `var` du
 *     token est porté par le CSS, ce module ne donne QUE le nom du
 *     token : `accent` / `success` / `warning` / `info`).
 *   - `cardToneLabel(cadence)` — le libellé de type de la ligne
 *     en-tête (le sous-titre « VEILLE · MENSUELLE » du Stitch, le
 *     type est FERMÉ : une veille `jobKind:'research'` n'a que 4
 *     cadences SSoT, le `cadenceLabel` de `veille-rapport.js` est le
 *     mapping inverse du SSoT du formulaire M-45 — jamais dupliqué).
 *
 * Cohérence SSoT : le cron du `Automation` est le SSoT — la carte ne
 * recalcule JAMAIS la cadence (le `cadenceLabel` est le module pur
 * partagé avec le rapport, AD-7 : la surface ne duplique pas la
 * logique de parsing du cron).
 *
 * Bornes (AD-1 / AD-13) : un `id` manquant → l'index 0 (teinte `accent`,
 * jamais une teinte factice) ; une cadence inconnue/absente → le
 * libellé se borne à « VEILLE » (l'AD-13 honnête : la cadence s'ommet,
 * jamais inventée).
 */

import { cadenceLabel } from '../components/veille/veille-rapport.js';

/** Les 4 teintes du SSoT fermé de la carte (le token CSS, jamais une
 *  valeur brute — le CSS `data-card-tone="accent"` consomme ce nom). */
export const CARD_TONES = [
  'accent',
  'success',
  'warning',
  'info',
] as const;

export type CardTone = (typeof CARD_TONES)[number];

/** La teinte de la pastille d'un programme (cyclée par l'index stable
 *  dérivé de l'`id` du programme — deux programmes distincts partagent
 *  la même teinte si leur index modulo 4 coïncide, le SSoT fermé du
 *  Stitch écran 12 : 4 teintes max, jamais plus). */
export function pickCardTone(id: string): CardTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CARD_TONES[h % CARD_TONES.length] ?? 'accent';
}

/** Le libellé de la ligne en-tête (le sous-titre Stitch : le type FERMÉ
 *  « Veille » + la cadence SSoT — un cron inconnu/absent → « Veille »
 *  seul, l'AD-13 honnête). */
export function cardToneLabel(cadence: string | null): string {
  const cad = cadence ? cadenceLabel(cadence) : null;
  if (!cad) return 'Veille';
  return `Veille · ${cad}`;
}
