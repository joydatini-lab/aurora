#!/usr/bin/env node
/**
 * Budget bundle WEB — mesure `apps/web/dist` (W2, pivot web-only 2026-10-28).
 *
 * Ce que le gate mesure, et pourquoi :
 *
 *   - « initial » = les <script src> que `dist/index.html` charge avant toute
 *     interaction (entry + polyfills éventuels). C'est CE chiffre que le SLO
 *     02 §9.1 plafonne à 300 Ko gzip — les budgets vivent dans
 *     `apps/mobile/src/perf/budgets.ts` (PERF_BUDGETS.jsGzBytes, 307200 o),
 *     source unique : on ne redefinit pas le chiffre ici.
 *   - « total » = tous les `assets/*.js` du build, chunks lazy compris. Il est
 *     MESURE et AFFICHE mais ne fait pas echouer le gate : aucun SLO ne le
 *     plafonne aujourd'hui, et un plafond invente produirait du bruit. Le jour
 *     ou un chiffre est decide, il s'ajoute ici avec sa reference.
 *
 * Le gate est donc : `initial` gz <= PERF_BUDGETS.jsGzBytes.
 *
 * Usage :
 *   node scripts/check-web-bundle-budget.mjs [--dist apps/web/dist]
 *   (exit 0 = budget tenu ; exit 1 = depasse ; exit 2 = build absent)
 *
 * Pourquoi pas `vite build` ici : le build fait ~17 000 modules et depasse la
 * memoire du sandbox de dev (cf. docs/analysis/voie-web-2026-10-28.md §9). Ce
 * script ne compile rien : il MESURE une sortie de build, donc il tourne en CI
 * (runner >= 7 Go) ou en local apres un `pnpm -F @aurora/web build`.
 */

import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const argIdx = process.argv.indexOf("--dist");
const DIST = argIdx > -1 ? process.argv[argIdx + 1] : join(REPO_ROOT, "apps/web/dist");

/** SLO 02 §9.1 — lue depuis la SEULE source de verite des budgets. */
function readJsGzBudget() {
  const budgetsPath = join(REPO_ROOT, "apps/mobile/src/perf/budgets.ts");
  const src = readFileSync(budgetsPath, "utf8");
  const m = /jsGzBytes:\s*(\d+)/.exec(src);
  if (!m) {
    throw new Error(`PERF_BUDGETS.jsGzBytes introuvable dans ${budgetsPath}`);
  }
  return Number(m[1]);
}

function gzBytes(absPath) {
  return gzipSync(readFileSync(absPath), { level: 9 }).length;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const fmt = (n) => `${(n / 1024).toFixed(1)} Ko`;

if (!existsSync(join(DIST, "index.html"))) {
  console.error(`[bundle-budget] aucun build a mesurer : ${DIST}/index.html absent.`);
  console.error("[bundle-budget] lance d'abord : pnpm -F @aurora/web build");
  process.exit(2);
}

const html = readFileSync(join(DIST, "index.html"), "utf8");

// Scripts charges par la coquille : <script src="/assets/xxx.js"> (+ type=module).
const initialSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((src) => src.endsWith(".js"))
  // modulepreload compte aussi : il est telecharge avant l'interaction.
  .concat(
    [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((src) => src.endsWith(".js")),
  );

const uniqueInitial = [...new Set(initialSrcs)];
const missing = uniqueInitial.filter((src) => !existsSync(join(DIST, src.replace(/^\//, ""))));
if (missing.length > 0) {
  console.error(`[bundle-budget] index.html reference des fichiers absents : ${missing.join(", ")}`);
  process.exit(2);
}

const initial = uniqueInitial
  .map((src) => ({ file: src, gz: gzBytes(join(DIST, src.replace(/^\//, ""))) }))
  .sort((a, b) => b.gz - a.gz);

const initialGz = initial.reduce((s, f) => s + f.gz, 0);

const allJs = walk(join(DIST, "assets")).filter((f) => f.endsWith(".js"));
const totalGz = allJs.reduce((s, f) => s + gzBytes(f), 0);

const budget = readJsGzBudget();
const ratio = initialGz / budget;

console.log("[bundle-budget] apps/web — JS gzip");
console.log(`  budget initial (02 §9.1) : ${fmt(budget)}`);
console.log(`  initial mesure           : ${fmt(initialGz)}  (${initial.length} fichier(s), ${(ratio * 100).toFixed(1)} % du budget)`);
for (const f of initial) console.log(`    - ${f.file}  ${fmt(f.gz)}`);
console.log(`  total (tous chunks)      : ${fmt(totalGz)}  (${allJs.length} fichier(s)) — mesure, non plafonne`);
console.log(`  plus gros chunk          : ${fmt(Math.max(0, ...allJs.map(gzBytes)))}`);

if (initialGz > budget) {
  console.error(
    `[bundle-budget] ECHEC : initial ${fmt(initialGz)} > budget ${fmt(budget)} ` +
      `(+${fmt(initialGz - budget)}). Reduire l'entry ou deplacer du code en import dynamique.`,
  );
  process.exit(1);
}

console.log("[bundle-budget] OK — budget initial tenu.");
