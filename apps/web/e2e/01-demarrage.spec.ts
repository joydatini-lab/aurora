/**
 * Parcours 1 — la coquille se monte, et le navigateur isole les origines.
 *
 * Deux invariants, tous les deux critiques et tous les deux silencieux quand
 * ils cassent :
 *
 *   1. Le montage. `main.tsx` construit le provider de donnees AVANT de rendre
 *      (`createAuroraDataProvider` + moteur `@powersync/web`). Si cette chaine
 *      jette, l'ecran reste blanc — pas d'erreur visible, juste `#root` vide.
 *
 *   2. L'isolation cross-origin. WASQLite s'appuie sur `SharedArrayBuffer`, que
 *      le navigateur n'expose QUE si la page est servie avec COOP `same-origin`
 *      + COEP `require-corp`. Sans ces en-tetes l'app « marche » mais perd sa
 *      base locale : plus d'offline-first (AD-7), et l'etat disparait au reload,
 *      sans aucun message.
 */
import { test, expect } from '@playwright/test';

test.describe('P1 — demarrage de la coquille', () => {
  test('la coquille se monte et expose ses reperes de navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // `#root` ne doit jamais rester vide : c'est le symptome d'un boot jete.
    await expect(page.locator('#root')).not.toBeEmpty();

    // Repere structurel : le rail/barre de navigation du WebShell.
    await expect(
      page.getByRole('navigation', { name: 'Navigation principale' }),
    ).toBeVisible();

    // Zone de contenu. `<Outlet />` doit y avoir monte QUELQUE CHOSE.
    const main = page.locator('main.web-main');
    await expect(main).toBeVisible();
    await expect(main).not.toBeEmpty();

    // La marque confirme qu'on est sur la coquille et pas sur une page d'erreur
    // statique servie par l'hote.
    await expect(page.getByText('Aurora').first()).toBeVisible();
  });

  test('la page est cross-origin isolated (SharedArrayBuffer disponible)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Sans COOP/COEP, `crossOriginIsolated` est false et `SharedArrayBuffer`
    // est absent : c'est exactement la condition qui casse @powersync/web.
    const isolation = await page.evaluate(() => ({
      crossOriginIsolated: window.crossOriginIsolated,
      hasSab: typeof SharedArrayBuffer !== 'undefined',
    }));

    expect(
      isolation.crossOriginIsolated,
      'COOP/COEP absents : WASQLite ne peut pas allouer SharedArrayBuffer (AD-7). ' +
        'Verifier server/preview.headers dans vite.config.ts et les en-tetes de l\'hote.',
    ).toBe(true);
    expect(isolation.hasSab).toBe(true);
  });

  test('aucune erreur non capturee au demarrage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

    // Les warnings de boot sont tolerés (mode local miroir), pas les exceptions
    // non capturees : celles-la laissent le tree React a moitie demonte.
    expect(errors, `exceptions non capturees : ${errors.join(' | ')}`).toEqual([]);
  });
});
