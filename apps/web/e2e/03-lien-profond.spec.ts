/**
 * Parcours 3 — l'acces direct a une route profonde (SPA fallback de l'hote).
 *
 * C'est LE parcours qui casse en production et jamais en local : en dev, le
 * serveur Vite renvoie `index.html` pour tout ; chez un hebergeur statique,
 * `/goals/123` renvoie une 404 TANT QUE la regle de rewrite n'est pas posee.
 *
 * On teste donc un CHARGEMENT COMPLET (pas un clic) sur des URL profondes :
 *   - `/settings`        : route simple ;
 *   - `/goals/abc`       : route parametree (le cas qui casse le plus) ;
 *   - `/nimporte/quoi`   : inconnue -> doit atteindre le routeur et non la 404
 *                          de l'hebergeur (cf. parcours 4).
 *
 * `_redirects` (Netlify/CF Pages) et `render.yaml` (Render) portent la regle ;
 * ce test verifie qu'elle est REELLEMENT appliquee par le serveur qui sert le
 * build. Sur `vite preview`, Vite joue ce role.
 */
import { test, expect } from '@playwright/test';

const DEEP_LINKS = [
  { path: '/settings', why: 'route simple' },
  { path: '/goals/exemple-de-goal', why: 'route parametree' },
  { path: '/tasks/exemple-de-tache', why: 'route parametree imbriquee' },
] as const;

test.describe('P3 — lien profond', () => {
  for (const { path, why } of DEEP_LINKS) {
    test(`chargement direct de ${path} rend la coquille (${why})`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

      // L'hote doit repondre 200 avec la coquille, pas 404.
      expect(response?.status(), `${path} renvoie ${response?.status()} — SPA fallback absent`).toBe(200);

      // Le routeur a bien ete atteint : la nav existe...
      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
      // ...et l'URL n'a pas ete reecrite vers `/`.
      expect(new URL(page.url()).pathname).toBe(path);

      // La page n'est pas la 404 applicative.
      await expect(page.locator('[data-state="feature-disabled"]')).toHaveCount(0);
    });
  }

  test('un lien profond ne recharge pas la coquille deux fois (pas de boucle de redirect)', async ({ page }) => {
    // Une regle de rewrite mal posee (`/* -> /` au lieu de `/* -> /index.html`)
    // se traduit par une navigation en boucle ou une URL ecrasee. On compte les
    // navigations document.
    let documents = 0;
    page.on('request', (req) => {
      if (req.resourceType() === 'document') documents += 1;
    });

    await page.goto('/goals/exemple-de-goal', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

    expect(documents, 'la coquille a ete rechargee plusieurs fois : la regle de rewrite boucle').toBe(1);
  });
});
