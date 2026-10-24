#!/usr/bin/env node
/**
 * build-ef — bundle the Supabase Edge Functions so they can actually deploy.
 *
 * WHY THIS EXISTS
 *
 * `supabase functions deploy <name>` uploads the function's source and walks
 * its import graph. This script guarantees the result is SELF-CONTAINED, so
 * deployment cannot fail on a resolution boundary no matter which CLI version
 * or bundling path runs.
 *
 * Measured on the live project (sflsupabase, 2026-10-24): 5 EFs are ACTIVE
 * and 3 are missing entirely.
 *
 *   ACTIVE   fn-agent-run        workspace imports: 0
 *   ACTIVE   fn-import-course    workspace imports: 0
 *   ACTIVE   fn-notifications    workspace imports: 0
 *   ACTIVE   fn-skills           workspace imports: 0
 *   ACTIVE   fn-dev-auth         workspace imports: 0
 *   MISSING  fn-canvas           workspace imports: 0
 *   MISSING  fn-integrations     workspace imports: 2
 *   MISSING  fn-job-dispatcher   workspace imports: 10
 *
 * The correlation between "imports workspace packages" and "never deployed"
 * is real but NOT the whole cause, and fn-canvas is the counterexample: it has
 * zero workspace imports and is still absent. The proximate cause of all three
 * gaps is that deployment stopped — the CI deploy job is `if: false` pending
 * OQ-03, and the last manual deploys were 2026-09-30..2026-10-07, before these
 * three were written.
 *
 * Separately and independently, fn-job-dispatcher had a hard boot bug: it
 * imported two symbols that did not exist (see scripts/check-ef-imports.mjs),
 * so it could not have run even if deployed.
 *
 * Bundling remains the right hardening either way. The modern CLI resolves the
 * import-walk boundary up to the nearest git root and documents that monorepo
 * files outside the workdir "can still deploy"; the older/legacy and Docker
 * bundling paths are narrower. A self-contained bundle removes the question.
 * WHAT IT DOES
 *
 * Bundles each `supabase/functions/<name>/index.ts` into a single self-contained
 * ES module at `supabase/functions/<name>/dist/index.ts`, with the workspace
 * packages inlined. `supabase functions deploy <name>` then uploads the bundle
 * instead of the raw source. Deno built-ins and remote (npm:/jsr:/https:)
 * specifiers stay external, as the Edge Runtime provides them.
 *
 * Usage:
 *   node scripts/build-ef.mjs              # bundle every EF
 *   node scripts/build-ef.mjs fn-canvas    # bundle one
 *
 * Exit 0 = every requested EF bundled. Exit 1 = at least one failed.
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const EF_DIR = join(ROOT, "supabase", "functions");

// esbuild is a transitive dependency, not a root one, so resolve it by path
// rather than by bare specifier (Node cannot see it from the workspace root).
const require = createRequire(import.meta.url);
function loadEsbuild() {
  try {
    return require("esbuild");
  } catch {
    const pnpm = join(ROOT, "node_modules", ".pnpm");
    const dir = readdirSync(pnpm).find((d) => d.startsWith("esbuild@"));
    if (!dir) throw new Error("esbuild not found in node_modules/.pnpm — run `pnpm install`");
    return require(join(pnpm, dir, "node_modules", "esbuild"));
  }
}

const esbuild = loadEsbuild();

/**
 * Resolve a bare npm specifier to the `npm:name@version` form Deno's Edge
 * Runtime understands, keeping it external.
 *
 * This matters because `packages/agent` imports the Vercel `ai` SDK, which
 * pulls `@ai-sdk/gateway` -> `@vercel/oidc`. That last one is CJS and calls
 * `require("fs")`. Inlining it would embed a `require` call that the Edge
 * Runtime cannot execute. Leaving the dependency as `npm:ai@7.0.138` lets the
 * runtime install and resolve it natively instead.
 */
function npmVersion(name) {
  try {
    const pkg = join(ROOT, "node_modules", ...name.split("/"), "package.json");
    const v = JSON.parse(readFileSync(pkg, "utf8")).version;
    return v;
  } catch {
    // Not a direct dependency (pnpm hoists into .pnpm) — omit the version and
    // let the runtime resolve the latest matching range.
    return null;
  }
}

