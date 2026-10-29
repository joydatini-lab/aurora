import './styles/globals.css';
import { bootStep, clearWatchdog, installFatalHandlers, showFatal } from './boot/fatal';

/**
 * Point d'entrée.
 *
 * Ordre volontaire : les filets sont posés AVANT tout import applicatif.
 * Un `import` est hissé et évalué avant le corps du module ; si l'un d'eux
 * lève (variable d'environnement absente, dépendance native, top-level await),
 * rien de ce qui suit ne s'exécute. Poser les filets dans un module importé
 * en premier, et monter le reste par `import()` dynamique, est la seule façon
 * de garantir qu'une panne d'import reste visible.
 */

installFatalHandlers();
bootStep('filets installés');

async function start(): Promise<void> {
  bootStep('chargement du router');
  const [{ createElement }, { App }] = await Promise.all([
    import('react'),
    import('./app'),
  ]);

  bootStep('montage React');
  const { createRoot } = await import('react-dom/client');
  const root = document.getElementById('root');

  if (!root) {
    showFatal('Élément racine introuvable', '#root est absent du document.');
    return;
  }

  createRoot(root).render(createElement(App));
  bootStep('rendu demandé');

  // Le chien de garde ne se coupe qu'une fois un nœud applicatif réellement
  // présent : couper au premier rendu masquerait un arbre qui ne peint rien.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (document.querySelector('[data-aurora-app]')) {
        bootStep('application montée');
        clearWatchdog();
      }
    });
  });
}

start().catch((error: unknown) => {
  showFatal('Échec de l’amorçage', error);
});
