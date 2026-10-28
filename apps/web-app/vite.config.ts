import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * dyad/beta: L3 (coquille `apps/web-app`).
 *
 * Même stratégie de résolution que `apps/mobile` (R1, AI_RULES §5) : les
 * paquets `@aurora/*` résolvent vers la SOURCE TS (chaque package.json
 * `exports` → `src/index.ts`). Vite suit les symlinks pnpm, donc l'app
 * bundle le monorepo directement — pas de pré-build tsc.
 *
 * L'alias `^src/` route les imports internes de `packages/ui`
 * (`import { cn } from "src/lib/utils"`, résolus par son tsconfig `paths`)
 * vers `packages/ui/src/...` : sans lui, le build échoue en TS2307 sur les
 * imports `src/...` du design system.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) => path.resolve(here, `../../packages/${name}/src`);

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@aurora/web-app', replacement: path.resolve(here, 'src') },
      { find: '@aurora/domain', replacement: pkgSrc('domain') },
      { find: '@aurora/data', replacement: pkgSrc('data') },
      { find: '@aurora/ui', replacement: pkgSrc('ui') },
      { find: /^src\//, replacement: pkgSrc('ui') + '/' },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // L5 : mêmes réglages que `apps/mobile` et `apps/desktop` (R1), parce que
    // la coquille embarque désormais le moteur PowerSync.
    //   - `worker.format = 'es'` : le worker WASQLite de `@powersync/web` fait
    //     du code-splitting (2 chunks) ; l'`iife` par défaut échoue en
    //     « UMD and IIFE output formats are not supported for code-splitting
    //     builds » (mesuré).
    //   - `target = 'esnext'` + `minify: false` : Vite saute alors la
    //     transpilation post-rollup par esbuild, comme le desktop.
    target: 'esnext',
    minify: false,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Le sync engine spawn un Web Worker ; si le dep-optimizer l'inline, le
    // worker disparaît du bundle et la base se casse à l'exécution
    // (même exclusion que `apps/mobile` / `apps/desktop`).
    exclude: [
      '@powersync/web',
      '@powersync/capacitor',
      '@powersync/common',
      '@powersync/shared-internals',
    ],
  },
  server: {
    host: '0.0.0.0',
  },
});
