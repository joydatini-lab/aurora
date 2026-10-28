/**
 * Playwright — 5 parcours de la coquille WEB (W2, pivot 2026-10-28).
 *
 * Ce que ces parcours couvrent, et ce qu'ils ne couvrent PAS :
 *
 *   ✅ la coquille se monte (main.tsx -> app.tsx -> routeur) et le navigateur
 *      est cross-origin isolated (prerequis SharedArrayBuffer / WASQLite) ;
 *   ✅ la navigation entre les 5 destinations (et l'etat actif) ;
 *   ✅ l'acces direct a une route profonde (SPA fallback de l'hote) ;
 *   ✅ la route inconnue (404 vivante, coquille conservee) ;
 *   ✅ la PWA (manifeste, icones, service worker, installabilite).
 *
 *   ❌ le contenu metier de chaque ecran : il depend d'une session Supabase et
 *      d'un mirror local peuple. Ces parcours-la demandent des comptes de test
 *      (rotation des comptes dev — cf. progress/claude.md) et vivent dans un
 *      second lot.
 *
 * Les localisateurs ne reposent PAS sur des `data-test` inventes : ils
 * utilisent les reperes REELLEMENT presents dans le DOM (`<nav
 * aria-label="Navigation principale">`, `<main class="web-main">`,
 * `[data-state="feature-disabled"]`). Un test qui ne trouve pas sa cible
 * signale donc une regression d'accessibilite ou de structure, pas un oubli de
 * balisage de test.
 *
 * Executer : pnpm -F @aurora/web e2e
 * Prerequis : `pnpm exec playwright install chromium` (binaires non versionnes).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // La coquille peut attendre le premier sync ; 45 s absorbe un demarrage a
  // froid du preview + l'init WASQLite sans masquer un vrai blocage.
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Un flake sur une suite qui n'a jamais tourne ailleurs se diagnostique au
  // premier retry ; on ne le masque pas en montant a 2.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // La coquille est en francais : on fixe la locale pour que les formats
    // (dates, nombres) des ecrans partages soient deterministes.
    locale: 'fr-FR',
    timezoneId: 'Africa/Porto-Novo',
  },
  projects: [
    {
      name: 'desktop-chromium',
      // ≥ 900 px : rail vertical a gauche (le web est un grand ecran).
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      // < 900 px : barre basse — c'est un chemin de code DIFFERENT dans
      // WebShell, il merite sa propre passe.
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // `vite preview` sert le dist BUILT (donc SPA fallback + sw.js reels).
    // `E2E_DEV=1` bascule sur le serveur de dev pour iterer sans rebuild.
    command:
      process.env.E2E_DEV === '1'
        ? `pnpm exec vite --port ${PORT} --strictPort`
        : `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
