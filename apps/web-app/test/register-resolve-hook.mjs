/**
 * L3 — hook de résolution des tests de la coquille web.
 *
 * Deux besoins, deux sources :
 *  1. les imports relatifs sans extension de `@aurora/data` & co → le hook
 *     PARTAGÉ du dépôt (`packages/data/test/data-resolve-hook.mjs`), que
 *     `apps/mobile` utilise déjà. On le compose, on ne le duplique pas : deux
 *     hooks concurrents divergeraient.
 *  2. les alias de workspace `@aurora/*` → leur SOURCE TS. Node ne lit pas le
 *     `exports` d'un paquet en mode strip-types pour un symlink pnpm, donc le
 *     hook les route explicitement — la même vérité que Vite au build.
 */
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// ORDRE : Node exécute les hooks dans l'ordre INVERSE d'enregistrement — le
// dernier enregistré est appelé en premier. On enregistre donc le hook partagé
// AVANT le nôtre, pour que le nôtre voie les specifiers en premier et résolve
// les extensions `.tsx` / `index.tsx` que le hook partagé ne tente pas.
register(
  pathToFileURL(
    path.resolve(here, '../../../packages/data/test/data-resolve-hook.mjs'),
  ),
);
register(pathToFileURL(path.resolve(here, 'aurora-alias-hook.mjs')));
