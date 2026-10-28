/**
 * L5 — PREUVE NAVIGATEUR du parcours vertical (critères L5 #1 et #4).
 *
 * CE QUE CE SCRIPT MESURE
 *   1. l'app boote, l'écran de capture se monte ;
 *   2. une capture écrite par le VRAI chemin (module → kernel → apply →
 *      miroir local) apparaît dans la liste — donc la lecture réactive
 *      fonctionne ;
 *   3. après un RELOAD COMPLET, la tâche est toujours là — donc elle a bien
 *      été PERSISTÉE dans WASQLite/IndexedDB, pas gardée en mémoire ;
 *   4. l'état UX est honnête : sans session Supabase, on est en `offline`,
 *      pas en `partial` déguisé.
 *
 * CE QU'IL NE MESURE PAS (documenté, pas prétendu) : le round-trip serveur
 * (aucune session live disponible) et le RLS positif. Voir le rapport.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// `playwright` est un devDependency de `@aurora/ui` (browsers de test), pas de
// `web-app`. Plutôt que de dupliquer la déclaration, on ancre la résolution
// sur ce paquet — la preuve reste dans le dépôt, sans nouvelle dépendance.
const require = createRequire(
  fileURLToPath(new URL('../../../packages/ui/package.json', import.meta.url)),
);
const { chromium } = require('playwright');

const BASE = process.env.PROOF_URL ?? 'http://127.0.0.1:12000';
/**
 * `dev` (defaut) : serveur de dev — l'identite locale de preuve est ARMEE,
 *                  donc on peut capturer et verifier la persistance.
 * `prod`         : bundle de PRODUCTION — la branche dev est ELIMINEE par
 *                  Vite. On verifie donc la DEGRADATION HONNETE : aucune
 *                  affordance de dev, capture desactivee faute d'utilisateur
 *                  (AD-7 : sans `userId` il n'y a pas d'ecriture possible).
 */
const MODE = process.env.PROOF_MODE ?? 'dev';
const results = [];
const check = (ok, label) => {
  results.push({ ok, label });
  console.log(`${ok ? 'ok  ' : 'FAIL'} — ${label}`);
};

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

try {
  // ---- 1. boot + montage de l'écran -------------------------------------
  await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="capture-screen"]', { timeout: 30000 });
  check(true, 'l’écran de capture se monte sur /tasks');

  // La bannière d'état doit être HONNÊTE (pas de « Synchronisé » sans session).
  const banner = (await page.textContent('[data-testid="sync-banner"]')) ?? '';
  if (MODE === 'prod') {
    // Le bundle de production ne doit contenir AUCUNE affordance de dev.
    check(
      !/développement/i.test(banner),
      `PROD: aucune affordance de dev dans la bannière (reçu: "${banner.trim()}")`,
    );
    check(
      /Hors ligne|Initialisation/.test(banner),
      `PROD: la bannière annonce la dégradation honnête (reçu: "${banner.trim()}")`,
    );
    const disabled = await page.getAttribute('[data-testid="capture-input"]', 'disabled');
    check(
      disabled !== null,
      'PROD: la capture est DÉSACTIVÉE sans session (AD-7 : pas d’userId → pas d’écriture)',
    );
  } else {
    check(
      /Session locale de développement|Hors ligne|Initialisation/.test(banner),
      `la bannière dit la vérité sans session (reçu: "${banner.trim()}")`,
    );
  }

  // En PROD on s'arrete ici : la capture est volontairement impossible.
  if (MODE === 'prod') {
    const realErrors0 = consoleErrors.filter(
      (e) => !/favicon|Failed to load resource.*404/.test(e),
    );
    check(realErrors0.length === 0, `PROD: aucune erreur console (${realErrors0.length})`);
  } else {
  // ---- 2. capture ------------------------------------------------------
  const title = `Preuve L5 ${Date.now()}`;
  await page.fill('[data-testid="capture-input"]', title);
  await page.click('[data-testid="capture-submit"]');
  await page.waitForSelector('[data-testid="task-row"]', { timeout: 20000 });

  // La ligne s'affiche AVANT la durabilité (le store notifie en synchrone).
  // Le signal « enregistré » est le champ qui se vide : l'écran ne le vide
  // qu'APRÈS `await apply()` — donc après le point de durabilité (AD-7).
  // Sans cette attente, le reload ci-dessous course l'écriture en vol.
  await page.waitForFunction(
    () => document.querySelector('[data-testid="capture-input"]')?.value === '',
    null,
    { timeout: 20000 },
  );
  check(true, 'l’écran signale l’écriture durable (champ vidé après apply)');

  const titles = await page.$$eval('[data-testid="task-title"]', (els) =>
    els.map((e) => e.textContent?.trim()),
  );
  check(titles.includes(title), 'la tâche captée apparaît dans la liste (lecture réactive)');

  // L'état est passé de « vide » à « hors-ligne » (des lignes + pas de session).
  const ux = await page.getAttribute('[data-testid="task-list"]', 'data-count');
  check(Number(ux) >= 1, `la liste porte au moins une ligne (data-count=${ux})`);

  // ---- 3. reload : la persistance est réelle ---------------------------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="capture-screen"]', { timeout: 30000 });
  // Le miroir se re-ouvre depuis IndexedDB : on attend la ligne.
  await page.waitForSelector('[data-testid="task-row"]', { timeout: 30000 });
  const titlesAfter = await page.$$eval('[data-testid="task-title"]', (els) =>
    els.map((e) => e.textContent?.trim()),
  );
  check(
    titlesAfter.includes(title),
    'APRÈS RELOAD la tâche est toujours là (persistée dans WASQLite/IndexedDB)',
  );

  // ---- 4. pas d'erreur console inattendue ------------------------------
  const realErrors = consoleErrors.filter(
    (e) => !/favicon|Failed to load resource.*404/.test(e),
  );
  check(
    realErrors.length === 0,
    `aucune erreur console (${realErrors.length})${realErrors.length ? ': ' + realErrors.slice(0, 2).join(' | ') : ''}`,
  );
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées`);
process.exit(failed.length === 0 ? 0 : 1);
