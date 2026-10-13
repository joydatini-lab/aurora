import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * dyad/beta: A1 (mobile build). Web entry for the Capacitor shell.
 *
 * R1 mitigation (AI_RULES §5 / plan A1): the `@aurora/*` workspace packages
 * resolve to TS SOURCE (each package.json `exports` → `src/index.ts`). Vite
 * follows the pnpm symlinks, so the app bundles the monorepo source directly
 * (esbuild transpiles the `.ts`/`.tsx`) — no tsc pre-build required.
 *
 * `resolve.alias` makes the SUBPATH imports (`@aurora/data/repositories`,
 * `@aurora/ui/renderers`, `@aurora/domain/ascent`, …) resolve to source: the
 * packages' `exports` only declares `.` (`@aurora/domain/ascent` would not
 * resolve via `exports`), so the alias routes every `@aurora/*` to its
 * `src/` and Vite picks the sibling file/directory (`.ts` / `index.ts`).
 *
 * The `^src/` alias (added for the shadcn integration): `@aurora/ui` source
 * imports its own helpers as BARE absolute paths (`import { cn } from
 * "src/lib/utils"` — resolved by packages/ui's tsconfig `paths`). Those don't
 * resolve in the mobile build, so any `src/...` import is routed back to
 * `packages/ui/src/...`. Only `packages/ui` uses this form (verified), and
 * mobile's own code never does, so it is safe to route globally.
 *
 * esbuild fix (2026-10-13, same machine incident as apps/desktop): this
 * host's global esbuild (v0.28.2, hoisted under `C:\Users\joyda\node_modules`)
 * cannot delete its own temp-file in `%TEMP%` (antivirus/indexer lock —
 * "Accès refusé" at every `vite build` post-rollup transpile). The fix is to
 * make Vite's own module-resolution start from the workspace root so it
 * always binds the *workspace* esbuild (v0.21.5, `node_modules/.pnpm`,
 * verified working via `transformSync` above), never the global one. This
 * runs at config-load time, BEFORE Vite is imported — hence the
 * `vite.config.cjs`-style re-require pattern: the main `vite.config.ts` is
 * transpiled + executed by Vite's own loader, which has already `require()`'d
 * the global esbuild. `preload-esbuild.mjs` runs first (a tiny, explicit
 * `node --import` hook wired in the package.json `build` script below) and
 * pins `require('esbuild')` resolution to the pnpm store.
 */

// See `preload-esbuild.mjs` + `apps/mobile/package.json` `build` script for
// the actual mechanism — this file intentionally does NOT try to patch
// Node's module cache here: Vite's config loader (this very file) has already
// imported Vite, which has already imported esbuild by the time any code in
// this file runs. The only way to intercept is *before* Vite loads — i.e. in
// a separate module that Node's `--import` preloads first.
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) => path.resolve(here, `../../packages/${name}/src`);

// Tailwind v3 + autoprefixer are declared by @aurora/ui and linked into
// packages/ui/node_modules (pnpm). Load them from there so the mobile build
// has the PostCSS plugin available now; @aurora/mobile also lists them in
// devDependencies, so a workspace `pnpm install` links them into
// apps/mobile/node_modules as the durable resolution.
//
// Anchor the CJS require at `here` (the config's own dir, already proven
// correct by the @aurora/* aliases) and use ABSOLUTE paths — Vite bundles
// the config with esbuild, where a bare `import.meta.url`-relative require
// could resolve against the temp bundle dir instead.
const requireCjs = createRequire(path.join(here, 'noop.js'));
const uiNodeModules = path.resolve(here, '../../packages/ui/node_modules');
const tailwindcss = requireCjs(path.join(uiNodeModules, 'tailwindcss'));
const autoprefixer = requireCjs(path.join(uiNodeModules, 'autoprefixer'));

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@aurora/mobile', replacement: path.resolve(here, 'src') },
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
      // `@aurora/ui` source internal bare imports (`src/lib/utils`, …).
      { find: /^src\//, replacement: pkgSrc('ui') + '/' },
    ],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  css: {
    // shadcn/ui layer: the Tailwind v3 PostCSS plugin (reads tailwind.config.js)
    // + autoprefixer. Inline here so the plugin resolves without a separate
    // postcss.config that would need tailwindcss linked into apps/mobile.
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  optimizeDeps: {
    // The PowerSync sync engine (`@powersync/web`) spawns a Web Worker
    // (`worker.js`). Vite's dep optimizer inlines the bundle but drops the
    // worker file → the browser requests `.vite/deps/worker.js?worker_file`
    // which doesn't exist ("incompatible with the dep optimizer"), which also
    // surfaces at runtime as "[PowerSync]: Error in database or sync worker".
    // Serve the PowerSync family natively (un-optimized) so its worker +
    // `new URL(…)` references resolve against the real files.
    exclude: [
      '@powersync/capacitor',
      '@powersync/web',
      '@powersync/common',
      '@powersync/shared-internals',
    ],
  },
  server: {
    // the dev server must read the workspace packages (symlinked TS source).
    fs: { allow: [path.resolve(here, '../..')] },
  },
  build: {
    // `webDir` in capacitor.config.ts = 'dist' — Capacitor ships this dir.
    outDir: 'dist',
    sourcemap: true,
    // `esnext` (pas `es2020`): le bundle mobile n'est pas servi à de vieux
    // webviews — les Capacitor webviews courantes (iOS 16+ / Android 12+,
    // 2026) supportent nativement ES2022/23. Avec `esnext` ET `minify: false`,
    // Vite saute la transpilation post-rollup par esbuild (`vite:esbuild-transpile`
    // rend `null` — voir `resolveEsbuildTranspileOptions`) : sur cette machine
    // Windows, le binaire esbuild natif échoue à supprimer son propre
    // temp-file dans %TEMP% ("Accès refusé", verrou antivirus/indexer —
    // même incident qu'apps/desktop, fix 2026-10-13 commité comme 7c8cc8b).
    // Le code source `.ts/.tsx` est transpilé par esbuild via le pipeline
    // d'optimisation des dépendances + plugins (qui fonctionne
    // correctement, vérifié via `transformSync`) ; seul le post-transpile
    // du chunk final saute.
    target: 'esnext',
    minify: false,
    // PowerSync ships a Web Worker (`@powersync/web/lib/worker/client.js`
    // calls `new Worker(new URL('./worker.js', import.meta.url))`). Vite's
    // dep optimizer inlines the worker file in DEV (the `optimizeDeps.exclude`
    // above handles that). In PROD, Vite's `workerFileToUrl` hook rewrites
    // the URL to a bundled IIFE chunk — which Rollup rejects when the app
    // code-splits (React.lazy) with:
    //   "Invalid value 'iife' for option 'output.format' — UMD and IIFE
    //    output formats are not supported for code-splitting builds."
    // Forcing `worker.format = 'es'` makes Vite emit the worker as a
    // self-contained ES module at `dist/worker-<hash>.js`, referenced via
    // the rewritten `new URL('./worker-<hash>.js', import.meta.url)` —
    // resolvable at runtime on the static CDN (Render / Capacitor).
    //
    // NOTE (Render build): the V8 heap default (~2GB) OOM-crashes
    // `rendering chunks` on a large Rollup bundle on Render's starter-tier
    // build box. Set `NODE_OPTIONS=--max-old-space-size=4096` in the Render
    // build command — this is a process-level env var, not a Vite config
    // option, so it can't be set from here.
  },
  worker: {
    format: 'es',
  },
});
