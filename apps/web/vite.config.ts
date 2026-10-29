import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * @aurora/web — coquille + design system (réécrite après la purge du 28/10).
 *
 * Plus d'alias `@app` vers l'ancienne app mobile, plus de shim Capacitor, plus
 * de moteur importé au chargement : l'application ne contient QUE du code neuf.
 * Le socle de données (`packages/data`) reste disponible mais n'est pas importé
 * par le design space — il revient avec les écrans métier.
 */
export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
    },
  },
  server: {
    // L'aperçu de l'environnement est proxifié : on écoute partout et on
    // accepte l'hôte public, sinon la page se charge mais les modules non.
    host: true,
    port: 5173,
    allowedHosts: true,
    /*
     * Le service de génération vit sur un autre port, mais le navigateur ne
     * l'appelle jamais directement : `/api` est relayé ici. Cela supprime le
     * CORS et, surtout, garde la clé du fournisseur hors du bundle. Le
     * navigateur ne sait même pas qu'un autre serveur existe.
     */
    proxy: {
      '/api': {
        target: process.env.DESIGN_API_URL ?? 'http://127.0.0.1:8787',
        changeOrigin: false,
        // Un service absent doit produire une ERREUR VISIBLE côté client, pas
        // un 200 vide : on ne masque pas les pannes.
        configure: (proxy) => {
          proxy.on('error', (error) => {
            console.error('[proxy /api] service injoignable :', error.message);
          });
        },
      },
    },
    watch: {
      // Les tests ne sont pas servis par Vite : les surveiller provoque des
      // rechargements de page à chaque exécution de `pnpm test`.
      ignored: ['**/test/**', '**/e2e/**', '**/playwright-report/**', '**/test-results/**'],
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
});
