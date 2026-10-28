/**
 * Parcours 4 — une route inconnue garde la coquille et affiche la 404 vivante.
 *
 * Deux 404 coexistent dans un SPA, et les confondre rend le diagnostic
 * impossible :
 *
 *   - la 404 de l'HEBERGEUR : page blanche hors charte, pas de navigation —
 *     c'est un bug de SPA fallback (parcours 3) ;
 *   - la 404 APPLICATIVE (`NotFoundPage`, route `*`) : la coquille est la, le
 *     routeur explique l'erreur, l'utilisateur peut repartir.
 *
 * Ce parcours exige la seconde. `NotFoundPage` pose `data-state="feature-disabled"`
 * et `data-path` (le chemin demande) sur un div reel — pas de shadow DOM, donc
 * des localisateurs stables.
 */
import { test, expect } from '@playwright/test';

const UNKNOWN = '/cette-route-nexiste-pas';

test.describe('P4 — route inconnue', () => {
  test('la 404 applicative s\'affiche et la coquille survit', async ({ page }) => {
    const response = await page.goto(UNKNOWN, { waitUntil: 'domcontentloaded' });

    // 200 : la 404 est rendue par l'APPLICATION, pas par le serveur.
    expect(response?.status()).toBe(200);

    const notFound = page.locator('[data-state="feature-disabled"]');
    await expect(notFound).toBeVisible();

    // Le chemin demande est rappele a l'utilisateur (il peut le corriger).
    await expect(notFound).toHaveAttribute('data-path', UNKNOWN);

    // La navigation reste disponible : sans elle, une 404 est un cul-de-sac.
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
  });

  test('on peut repartir de la 404 vers une destination valide', async ({ page }) => {
    await page.goto(UNKNOWN, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-state="feature-disabled"]')).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('button', { name: 'Tâches', exact: true })
      .click();

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.locator('[data-state="feature-disabled"]')).toHaveCount(0);
    await expect(page.locator('main.web-main')).not.toBeEmpty();
  });

  test('une route profonde sous un prefixe connu tombe en 404 et non en page vide', async ({ page }) => {
    // `/goals/x/y/z` n'existe pas : le routeur doit le dire, pas rendre blanc.
    await page.goto('/goals/x/y/z', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.web-main')).not.toBeEmpty();
    await expect(page.locator('[data-state="feature-disabled"]')).toBeVisible();
  });
});
