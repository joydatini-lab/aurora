import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * @aurora/web — the WEB shell (Phase 1 cible unique, pivot 2026-10-28).
 *
 * Differences vs the dormant `apps/mobile` config:
 *   - `@aurora/data/powersync-engine-web` is aliased explicitly (`@powersync/web`
 *     = WASQLite) so the browser gets a REAL local database (AD-7 offline-first).
 *   - the updater's storage primitive is redirected to a localStorage shim
 *     (`aurora-updater-web-shim`), which keeps `@capacitor/preferences` out of
 *     the browser bundle (B1).
 *   - COOP/COEP headers are served in dev: WASQLite needs `SharedArrayBuffer`,
 *     which browsers only expose on a cross-origin isolated page (B4).
 *
 * The SCREENS are shared with the old shell through the `@app` alias
 * (`../../apps/mobile/src`) — one copy of the product code, no duplication.
 * Moving `pages/ query/ ux/ lib/ state/` into a `packages/app-core` package is
 * the natural next step; the alias makes that a pure path change.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) => path.resolve(here, `../../packages/${name}/src`);
const sharedAppSrc = path.resolve(here, '../mobile/src');

const requireCjs = createRequire(path.join(here, 'noop.js'));
const uiNodeModules = path.resolve(here, '../../packages/ui/node_modules');
const tailwindcss = requireCjs(path.join(uiNodeModules, 'tailwindcss'));
const autoprefixer = requireCjs(path.join(uiNodeModules, 'autoprefixer'));

/**
 * B1 — the updater imports its storage primitive as `'./preferences'` from
 * `apps/mobile/src/updater/apkUpdater.ts`. A plain Vite alias cannot match a
 * RELATIVE specifier, so we intercept the resolution: on the web shell that
 * module becomes the localStorage shim. Result: `@capacitor/preferences` never
 * enters the bundle, and the updater logic itself is untouched.
 */
function updaterPreferencesShim() {
  return {
    name: 'aurora-updater-web-shim',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (
        source === './preferences' &&
        importer?.includes('/updater/apkUpdater.ts')
      ) {
        return path.resolve(here, 'src/shims/preferences-web.ts');
      }
      return null;
    },
  };
}

/**
 * Garde-fou : un build de production ne doit JAMAIS contenir les identifiants
 * de remplissage du formulaire de connexion (`VITE_DEV_LOGIN_*`).
 *
 * Le bloc de `login/index.tsx` est deja supprime par `import.meta.env.DEV`,
 * mais Vite INLINE les variables d'environnement avant le tree-shaking : si un
 * jour ces deux valeurs se retrouvent dans les secrets CI, la chaine serait
 * ecrite dans le bundle avant d'etre eliminee — et une elimination qui echoue
 * ne se voit pas. On refuse le build, ce qui se voit tout de suite.
 */
function forbidDevCredentialsInProd() {
  return {
    name: 'aurora-forbid-dev-credentials-in-prod',
    config(_config: unknown, { mode, command }: { mode: string; command: string }) {
      if (command !== 'build' || mode !== 'production') return;
      const env = loadEnv(mode, here, 'VITE_');
      const leaked = ['VITE_DEV_LOGIN_EMAIL', 'VITE_DEV_LOGIN_PASSWORD'].filter((k) => env[k]);
      if (leaked.length > 0) {
        throw new Error(
          `[aurora/web] ${leaked.join(', ')} ne doit pas etre defini en build de production ` +
            '(identifiants de dev). Retire-les de l\'environnement de build.',
        );
      }
    },
  };
}

export default defineConfig({
  root: here,
  plugins: [updaterPreferencesShim(), forbidDevCredentialsInProd(), react()],
  resolve: {
    alias: [
      // Subpath AVANT le préfixe générique (l'ordre compte).
      {
        find: '@aurora/data/powersync-engine-web',
        replacement: pkgSrc('data') + '/powersync-engine-web.ts',
      },
      { find: '@aurora/data/powersync-engine-capacitor', replacement: pkgSrc('data') + '/powersync-engine-capacitor.ts' },
      { find: '@aurora/domain', replacement: pkgSrc('domain') },
      { find: '@aurora/data', replacement: pkgSrc('data') },
      { find: '@aurora/ui', replacement: pkgSrc('ui') },
      { find: '@aurora/platform', replacement: pkgSrc('platform') },
      { find: '@aurora/agent', replacement: pkgSrc('agent') },
      { find: '@aurora/productivity', replacement: pkgSrc('productivity') },
      { find: '@aurora/learning', replacement: pkgSrc('learning') },
      { find: '@aurora/goal-engine', replacement: pkgSrc('goal-engine') },
      { find: '@aurora/progress', replacement: pkgSrc('progress') },
      { find: '@aurora/discovery', replacement: pkgSrc('discovery') },
      { find: '@aurora/focus', replacement: pkgSrc('focus') },
      { find: '@aurora/ascent', replacement: pkgSrc('ascent') },
      { find: '@aurora/integrations', replacement: pkgSrc('integrations') },
      { find: '@aurora/scientific-engine', replacement: pkgSrc('scientific-engine') },
      { find: '@aurora/workflows', replacement: pkgSrc('workflows') },
      // Les ÉCRANS partagés (une seule copie du code produit).
      { find: '@app', replacement: sharedAppSrc },
      // `@aurora/ui` s'importe lui-même en absolu (`src/lib/utils`).
      { find: /^src\//, replacement: pkgSrc('ui') + '/' },
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  optimizeDeps: {
    // PowerSync spawns a Web Worker; the dep optimizer drops the worker file.
    exclude: [
      '@powersync/web',
      '@powersync/common',
      '@powersync/shared-internals',
    ],
  },
  server: {
    // Preview environments proxy a public host — bind all interfaces.
    host: true,
    port: 5173,
    allowedHosts: true,
    fs: { allow: [path.resolve(here, '../..')] },
    // WASQLite → SharedArrayBuffer → cross-origin isolation (B4).
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  // PowerSync embarque un Web Worker : il doit sortir en ES module, sinon
  // Rollup refuse le code-splitting (UMD/IIFE incompatibles).
  worker: { format: 'es' },
});
