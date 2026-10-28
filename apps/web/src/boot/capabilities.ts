/**
 * capabilities.ts — ce que CE navigateur peut réellement faire.
 *
 * Le socle local-first (AD-7) repose sur `@powersync/web`, qui écrit dans OPFS
 * via WASQLite. Ce dernier exige `SharedArrayBuffer`, que le navigateur
 * n'expose QUE sur une page *cross-origin isolated* (en-têtes COOP `same-origin`
 * + COEP `require-corp`).
 *
 * Trois situations produisent `crossOriginIsolated === false` :
 *   - l'hébergeur ne pose pas les en-têtes (défaut de déploiement) ;
 *   - un proxy/CDN les retire sur le chemin (constaté sur l'aperçu Arena) ;
 *   - un iframe parent ne les autorise pas.
 *
 * Dans ces cas, tenter d'ouvrir la base ne peut pas réussir : au mieux ça échoue
 * vite, au pire ça reste suspendu jusqu'au budget de `connect()`. On préfère le
 * DIRE et peindre immédiatement, avec une application utilisable en lecture
 * dégradée, plutôt que de laisser croire à un écran cassé.
 */

export interface LocalDbCapability {
  /** vrai si la base locale peut réellement s'ouvrir ici */
  available: boolean;
  /** raison lisible, affichée à l'utilisateur ; vide si `available` */
  reason: string;
}

/**
 * Évalue la capacité — fonction pure vis-à-vis du DOM, lisible sans navigateur.
 * `env` est injectable pour les tests.
 */
export function probeLocalDb(
  env: { crossOriginIsolated?: boolean; hasSharedArrayBuffer?: boolean } = {
    crossOriginIsolated: typeof crossOriginIsolated === 'boolean' ? crossOriginIsolated : false,
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  },
): LocalDbCapability {
  if (!env.hasSharedArrayBuffer) {
    return {
      available: false,
      reason:
        'SharedArrayBuffer est absent : la page n’est pas isolée cross-origin ' +
        '(en-têtes COOP/COEP manquants côté hébergeur ou retirés par un proxy).',
    };
  }
  if (!env.crossOriginIsolated) {
    return {
      available: false,
      reason:
        'La page n’est pas cross-origin isolated : le navigateur masque ' +
        'SharedArrayBuffer même s’il existe.',
    };
  }
  return { available: true, reason: '' };
}

const NOTICE_ID = 'aurora-degraded-notice';

/**
 * Bandeau discret, non bloquant, dismissible.
 *
 * Volontairement en DOM direct plutôt qu'en composant React : il doit pouvoir
 * s'afficher même si le rendu de l'application échoue — c'est justement le cas
 * où l'information est la plus utile.
 */
export function showDegradedNotice(reason: string): void {
  if (document.getElementById(NOTICE_ID)) return;

  const bar = document.createElement('div');
  bar.id = NOTICE_ID;
  bar.setAttribute('role', 'status');
  bar.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'bottom:0',
    'z-index:2147483647',
    'display:flex',
    'gap:12px',
    'align-items:flex-start',
    'padding:10px 14px',
    'background:#fff8e6',
    'color:#5c4400',
    'border-top:1px solid #f0d68a',
    'font:13px/1.5 system-ui,-apple-system,sans-serif',
  ].join(';');

  const text = document.createElement('p');
  text.style.cssText = 'margin:0;flex:1 1 auto';
  text.textContent = `Mode dégradé — la base locale n’est pas disponible ici. ${reason}`;
  bar.appendChild(text);

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Fermer';
  close.style.cssText = [
    'flex:0 0 auto',
    'border:1px solid #d8c48a',
    'background:#fff',
    'color:inherit',
    'border-radius:6px',
    'padding:2px 10px',
    'font:inherit',
    'cursor:pointer',
  ].join(';');
  close.addEventListener('click', () => bar.remove());
  bar.appendChild(close);

  document.body.appendChild(bar);
}