const npmExternalPlugin = {
  name: "npm-external",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      const p = args.path;
      if (p.startsWith("node:") || p.startsWith("npm:") || p.startsWith("jsr:")) {
        return { path: p, external: true };
      }
      if (/^https?:\/\//.test(p)) return { path: p, external: true };
      // A Node builtin reached through CJS `require()`: keep it external.
      if (NODE_BUILTINS.has(p)) return { path: p, external: true };
      // Workspace packages MUST be inlined — that is the entire reason this
      // script exists. pnpm symlinks them into node_modules, so without this
      // guard they look like ordinary npm packages and would be left external
      // as `npm:@aurora/...`, which is not published and cannot be installed.
      if (p.startsWith("@aurora/")) return undefined;
      // A bare third-party npm package: hand it to Deno as an npm: specifier.
      // The Edge Runtime installs these natively, and keeping them external
      // avoids inlining CJS (which may call `require`, unusable in Deno).
      const version = npmVersion(p);
      return { path: version ? `npm:${p}@${version}` : `npm:${p}`, external: true };
    });
  },
};

const NODE_BUILTINS = new Set([
  "fs", "path", "os", "crypto", "stream", "util", "events", "buffer",
  "child_process", "process", "url", "zlib", "http", "https", "net",
  "tty", "assert", "querystring", "worker_threads", "async_hooks", "dns",
  "module", "diagnostics_channel", "perf_hooks", "readline", "string_decoder",
  "timers", "v8", "vm", "tls", "dgram", "cluster", "constants", "domain",
  "inspector", "punycode", "repl", "sys", "trace_events",
]);

/** Every EF that has an index.ts, minus any already-built dist/ directory. */
function functions() {
  return readdirSync(EF_DIR)
    .filter((e) => e.startsWith("fn-") && statSync(join(EF_DIR, e)).isDirectory())
    .filter((e) => {
      try {
        return statSync(join(EF_DIR, e, "index.ts")).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/** Count the workspace-package imports an EF needs (the deploy blocker). */
function packageImports(file) {
  const src = readFileSync(file, "utf8");
  return (src.match(/from\s+"\.\.\/\.\.\/\.\.\/packages\//g) ?? []).length;
}

async function bundle(name) {
  const entry = join(EF_DIR, name, "index.ts");
  const outDir = join(EF_DIR, name, "dist");
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    // Deno's runtime, not Node: the Edge Runtime supplies the built-ins.
    platform: "neutral",
    format: "esm",
    target: "es2022",
    write: false,
    // npm-external plugin: workspace packages are INLINED (that is the whole
    // point), while npm/builtin/remote specifiers stay external for Deno.
    plugins: [npmExternalPlugin],
    // The Edge Runtime is not a browser and not Node; mark the globals it has.
    banner: {
      js: "// GENERATED by scripts/build-ef.mjs — do not edit. Source: index.ts",
    },
    logLevel: "silent",
  });
  const out = result.outputFiles[0];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.ts"), out.contents);
  return out.contents.length;
}

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : functions();
const failed = [];

for (const name of targets) {
  const entry = join(EF_DIR, name, "index.ts");
  try {
    statSync(entry);
  } catch {
    console.error(`[build-ef] ${name}: no index.ts at ${entry}`);
    failed.push(name);
    continue;
  }
  const deps = packageImports(entry);
  try {
    const bytes = await bundle(name);
    const kb = (bytes / 1024).toFixed(0);
    const note = deps > 0 ? ` (inlined ${deps} workspace imports)` : "";
    console.log(`[build-ef] ${name}: ok ${kb} KB${note}`);
  } catch (e) {
    console.error(`[build-ef] ${name}: FAILED — ${String(e).slice(0, 300)}`);
    failed.push(name);
  }
}

if (failed.length === 0) {
  console.log(`[build-ef] ${targets.length} Edge Function(s) bundled -> supabase/functions/<name>/dist/index.ts`);
  process.exit(0);
}
console.error(`[build-ef] ${failed.length} failure(s): ${failed.join(", ")}`);
process.exit(1);
