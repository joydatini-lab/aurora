/**
 * Filet de sécurité du démarrage.
 *
 * Une page blanche est un défaut, pas un état : si le module d'entrée ne
 * s'évalue pas (import cassé, erreur de syntaxe, `ReferenceError` dans un
 * constructeur évalué au chargement), l'utilisateur doit voir POURQUOI. Un
 * écran vide ne se diagnostique pas ; un panneau avec la pile d'appels, si.
 *
 * Ce fichier n'importe RIEN : c'est le seul module qui doit survivre à une
 * panne de tout le reste du graphe.
 */

const START = Date.now();
const STEPS: Array<{ at: number; label: string }> = [];

let installed = false;
let watchdogId: number | undefined;

/** Trace une étape d'amorçage — affichée dans le panneau de diagnostic. */
export function bootStep(label: string): void {
  STEPS.push({ at: Date.now() - START, label });
}

function describeEnvironment(): string[] {
  const lines: string[] = [];
  lines.push(`URL      ${location.href}`);
  lines.push(`Agent    ${navigator.userAgent}`);
  lines.push(`Viewport ${window.innerWidth}×${window.innerHeight}`);
  lines.push(
    `Capacités crossOriginIsolated=${String(window.crossOriginIsolated)} secure=${String(
      window.isSecureContext,
    )}`,
  );
  const root = document.getElementById('root');
  lines.push(`#root    ${root ? `${root.childElementCount} enfant(s)` : 'ABSENT'}`);
  return lines;
}

/**
 * Affiche le panneau de diagnostic. Idempotent : plusieurs erreurs empilées
 * ne doivent pas produire cinq panneaux.
 */
export function showFatal(title: string, detail: unknown): void {
  const message =
    detail instanceof Error
      ? `${detail.name}: ${detail.message}\n${detail.stack ?? '(pas de pile)'}`
      : typeof detail === 'string'
        ? detail
        : safeJson(detail);

  // Sur la console d'abord : c'est là qu'un développeur regarde.
  console.error(`[aurora] ${title}`, detail);

  const host = document.getElementById('root') ?? document.body;
  const existing = document.getElementById('aurora-fatal');
  if (existing) return;

  const panel = document.createElement('div');
  panel.id = 'aurora-fatal';
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-live', 'assertive');
  panel.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'overflow:auto',
    'background:#16161c',
    'color:#f2f0ec',
    'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'padding:24px',
  ].join(';');

  const pre = document.createElement('pre');
  pre.style.cssText =
    'margin:0;white-space:pre-wrap;word-break:break-word;max-width:960px;margin-inline:auto';

  const steps = STEPS.length
    ? STEPS.map((s) => `  +${String(s.at).padStart(5)} ms  ${s.label}`).join('\n')
    : '  (aucune étape enregistrée)';

  pre.textContent = [
    'AURORA — DÉMARRAGE INTERROMPU',
    '',
    title,
    '',
    message,
    '',
    'Étapes d’amorçage :',
    steps,
    '',
    'Environnement :',
    ...describeEnvironment().map((l) => `  ${l}`),
    '',
    'Cette page remplace l’écran blanc : elle s’affiche quand l’application',
    'n’a pas pu se monter. Le détail ci-dessus suffit à identifier la cause.',
  ].join('\n');

  const retry = document.createElement('button');
  retry.textContent = 'Recharger';
  retry.style.cssText = [
    'display:block',
    'margin:24px auto 0',
    'padding:8px 20px',
    'border-radius:8px',
    'border:1px solid #6b5ce7',
    'background:#6b5ce7',
    'color:#fff',
    'font:inherit',
    'cursor:pointer',
  ].join(';');
  retry.onclick = () => location.reload();

  panel.append(pre, retry);
  host.append(panel);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Installe les trois filets :
 *   1. `error` — erreurs synchrones non rattrapées ;
 *   2. `unhandledrejection` — promesses rejetées, la panne la plus silencieuse ;
 *   3. un chien de garde — si `#root` est encore vide au bout du délai, c'est
 *      que le module d'entrée n'a jamais été évalué.
 *
 * Le chien de garde est le point clé : sans lui, un échec d'IMPORT ne produit
 * aucune exception visible dans la page.
 */
export function installFatalHandlers(watchdogMs = 12_000): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    // Les erreurs de chargement de ressource (img, script externe) remontent
    // ici sans `error` : inutile d'afficher un panneau plein écran pour une
    // favicon manquante.
    if (!event.error && event.target !== window) return;
    showFatal('Erreur non rattrapée', event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    showFatal('Promesse rejetée sans gestionnaire', event.reason);
  });

  watchdogId = window.setTimeout(() => {
    const root = document.getElementById('root');
    const mounted = root !== null && root.querySelector('[data-aurora-app]') !== null;
    if (!mounted) {
      showFatal(
        'Le module d’entrée n’a pas monté l’application',
        `#root ${root ? 'existe mais ne contient aucun nœud applicatif' : 'est introuvable'} ` +
          `après ${watchdogMs} ms.`,
      );
    }
  }, watchdogMs);
}

/** Annule le chien de garde une fois le montage confirmé. */
export function clearWatchdog(): void {
  if (watchdogId !== undefined) {
    window.clearTimeout(watchdogId);
    watchdogId = undefined;
  }
}
