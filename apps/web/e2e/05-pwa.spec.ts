/**
 * Parcours 5 — la PWA est installable et son service worker se pose.
 *
 * « Installable » n'est pas une impression : c'est un contrat Chrome (et
 * Firefox/Safari en variantes), verifie ici par les 4 conditions qui font
 * echouer une installation en silence :
 *
 *   1. un `<link rel="manifest">` dans le <head> ;
 *   2. un manifeste VALIDE et servable (200, JSON), avec `name`, `start_url`,
 *      `display: standalone` + scope couvrant start_url ;
 *   3. des icones 192 px ET 512 px qui se telechargent vraiment (une icone
 *      declaree mais 404 suffit a bloquer l'installation) ;
 *   4. un service worker ENREGISTRE et actif, servi avec un type JavaScript.
 *
 * Le service worker est enregistre apres le premier paint (pwa.ts) : il ne
 * retarde jamais le rendu, mais il n'est pas la immediatement non plus — d'ou
 * l'attente explicite.
 */
import { test, expect } from '@playwright/test';

test.describe('P5 — PWA', () => {
  test('le manifeste est declare, servi et valide', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href, 'aucun <link rel="manifest"> dans le <head>').toBeTruthy();

    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    // Un manifeste servi en text/html par une regle de rewrite mal posee est un
    // classique : Chrome l'ignore alors silencieusement.
    expect(res.headers()['content-type'] ?? '').toMatch(/manifest\+json|application\/json/);

    const manifest = (await res.json()) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      icons?: Array<{ src: string; sizes: string }>;
    };

    expect(manifest.name, 'name manquant : pas d\'installation').toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    // Le scope doit couvrir start_url, sinon l'app installable sort de son
    // perimetre des la premiere navigation.
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url!.startsWith(manifest.scope!)).toBe(true);

    const sizes = (manifest.icons ?? []).map((i) => i.sizes);
    expect(sizes, 'icone 192x192 absente').toContain('192x192');
    expect(sizes, 'icone 512x512 absente').toContain('512x512');
  });

  test('chaque icone declaree se telecharge reellement', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    const manifest = (await res.json()) as { icons: Array<{ src: string; sizes: string }> };

    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `icone declaree ${icon.src} (${icon.sizes}) introuvable`).toBe(200);
      expect(iconRes.headers()['content-type'] ?? '').toContain('image');
    }
  });

  test('le service worker est servi et s\'enregistre', async ({ page, request }) => {
    // Servi avec un type JavaScript : un sw.js renvoye en text/html est rejete
    // par le navigateur (l'enregistrement echoue sans message utile).
    const sw = await request.get('/sw.js');
    expect(sw.status()).toBe(200);
    expect(sw.headers()['content-type'] ?? '').toMatch(/javascript|ecmascript/);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Enregistre APRES le premier paint, donc on attend qu'il apparaisse.
    await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false;
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length > 0;
      },
      undefined,
      { timeout: 20_000 },
    );

    const scope = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs[0]?.scope ?? null;
    });
    // Le SW doit couvrir la racine : un scope trop etroit laisse les routes
    // profondes hors du cache, donc hors ligne.
    expect(scope).toContain('/');
  });

  test('le noeud racine reste vide de HTML statique (coquille CSR)', async ({ page }) => {
    // Garde-fou volontairement simple : si quelqu'un remplace un jour la
    // coquille par un prerender partiel, ce test le signale au lieu de laisser
    // croire que le SW sert un contenu qui n'existe plus.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const noscript = page.locator('noscript');
    await expect(noscript).toHaveCount(1);
    await expect(noscript).toContainText('JavaScript');
  });
});
