/**
 * Parcours 2 — naviguer entre les 5 destinations par le chrome de la coquille.
 *
 * Ce parcours verifie le contrat du `WebShell` : 5 destinations maximum
 * (02 S6.1), un etat actif expose par `data-active`, et un changement de route
 * qui n'exige AUCUN rechargement (sinon l'offline-first perd son interet).
 *
 * Note : on n'assert pas le contenu metier des ecrans (il depend d'une session
 * et d'un mirror local) — seulement que la route s'installe et que la coquille
 * survit. Une page qui jetterait au rendu demonterait la navigation : le test
 * echoue alors, a raison.
 */
import { test, expect, type Page } from '@playwright/test';

/** Les 5 destinations declarees dans WebShell (NAV), plus les Reglages. */
const DESTINATIONS = [
  { label: 'Accueil', path: '/home' },
  { label: 'Tâches', path: '/tasks' },
  { label: 'Apprendre', path: '/learn' },
  { label: 'Progrès', path: '/progress' },
  { label: 'Agent', path: '/agent' },
] as const;

const navOf = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });

test.describe('P2 — navigation', () => {
  test('les 5 destinations principales sont presentes, une fois chacune', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = navOf(page);
    await expect(nav).toBeVisible();

    for (const { label } of DESTINATIONS) {
      await expect(nav.getByRole('button', { name: label, exact: true })).toHaveCount(1);
    }
    await expect(nav.getByRole('button', { name: 'Réglages', exact: true })).toHaveCount(1);

    // 5 onglets max est un budget produit, pas une preference : la 6e
    // destination doit passer par un autre chemin (Reglages, ici hors liste).
    await expect(nav.getByRole('button')).toHaveCount(DESTINATIONS.length + 1);
  });

  test('chaque destination s\'installe sans rechargement et marque son etat actif', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Repere de survie : si une page jette au rendu, React demonte l'arbre et
    // ce marqueur disparait -> on echoue avec un message lisible.
    await page.evaluate(() => {
      (window as unknown as { __auroraShellSurvivedNav?: boolean }).__auroraShellSurvivedNav = true;
    });

    // `/agent` est EXCLU de la boucle : sur cette destination le chrome
    // s'efface (WebShell rend la nav seulement si !isAgent, l'ecran agent gere
    // son propre menu). Le contrat est verifie separement juste apres.
    for (const { label, path } of DESTINATIONS.filter((d) => d.path !== '/agent')) {
      const nav = navOf(page);
      await nav.getByRole('button', { name: label, exact: true }).click();

      // Navigation CLIENT : l'URL change...
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      // ...et le contexte JS survit (aucun document reload).
      expect(
        await page.evaluate(
          () => (window as unknown as { __auroraShellSurvivedNav?: boolean }).__auroraShellSurvivedNav,
        ),
        `un rechargement complet a eu lieu en allant vers ${path} — la navigation doit rester cliente`,
      ).toBe(true);

      // ...et l'etat actif suit.
      await expect(nav.getByRole('button', { name: label, exact: true })).toHaveAttribute(
        'data-active',
        'true',
      );
      const others = DESTINATIONS.filter((d) => d.path !== path && d.path !== '/agent');
      for (const other of others) {
        await expect(
          nav.getByRole('button', { name: other.label, exact: true }),
        ).toHaveAttribute('data-active', 'false');
      }
    }
  });

  test("sur /agent le chrome s'efface (l'ecran gere son propre menu)", async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await navOf(page).getByRole('button', { name: 'Agent', exact: true }).click();

    await expect(page).toHaveURL(/\/agent$/);
    // Contrat explicite du shell : pas de nav sur l'assistant.
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0);
    await expect(page.locator('.web-shell')).toHaveAttribute('data-agent', 'true');
    await expect(page.locator('main.web-main')).not.toBeEmpty();
  });

  test('Reglages est accessible depuis la coquille', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await navOf(page).getByRole('button', { name: 'Réglages', exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.locator('main.web-main')).not.toBeEmpty();
  });
});
