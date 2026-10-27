#!/usr/bin/env node
/**
 * check-ef-imports — close the gate hole that let fn-job-dispatcher rot.
 *
 * supabase/functions/** appears in NO tsconfig, so `pnpm -r typecheck` never
 * reads it. The EFs are the one part of the repo the gate was blind to, and
 * that is exactly where a real defect lived: fn-job-dispatcher imported
 * PROGRESS_FSRS_TICK_HANDLER and PROGRESS_COURSE_IMPORT_HANDLER from
 * packages/progress/src/jobs.ts, and neither symbol exists there. The EF
 * could not boot, so it was never deployed, and 34 cron jobs sat pending
 * from 2026-10-08 (16 days).
 *
 * Uses the TypeScript compiler API (already a workspace dep) so import
 * resolution is real, not a regex guess: type-only imports, `export *`,
 * re-exports and .ts extension mapping all resolve correctly.
 *
 * Exit 0 = every named import in supabase/functions/** resolves.
 * Exit 1 = prints each dead import with file, specifier and symbol.
 */
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();
const EF_DIR = join(ROOT, "supabase", "functions");
const rel = (p) => relative(ROOT, p);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Resolve a relative specifier to a real file on disk (handles .ts / index.ts). */
function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch { /* keep looking */ }
  }
  return null;
}

/** Exported names of a source file, via the real compiler (includes re-exports). */
const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const checker = programFor(file).getTypeChecker();
  const sf = programFor(file).getSourceFile(file);
  const names = new Set();
  if (sf) {
    const moduleSymbol = checker.getSymbolAtLocation(sf);
    if (moduleSymbol) {
      for (const s of checker.getExportsOfModule(moduleSymbol)) names.add(s.getName());
    }
  }
  void source;
  exportCache.set(file, names);
  return names;
}

// One program per file keeps this dependency-free and avoids a giant graph.
const programs = new Map();
function programFor(file) {
  if (!programs.has(file)) {
    programs.set(file, ts.createProgram([file], {
      target: ts.ScriptTarget.Latest,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowImportingTsExtensions: true,
      noResolve: false,
      skipLibCheck: true,
    }));
  }
  return programs.get(file);
}

const files = walk(EF_DIR);
const bad = [];
let checkedImports = 0;
let checkedSymbols = 0;

for (const file of files) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const spec = stmt.moduleSpecifier;
    if (!ts.isStringLiteral(spec) || !spec.text.startsWith(".")) continue;
    const named = stmt.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    const target = resolveSpecifier(file, spec.text);
    checkedImports += 1;
    if (!target) {
      bad.push({ file, spec: spec.text, symbol: "(module)", reason: "module introuvable sur disque" });
      continue;
    }
    const exported = exportsOf(target);
    for (const el of named.elements) {
      const imported = el.propertyName ?? el.name;
      const symbol = imported.getText(sf);
      checkedSymbols += 1;
      if (!exported.has(symbol)) {
        bad.push({
          file, spec: spec.text, symbol,
          reason: `non exporte par ${rel(target)}`,
        });
      }
    }
  }
}

if (bad.length === 0) {
  console.log(`[check-ef-imports] OK — ${checkedSymbols} symboles importes resolus sur ${checkedImports} imports inter-packages (${files.length} fichiers EF).`);
  process.exit(0);
}
console.error(`[check-ef-imports] ECHEC — ${bad.length} import(s) mort(s) dans supabase/functions/ :`);
for (const b of bad) {
  console.error(`  ${rel(b.file)}`);
  console.error(`    importe { ${b.symbol} } depuis "${b.spec}"`);
  console.error(`    -> ${b.reason}`);
}
process.exit(1);
