#!/usr/bin/env node
/**
 * check-ef-bundles — the deployment gate the repo was missing.
 *
 * `supabase functions deploy <name>` walks the function's import graph from
 * its entrypoint. This asserts the bundle build-ef.mjs produces is
 * self-contained, so no deploy-time resolution boundary can break it.
 *
 * Live state measured 2026-10-24: 5 EFs ACTIVE, 3 missing (fn-canvas,
 * fn-integrations, fn-job-dispatcher). The deploy job has been `if: false`
 * pending OQ-03 since before those three were written — that is the proximate
 * cause. The two workspace-importing ones additionally could not boot at all
 * (fn-job-dispatcher imported 2 non-existent symbols).
 *
 * This asserts the bundle that build-ef.mjs produces is actually deployable:
 *   1. every EF bundles without error;
 *   2. no workspace path (../../../packages/) survives in the output;
 *   3. no `require(` call survives (Deno cannot execute CJS require);
 *   4. no bare specifier survives — npm/builtin deps must be externalised as
 *      `npm:` or `node:` so the Edge Runtime can resolve them.
 *
 * Runs build-ef.mjs itself so the check cannot pass on a stale bundle.
 *
 * Exit 0 = every EF bundled and deployable. Exit 1 = the reason, per EF.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EF_DIR = join(ROOT, "supabase", "functions");

// 1. Rebuild from source so a stale dist/ can never satisfy this check.
try {
  execFileSync("node", [join(ROOT, "scripts", "build-ef.mjs")], {
    stdio: "pipe",
    cwd: ROOT,
  });
} catch (e) {
  console.error("[check-ef-bundles] build-ef.mjs failed — no bundle to verify.");
  console.error(String(e.stdout ?? e.message).slice(0, 2000));
  process.exit(1);
}

const names = readdirSync(EF_DIR)
  .filter((e) => e.startsWith("fn-") && statSync(join(EF_DIR, e)).isDirectory())
  .sort();

const problems = [];
let checked = 0;

for (const name of names) {
  const bundle = join(EF_DIR, name, "dist", "index.ts");
  let src;
  try {
    src = readFileSync(bundle, "utf8");
  } catch {
    problems.push({ name, issue: "no dist/index.ts — not bundled" });
    continue;
  }
  checked += 1;

  // 2. No workspace path may survive: it would not exist on the Edge Runtime.
  const pkgPath = src.match(/["'][^"']*\.\.\/\.\.\/\.\.\/packages\//g);
  if (pkgPath) {
    problems.push({
      name,
      issue: `${pkgPath.length} unresolved workspace import(s), e.g. ${pkgPath[0]}`,
    });
  }

  // 3. No CJS require(): Deno's Edge Runtime has no require.
  const requires = src.match(/\brequire\s*\(/g);
  if (requires) {
    problems.push({ name, issue: `${requires.length} require() call(s) — CJS inlined` });
  }

  // 4. Every remaining import specifier must be resolvable by Deno: a relative
  //    path inside the bundle, or npm:/node:/jsr:/http(s):. A bare specifier
  //    (e.g. `from "zod"`) means a dependency was neither inlined nor
  //    externalised correctly.
  // Anchor to line starts: `import x from "s"` / `import "s"` / `export ... from "s"`.
  // A looser pattern also matches object-literal keys (`{ import: ... }`) and
  // produces phantom bare specifiers.
  const specs = [
    ...src.matchAll(/^\s*(?:import|export)[^\n]*?from\s*["']([^"']+)["']/gm),
    ...src.matchAll(/^\s*import\s*["']([^"']+)["']/gm),
  ].map((m) => m[1]);
  const bare = specs.filter(
    (s) =>
      !s.startsWith(".") &&
      !s.startsWith("/") &&
      !s.startsWith("npm:") &&
      !s.startsWith("node:") &&
      !s.startsWith("jsr:") &&
      !/^https?:\/\//.test(s),
  );
  if (bare.length > 0) {
    const uniq = [...new Set(bare)];
    problems.push({
      name,
      issue: `${uniq.length} bare specifier(s) the Edge Runtime cannot resolve: ${uniq.slice(0, 4).join(", ")}`,
    });
  }
}

if (problems.length === 0) {
  console.log(`[check-ef-bundles] OK — ${checked} Edge Function bundle(s) deployable.`);
  process.exit(0);
}
console.error(`[check-ef-bundles] ECHEC — ${problems.length} problem(s):`);
for (const p of problems) console.error(`  ${p.name}: ${p.issue}`);
process.exit(1);
