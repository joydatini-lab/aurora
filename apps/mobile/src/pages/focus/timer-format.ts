/**
 * formatage des temps du minuteur v2 (S5, M-53) — module `.ts` pur
 * (n'importe pas de `.tsx` / React, donc testable sous
 * `node --experimental-strip-types`, comme le reste de la suite
 * `*-wiring.test.ts`). Les helpers sont importés par `timer.tsx`
 * (le composant) et par le test `focus-wiring.test.ts`.
 */
import type { FocusTimerState } from '@aurora/focus';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Exporté pour le chrono (affichage HH:MM:SS par champs séparés). */
export { pad2 };

/** restant MM:SS (Pomodoro, < 1 h) — l'anneau affiche `18:42`. */
export function formatRemaining(sec: number): string {
  const clamped = Math.max(0, sec);
  return `${pad2(Math.floor(clamped / 60))}:${pad2(Math.floor(clamped % 60))}`;
}

/** écoulé HH:MM:SS (Chronomètre) — le compteur affiche `00:42:18`. */
export function formatElapsed(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/**
 * Le temps restant d'un timer (Pomodoro). `plannedSec === 0` (chrono
 * open-ended) → `undefined` (pas de bornes).
 */
export function remainingSecOf(timer: FocusTimerState): number | undefined {
  if (timer.plannedSec <= 0) return undefined;
  return Math.max(0, timer.plannedSec - timer.activeSec);
}
