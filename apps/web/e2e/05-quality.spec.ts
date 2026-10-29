import { expect, test } from '@playwright/test';

/**
 * Parcours 5 — santé du rendu.
 *
 * Trois défauts silencieux que l'œil ne voit pas toujours mais que
 * l'utilisateur subit :
 *   - un débordement horizontal qui fait « flotter » toute la page sur mobile ;
 *   - une requête en échec (asset, module) qui casse une partie de l'écran ;
 *   - une erreur console qui annonce un état incohérent.
 */

const ROUTES = ['/', '/couleurs', '/typographie', '/espacement', '/mouvement', '/composants'];

test('aucun débordement horizontal sur un écran étroit', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/composants');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // 1 px de tolérance pour les arrondis de sous-pixel.
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const route of ROUTES) {
  test(`aucune erreur console ni requête en échec sur ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`));
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.url()} — HTTP ${r.status()}`);
    });

    await page.goto(route);
    await expect(page.locator('[data-aurora-app]')).toBeVisible();
    // Laisse le temps aux imports dynamiques et aux polices de se résoudre.
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test('la feuille de style compilée contient bien les tokens', async ({ page }) => {
  await page.goto('/');

  // Si Tailwind n'a pas scanné les sources, cette variable serait absente et
  // TOUS les composants seraient transparents — sans erreur console.
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  );
  expect(primary).toMatch(/oklch/);

  const radius = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),
  );
  expect(radius).toBe('0.75rem');
});
