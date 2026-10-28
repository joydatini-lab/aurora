/**
 * Garde : `supabase/config.toml` doit PARLER des fonctions qui existent.
 *
 * Pourquoi ce test (W2, 2026-10-28) : le 28/10 le bloc `[functions.*]` du
 * config.toml listait `fn_job_dispatcher`, `fn_import_course`, etc. — avec des
 * UNDERSCORES — alors que les repertoires sont `fn-job-dispatcher`,
 * `fn-import-course`... Le CLI Supabase definit la fonction par le nom de la
 * section : aucune de ces cles ne s'appliquait donc a une fonction deployee.
 * Le bug etait totalement silencieux (aucune erreur, aucun log) : le seul
 * symptome aurait ete un `verify_jwt` inoperant en prod.
 *
 * Second invariant : chaque fonction declare explicitement `verify_jwt`. Le
 * defaut du CLI est `true`, ce qui est un piege pour `fn-dev-auth` (elle
 * s'authentifie par `x-aurora-internal`, pas par un JWT). Une valeur explicite
 * force a se poser la question pour chaque nouvelle fonction.
 *
 * Pourquoi un parseur maison plutot qu'une dependance : Node 22 n'a pas de
 * parseur TOML natif, et un import reseau (`deno.land/std`) rendrait ce test
 * dependant du network en CI. La structure des sections est triviale (`[a.b]`
 * sur une ligne), un scan de lignes suffit et ne peut pas deriver.
 *
 * Lancer : node --experimental-strip-types --test supabase/functions/_shared/config.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FUNCTIONS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = join(FUNCTIONS_DIR, "..", "..");
const CONFIG_PATH = join(REPO_ROOT, "supabase", "config.toml");

/** Repertoires de fonctions reellement deployables (`_shared` exclu). */
function deployedFunctions(): string[] {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
}

/**
 * Sections `[functions.<nom>]` du config.toml, avec la valeur de `verify_jwt`
 * trouvee dans la section (undefined si la cle est absente).
 */
function declaredFunctions(): Map<string, boolean | undefined> {
  assert.ok(existsSync(CONFIG_PATH), `missing ${CONFIG_PATH}`);
  const lines = readFileSync(CONFIG_PATH, "utf8").split(/\r?\n/);

  const out = new Map<string, boolean | undefined>();
  let current: string | null = null;

  for (const line of lines) {
    const section = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (section) {
      const path = section[1].trim();
      const fn = /^functions\.([A-Za-z0-9_-]+)$/.exec(path);
      current = fn ? fn[1] : null;
      if (current && !out.has(current)) out.set(current, undefined);
      continue;
    }
    if (!current) continue;

    const kv = /^\s*verify_jwt\s*=\s*(true|false)\s*(?:#.*)?$/.exec(line);
    if (kv) out.set(current, kv[1] === "true");
  }
  return out;
}

test("chaque fonction deployee a une section [functions.<nom>] dans config.toml", () => {
  const declared = declaredFunctions();
  const dirs = deployedFunctions();

  assert.ok(dirs.length > 0, "aucun repertoire de fonction trouve — le test ne prouverait rien");

  const missing = dirs.filter((d) => !declared.has(d));
  assert.deepEqual(
    missing,
    [],
    `fonctions sans section [functions.<nom>] : ${missing.join(", ")}. ` +
      `Une section nommee avec des underscores (fn_x au lieu de fn-x) ne ` +
      `s'applique a AUCUNE fonction deployee.`,
  );
});

test("aucune section [functions.*] orpheline (nome une fonction inexistante)", () => {
  const declared = declaredFunctions();
  const dirs = new Set(deployedFunctions());

  const orphans = [...declared.keys()].filter((name) => !dirs.has(name));
  assert.deepEqual(
    orphans,
    [],
    `sections sans repertoire correspondant : ${orphans.join(", ")} — ` +
      `configuration morte (le CLI definit la fonction par le nom de section).`,
  );
});

test("chaque fonction declare verify_jwt explicitement", () => {
  const declared = declaredFunctions();

  const implicit = [...declared.entries()]
    .filter(([, jwt]) => jwt === undefined)
    .map(([name]) => name);

  assert.deepEqual(
    implicit,
    [],
    `verify_jwt absent pour : ${implicit.join(", ")} — le defaut du CLI (true) ` +
      `rend fn-dev-auth inutilisable et ne signale rien. Ecrire la valeur force ` +
      `la decision.`,
  );
});

test("seul fn-dev-auth desactive verify_jwt — et sa barriere est reelle", () => {
  const declared = declaredFunctions();

  const noJwt = [...declared.entries()]
    .filter(([, jwt]) => jwt === false)
    .map(([name]) => name);

  assert.deepEqual(
    noJwt,
    ["fn-dev-auth"],
    `verify_jwt = false n'est admis que pour fn-dev-auth (barriere ` +
      `x-aurora-internal + DEV_AUTH_ENABLED). Trouve : ${noJwt.join(", ") || "(aucun)"}.`,
  );

  // La justification doit exister dans le code, pas seulement dans le commentaire.
  const src = readFileSync(join(FUNCTIONS_DIR, "fn-dev-auth", "index.ts"), "utf8");
  assert.match(src, /INTERNAL_FN_SECRET/, "fn-dev-auth doit verifier INTERNAL_FN_SECRET");
  assert.match(src, /DEV_AUTH_ENABLED/, "fn-dev-auth doit etre gate par DEV_AUTH_ENABLED");
  assert.match(
    src,
    /DEV_AUTH_ENABLED\s*=\s*Deno\.env\.get\("DEV_AUTH_ENABLED"\)\s*===\s*"true"/,
    "DEV_AUTH_ENABLED doit exiger exactement \"true\" (fail-closed sur valeur absente)",
  );
});
