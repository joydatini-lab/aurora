/**
 * fatal.ts — rendre visible un démarrage raté.
 *
 * Problème résolu : une page blanche ne dit rien. Quand le module d'entrée
 * échoue (import cassé, exception au niveau module, Web API absente), React ne
 * monte jamais et `#root` reste vide — indistinguable, pour l'utilisateur, de
 * « l'app n'a pas d'interface ».
 *
 * Ce module est importé EN PREMIER par `main.tsx` et n'importe RIEN : il doit
 * survivre à l'échec de tout le reste. Il installe trois filets :
 *
 *   1. `window.onerror`            → exception non capturée ;
 *   2. `unhandledrejection`        → promesse rejetée non gérée ;
 *   3. un chien de garde (12 s)    → rien n'a été peint, sans erreur signalée.
 *
 * Les trois se contentent d'ÉCRIRE DANS LE DOM (pas de React : il peut être la
 * cause du problème).
 *
 * Règle : seul un échec AVANT le premier rendu est fatal. Une fois la coquille
 * peinte, les erreurs repartent vers la console — l'application a ses propres
 * états d'erreur et un panneau plein écran serait une régression.
 */

/** Étapes franchies par le boot — affichées dans le panneau de diagnostic. */
const steps: string[] = [];

/** Vrai dès qu'un panneau a été rendu (évite les doublons). */
let panelShown = false;

/** Vrai dès que React a peint quelque chose. */
let painted = false;

const el = (id: string) => document.getElementById(id);

export function trace(step: string): void {
  steps.push(step);
  try {
    (window as unknown as { __auroraBoot?: string[] }).__auroraBoot = steps;
  } catch {
    /* environnement exotique : la trace reste locale, ce n'est pas fatal */
  }
}

export function markPainted(): void {
  painted = true;
  trace('peint');
}

/** État de l'environnement utile au diagnostic. */
function environment(): string[] {
  let isolated = 'inconnu';
  try {
    isolated = String(window.crossOriginIsolated);
  } catch {
    /* ignore */
  }
  const hasSab =
    typeof SharedArrayBuffer !== 'undefined' ? 'oui' : 'NON (WASQLite indisponible)';
  const root = el('root');
  return [
    `crossOriginIsolated : ${isolated}`,
    `SharedArrayBuffer   : ${hasSab}`,
    `#root               : ${root ? `${root.childElementCount} enfant(s)` : 'ABSENT'}`,
    `url                 : ${location.href}`,
  ];
}

/**
 * Affiche le panneau de diagnostic. N'écrase jamais une interface déjà peinte.
 */
export function fatal(where: string, error: unknown, hint?: string): void {
  // Après le premier rendu, une erreur n'est plus « fatale » : la coquille est
  // là, l'application gère. On laisse seulement une trace console.
  if (painted || panelShown) {
    console.error(`[Aurora] ${where}`, error);
    return;
  }
  const root = el('root');
  if (!root) return;
  panelShown = true;

  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'erreur inconnue');
  const stack = error instanceof Error && error.stack ? error.stack : '';

  const lines = [
    `ÉTAPE   ${where}`,
    '',
    message,
    ...(stack ? ['', stack.split('\n').slice(0, 8).join('\n')] : []),
    '',
    '--- environnement ---',
    ...environment(),
    '',
    '--- étapes franchies ---',
    ...(steps.length > 0 ? steps : ['(aucune — l’échec est antérieur au boot)']),
  ];

  // Construit sans innerHTML pour le message d'erreur : il peut contenir du
  // HTML (message renvoyé par une API, par exemple).
  root.textContent = '';
  const wrap = document.createElement('div');
  wrap.setAttribute('data-aurora-fatal', where);
  wrap.style.cssText = [
    'font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
    'margin:0',
    'padding:24px',
    'min-height:100vh',
    'background:#fff',
    'color:#111',
    'box-sizing:border-box',
  ].join(';');

  const title = document.createElement('h1');
  title.textContent = 'Aurora n’a pas pu démarrer';
  title.style.cssText = 'font:600 20px/1.3 system-ui,sans-serif;margin:0 0 4px';
  wrap.appendChild(title);

  const sub = document.createElement('p');
  sub.textContent = 'Le détail ci-dessous remplace l’écran blanc : copie-le tel quel pour diagnostiquer.';
  sub.style.cssText = 'margin:0 0 20px;color:#555;font-family:system-ui,sans-serif';
  wrap.appendChild(sub);

  const pre = document.createElement('pre');
  pre.textContent = lines.join('\n');
  pre.style.cssText = [
    'white-space:pre-wrap',
    'word-break:break-word',
    'background:#f6f8fa',
    'border:1px solid #d8dee4',
    'border-radius:8px',
    'padding:16px',
    'margin:0 0 16px',
    'max-height:60vh',
    'overflow:auto',
  ].join(';');
  wrap.appendChild(pre);

  if (hint) {
    const hintEl = document.createElement('p');
    hintEl.textContent = hint;
    hintEl.style.cssText =
      'margin:0;padding:12px 16px;background:#fff8e6;border:1px solid #f0d68a;border-radius:8px;color:#5c4400;font-family:system-ui,sans-serif';
    wrap.appendChild(hintEl);
  }

  root.appendChild(wrap);
  console.error(`[Aurora] démarrage interrompu à « ${where} »`, error);
}

// --- filets globaux, posés à l'import (avant tout le reste) -----------------

window.addEventListener('error', (event) => {
  // Les erreurs de ressources (img/script 404) n'ont pas de `error` objet :
  // on ne bloque pas le démarrage pour ça, on les journalise.
  const error = (event as ErrorEvent).error ?? (event as ErrorEvent).message;
  fatal('window.error', error);
});

window.addEventListener('unhandledrejection', (event) => {
  fatal('unhandledrejection', (event as PromiseRejectionEvent).reason);
});

/**
 * Chien de garde : si rien n'est peint au bout de 12 s et qu'aucune erreur
 * n'a été signalée, le boot est bloqué (promesse qui ne se résout pas).
 * 12 s > budget `connect()` (5 s) + marge de rendu.
 */
window.setTimeout(() => {
  if (painted || panelShown) return;
  fatal(
    'chien de garde (12 s)',
    new Error('aucun rendu et aucune erreur : le boot est bloqué'),
    'Si « étapes franchies » s’arrête à « connect:attente », le problème vient de la base locale (WASQLite / SharedArrayBuffer).',
  );
}, 12_000);
