/**
 * pwa.ts — enregistrement du service worker (B4a, pivot web 2026-10-28).
 *
 * Objectif : AD-7 (offline-first) ne doit pas dépendre uniquement de PowerSync.
 * Le SW garantit que la COQUILLE s'ouvre hors ligne (routes SPA + assets
 * déjà visités), même si le relay est injoignable.
 *
 * Choix assumé : pas de `vite-plugin-pwa` (precache manifest généré). Le SW
 * fait du runtime-caching (réseau d'abord pour la navigation, cache d'abord
 * pour les assets fingerprintés). Conséquence : offline complet APRÈS la
 * première visite de chaque route — pas dès l'installation. Passer à un
 * precache généré est une amélioration ultérieure, pas un blocage.
 *
 * Sécurité : enregistré uniquement en production, et silencieusement ignoré
 * si l'environnement ne le supporte pas (file://, navigateur ancien, iframe
 * sandboxée).
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // En DEV on ne veut pas d'un SW qui masque le HMR.
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Aurora] service worker non enregistré', error);
    });
  });
}
