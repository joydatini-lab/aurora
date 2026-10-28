#!/usr/bin/env node
/**
 * check-powersync-config — the gate that would have caught the PowerSync config
 * drift observed on 2026-10-27.
 *
 * WHY THIS SCRIPT EXISTS
 *
 * `powersync/sync-config.yaml` is the local SSoT of the Sync Streams. Nothing in
 * CI compares it to what is ACTIVE on the Cloud instance. On 2026-10-27 the two
 * had drifted: the local file carries 11 streams / 33 tables, while the deployed
 * config was missing the `focus_profiles` and `discovery_vault` streams. A user
 * on a fresh device silently gets a partial mirror — `focus_profiles` (0027) and
 * `discovery_vault` (0025) rows never reach SQLite — and no test, typecheck or
 * existing gate notices, because the deployed config lives on the server, not in
 * the repo.
 *
 * The existing gates prove the schema compiles (check-view-joins.ts), that RLS is
 * declared (check-rls.sh) and that the EFs match what is deployed
 * (check-ef-deployed.sh) — none of them reads `sync-config.yaml` against the
 * instance. This closes that hole, following the same exit convention as
 * check-ef-deployed.sh.
 *
 * WHAT IT DOES
 *
 *   A. STATIC CHECKS (always, no network, no DB):
 *      1. parse `powersync/sync-config.yaml`; every stream declares
 *         `auto_subscribe` and a `query` (single) or `queries` (list);
 *      2. every referenced table exists in `supabase/migrations/**` (CREATE TABLE);
 *      3. every referenced table has a `user_id` column in its CREATE TABLE block
 *         (the per-user filter `WHERE user_id = auth.user_id()`, AD-16);
 *      4. no `JOIN` inside a stream query (F-03: one stream = one module owner,
 *         never a cross-module join);
 *      5. print the stream count and the distinct table count.
 *
 *   B. LIVE CHECK (only when it can actually run):
 *      run `npx powersync fetch config --instance-id <id> --output=json`,
 *      read the returned `syncRules` (the deployed sync-config text), extract its
 *      table set and diff it against the local one. Missing tables (present
 *      locally, absent in prod) and extra tables (present in prod, absent
 *      locally) are reported. Any difference is a real drift -> exit 1.
 *      When `--remote-config <file>` is given, the JSON is read from that file
 *      instead of the network (offline comparison against a captured snapshot).
 *      When PS_ADMIN_TOKEN or the CLI is missing -> exit 2 (never 0).
 *
 * VARIABLES D'ENV (jamais codees en dur — AD-3)
 *
 *   PS_ADMIN_TOKEN        REQUIS pour le check live. PowerSync Cloud personal
 *                         access token (https://dashboard.powersync.com/account/access-tokens).
 *                         Jamais dans le depot, jamais loggue.
 *   PS_POWERSYNC_CLI      OPTIONNEL. Override de la commande CLI (defaut:
 *                         « npx --yes powersync@latest »). Ex. « powersync ».
 *
 * USAGE
 *   node scripts/check-powersync-config.mjs
 *     -> checks statiques seulement (pas de token requis).
 *
 *   PS_ADMIN_TOKEN=... node scripts/check-powersync-config.mjs \
 *     --instance-id 6ab1612e8453e7cf8338ef9a \
 *     --project-id  6ab1612d6860dd00071fcc98
 *     -> checks statiques + diff live contre l'instance Cloud.
 *
 *   node scripts/check-powersync-config.mjs --remote-config /tmp/fetched.json
 *     -> diff hors-ligne contre une config deja capturee (`--output=json`).
 *
 *   --instance-id / --project-id sont optionnels : a defaut, ils sont lus dans
 *   `powersync/cli.yaml` (instance_id / project_id). Note : le CLI PowerSync
 *   resout le project depuis l'instance (`--project-id` y est un no-op) ; on
 *   l'accepte ici pour l'affichage et pour l'override explicite.
 *
 * EXIT
 *   0  conforme — checks statiques verts et (si live) aucun ecart de tables ;
 *   1  DERIVE — un check statique echoue, ou le diff live trouve un ecart ;
 *   2  NON VERIFIABLE — token/CLI absent, fetch en echec, ou reponse illisible.
 *      (2, jamais 0 : « je n'ai pas pu verifier » n'est pas « tout va bien ».)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[check-powersync-config]";

// ---- racine du depot --------------------------------------------------------
const scriptDir = dirname(fileURLToPath(import.meta.url));
const ROOT = existsSync(join(process.cwd(), "powersync"))
  ? process.cwd()
  : resolve(scriptDir, "..");

const SYNC_CONFIG = join(ROOT, "powersync", "sync-config.yaml");
const CLI_YAML = join(ROOT, "powersync", "cli.yaml");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

// ---- arguments --------------------------------------------------------------
function parseArgs(argv) {
  const out = { instanceId: "", projectId: "", remoteConfig: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const take = (name) => {
      const eq = a.indexOf("=");
      if (eq !== -1) return a.slice(eq + 1);
      i += 1;
      return argv[i];
    };
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--instance-id" || a.startsWith("--instance-id=")) out.instanceId = take("--instance-id");
    else if (a === "--project-id" || a.startsWith("--project-id=")) out.projectId = take("--project-id");
    else if (a === "--remote-config" || a.startsWith("--remote-config=")) out.remoteConfig = take("--remote-config");
    else {
      console.error(`${TAG} argument inconnu: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log("Usage: node scripts/check-powersync-config.mjs [--instance-id <id>] [--project-id <id>] [--remote-config <json-file>]");
  console.log("  exit 0 = conforme, 1 = derive reelle, 2 = non verifiable.");
  process.exit(0);
}

// ---- helpers de lecture -----------------------------------------------------
function readIfExists(path) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : "";
  } catch {
    return "";
  }
}

/** Valeur scalaire d'une cle YAML « cle: valeur » (premiere occurrence). */
function yamlScalar(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, "m"));
  if (!m) return "";
  return m[1].replace(/^["']|["']$/g, "").trim();
}

// ---- parseur de Sync Streams ------------------------------------------------
/**
 * Parse `streams:` de sync-config.yaml. Renvoie une liste de
 * { name, autoSubscribe (string|""), sqls: string[] }.
 * Robuste : ignore les commentaires de ligne, gere `query:` et `queries:` (liste).
 */
function parseStreams(text) {
  const lines = text.split(/\r?\n/);
  const streams = [];
  let inStreams = false;
  let cur = null;
  const flush = () => {
    if (cur) streams.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/^\s*#.*$/, "");
    if (!inStreams) {
      if (/^streams:\s*$/.test(line)) inStreams = true;
      continue;
    }
    if (/^\S/.test(line)) {
      // on sort du bloc `streams:`
      flush();
      inStreams = false;
      continue;
    }
    let m;
    if ((m = line.match(/^ {2}([A-Za-z_][A-Za-z0-9_]*):\s*$/))) {
      flush();
      cur = { name: m[1], autoSubscribe: "", sqls: [] };
    } else if (cur && (m = line.match(/^ {4}auto_subscribe:\s*(\S+)/))) {
      cur.autoSubscribe = m[1];
    } else if (cur && (m = line.match(/^ {4}query:\s*(\S.*)$/))) {
      cur.sqls.push(m[1].trim());
    } else if (cur && (m = line.match(/^ {6}-\s*(\S.*)$/))) {
      cur.sqls.push(m[1].trim());
    }
  }
  flush();
  return streams;
}

/** Tables referencees par un ensemble d'instructions SQL (`FROM <table>`). */
function tablesFromSql(sqls) {
  const set = new Set();
  for (const q of sqls) {
    for (const m of q.matchAll(/\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
      set.add(m[1].toLowerCase());
    }
  }
  return set;
}

/** Toutes les tables referencees par un texte sync-config (fallback robuste). */
function tablesFromText(text) {
  const set = new Set();
  for (const m of text.matchAll(/\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    set.add(m[1].toLowerCase());
  }
  return set;
}

// ---- scan des migrations ----------------------------------------------------
function walkSql(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkSql(p, out);
    else if (p.endsWith(".sql")) out.push(p);
  }
  return out;
}

const MIGRATION_FILES = walkSql(MIGRATIONS_DIR).sort();

/** Bloc `CREATE TABLE <table> ( ... );` dans les migrations, ou null. */
function createTableBlock(table) {
  const re = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?"?${table}"?\\s*\\(`,
    "i",
  );
  for (const file of MIGRATION_FILES) {
    const text = readFileSync(file, "utf8");
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index + m[0].length - 1; // position du « ( »
    const end = text.indexOf("\n);", start);
    const block = text.slice(start, end === -1 ? text.length : end);
    return { file, block };
  }
  return null;
}

// ============================================================================
// A. CHECKS STATIQUES
// ============================================================================
const staticErrors = [];

const syncText = readIfExists(SYNC_CONFIG);
if (!syncText) {
  console.error(`${TAG} ECHEC — ${SYNC_CONFIG} introuvable ou illisible.`);
  process.exit(2);
}

const streams = parseStreams(syncText);
if (streams.length === 0) {
  console.error(`${TAG} ECHEC — aucun flux parse dans ${SYNC_CONFIG} (bloc « streams: » vide ou format inattendu).`);
  process.exit(1);
}

// 1. auto_subscribe + query/queries par flux
for (const s of streams) {
  if (!s.autoSubscribe) {
    staticErrors.push(`flux « ${s.name} » : « auto_subscribe » manquant`);
  }
  if (s.sqls.length === 0) {
    staticErrors.push(`flux « ${s.name} » : ni « query » ni « queries »`);
  }
}

// 4. pas de JOIN cross-module (F-03)
for (const s of streams) {
  for (const q of s.sqls) {
    if (/\bJOIN\b/i.test(q)) {
      staticErrors.push(`flux « ${s.name} » : JOIN interdit (F-03) — « ${q} »`);
    }
  }
}

const localTables = [...tablesFromSql(streams.flatMap((s) => s.sqls))].sort();

// 2 + 3. table existante + colonne user_id
for (const table of localTables) {
  const found = createTableBlock(table);
  if (!found) {
    staticErrors.push(`table « ${table} » referencee par un flux mais absente de ${MIGRATIONS_DIR}`);
    continue;
  }
  if (!/\buser_id\b/i.test(found.block)) {
    staticErrors.push(`table « ${table} » (${found.file.replace(`${ROOT}/`, "")}) : colonne « user_id » absente (filtre per-user, AD-16)`);
  }
}

console.log(`${TAG} statique — ${streams.length} flux, ${localTables.length} tables (${localTables.join(", ")}).`);

if (staticErrors.length > 0) {
  console.error(`${TAG} DERIVE — ${staticErrors.length} probleme(s) statique(s) dans ${SYNC_CONFIG}:`);
  for (const e of staticErrors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`${TAG} statique — OK (auto_subscribe + query/queries, tables existantes, user_id present, aucun JOIN).`);

// ============================================================================
// B. CHECK LIVE
// ============================================================================
const instanceId = args.instanceId || yamlScalar(readIfExists(CLI_YAML), "instance_id");
const projectId = args.projectId || yamlScalar(readIfExists(CLI_YAML), "project_id");

/** JSON de config distante : { config, syncRules } (cf. decodeFetchedCloudConfig). */
function fetchRemoteJson() {
  if (args.remoteConfig) {
    const p = resolve(process.cwd(), args.remoteConfig);
    if (!existsSync(p)) {
      console.error(`${TAG} ECHEC — --remote-config introuvable: ${p}`);
      process.exit(2);
    }
    return readIfExists(p);
  }

  if (!process.env.PS_ADMIN_TOKEN) {
    console.error(`${TAG} ECHEC — PS_ADMIN_TOKEN absent : diff live impossible.`);
    console.error("  Genere un PAT : https://dashboard.powersync.com/account/access-tokens");
    console.error(`  Puis : PS_ADMIN_TOKEN=... node scripts/check-powersync-config.mjs --instance-id ${instanceId || "<id>"} --project-id ${projectId || "<pid>"}`);
    console.error("  (ou compare une config capturee : --remote-config <json>)");
    process.exit(2);
  }
  if (!instanceId) {
    console.error(`${TAG} ECHEC — instance id introuvable : passe --instance-id (ou renseigne powersync/cli.yaml).`);
    process.exit(2);
  }

  const cli = (process.env.PS_POWERSYNC_CLI || "npx --yes powersync@latest").split(/\s+/);
  const [cmd, ...baseArgs] = cli;

  // « CLI dispo ? » — sinon, non verifiable (jamais 0).
  const probe = spawnSync(cmd, [...baseArgs, "--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    console.error(`${TAG} ECHEC — CLI PowerSync indisponible (${cli.join(" ")}).`);
    console.error("  Installe-le (npm i -g powersync) ou definit PS_POWERSYNC_CLI.");
    process.exit(2);
  }

  // `--project-id` est un no-op du CLI (le project est resolu depuis l'instance) :
  // on ne le transmet pas, on l'utilise seulement pour l'affichage/override.
  const res = spawnSync(
    cmd,
    [...baseArgs, "fetch", "config", "--instance-id", instanceId, "--output=json"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (res.error) {
    console.error(`${TAG} ECHEC — appel CLI impossible : ${String(res.error)}`);
    process.exit(2);
  }
  if (res.status !== 0) {
    console.error(`${TAG} ECHEC — « fetch config » a echoue (exit ${res.status}) : ${(res.stderr || "").trim()}`);
    process.exit(2);
  }
  return res.stdout;
}

const remoteRaw = fetchRemoteJson();

let remoteJson;
try {
  remoteJson = JSON.parse(remoteRaw);
} catch (e) {
  console.error(`${TAG} ECHEC — reponse distante non JSON : ${String(e)}`);
  process.exit(2);
}

const remoteSyncRules = remoteJson?.syncRules ?? remoteJson?.sync_rules;
if (typeof remoteSyncRules !== "string" || remoteSyncRules.trim() === "") {
  console.error(`${TAG} ECHEC — le JSON distant ne contient pas de « syncRules » exploitable.`);
  process.exit(2);
}

const remoteStreams = parseStreams(remoteSyncRules);
const remoteTables = new Set(
  remoteStreams.length > 0
    ? tablesFromSql(remoteStreams.flatMap((s) => s.sqls))
    : tablesFromText(remoteSyncRules),
);

const localSet = new Set(localTables);
const missing = [...localSet].filter((t) => !remoteTables.has(t)).sort();
const extra = [...remoteTables].filter((t) => !localSet.has(t)).sort();

const source = args.remoteConfig ? `fichier ${args.remoteConfig}` : `instance ${instanceId}`;
console.log(
  `${TAG} live — ${source} : ${remoteStreams.length || "?"} flux, ${remoteTables.size} tables ` +
    `(local: ${streams.length} flux, ${localSet.size} tables).`,
);

if (missing.length > 0 || extra.length > 0) {
  console.error(`${TAG} DERIVE — la config locale et la config active divergent.`);
  if (missing.length > 0) {
    console.error(`  MANQUANTES en distant (presentes en local, ${missing.length}) : ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    console.error(`  EN SURPLUS en distant (absentes en local, ${extra.length}) : ${extra.join(", ")}`);
  }
  console.error(`  Remediation : PS_ADMIN_TOKEN=... npx powersync deploy sync-config`);
  process.exit(1);
}

console.log(`${TAG} live — OK : les ${localSet.size} tables locales sont presentes a l'identique en distant.`);
process.exit(0);
