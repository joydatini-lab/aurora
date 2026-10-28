#!/usr/bin/env node
/**
 * dev-auth.mjs — piloter `fn-dev-auth` DEPUIS UN TERMINAL (jamais depuis le bundle).
 *
 * Pourquoi ce script existe
 * ------------------------
 * `fn-dev-auth` sert à préparer les comptes de développement : lister, fixer un
 * mot de passe, tester une connexion. Il est protégé par DEUX gates :
 *
 *   1. `DEV_AUTH_ENABLED=true` côté fonction (sinon 404, invisible) ;
 *   2. l'en-tête `x-aurora-internal` doit égaler `INTERNAL_FN_SECRET` (sinon 401).
 *
 * Or un navigateur ne peut pas porter ce secret : tout ce qui entre dans un
 * bundle est public. La version précédente embarquait donc les emails, les mots
 * de passe ET l'URL de la fonction dans `login/index.tsx` — et appelait la
 * fonction sans le secret, ce qui n'a de sens que si la fonction est ouverte à
 * tous. C'était le cas : n'importe qui pouvait réinitialiser n'importe quel mot
 * de passe.
 *
 * Le compromis retenu : le secret reste dans TON environnement (`.env.dev`,
 * gitignoré), et c'est ce script qui parle à la fonction. Le confort de dev ne
 * dépend plus de l'exposition d'un endpoint.
 *
 * Usage
 * -----
 *   node scripts/dev-auth.mjs list
 *   node scripts/dev-auth.mjs set-password <email> <nouveau-mot-de-passe>
 *   node scripts/dev-auth.mjs signin <email> <mot-de-passe>
 *   node scripts/dev-auth.mjs check                 # les 2 gates répondent-elles ?
 *
 * Configuration (`.env.dev` à la racine, ou variables d'environnement) :
 *   SUPABASE_URL=              # https://<ref>.supabase.co
 *   INTERNAL_FN_SECRET=        # le même que côté fonction (Supabase secrets)
 *
 * Rien n'est journalisé en clair : ni le secret, ni le mot de passe.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(REPO_ROOT, '.env.dev');

/** Parseur `.env` minimal (pas de dépendance, pas d'interpolation). */
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(ENV_FILE);
const env = (key) => process.env[key] ?? fileEnv[key] ?? '';

const SUPABASE_URL = env('SUPABASE_URL').replace(/\/+$/, '');
const INTERNAL_FN_SECRET = env('INTERNAL_FN_SECRET');

const FN_URL = `${SUPABASE_URL}/functions/v1/fn-dev-auth`;

function usage(code = 0) {
  const out = code === 0 ? console.log : console.error;
  out(`dev-auth — piloter fn-dev-auth depuis un terminal

  node scripts/dev-auth.mjs list
  node scripts/dev-auth.mjs set-password <email> <mot-de-passe>
  node scripts/dev-auth.mjs signin <email> <mot-de-passe>
  node scripts/dev-auth.mjs check

Configuration : .env.dev à la racine (gitignoré)
  SUPABASE_URL=https://<ref>.supabase.co
  INTERNAL_FN_SECRET=<le secret partagé de la fonction>

Codes de sortie : 0 ok · 1 appel refusé ou échec · 2 configuration manquante`);
  process.exit(code);
}

function requireConfig() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!INTERNAL_FN_SECRET) missing.push('INTERNAL_FN_SECRET');
  if (missing.length > 0) {
    console.error(`Configuration manquante : ${missing.join(', ')}`);
    console.error(`Renseigne ${ENV_FILE} (modèle : .env.dev.example).`);
    process.exit(2);
  }
}

/** Appel unique, avec les DEUX gates attendus par la fonction. */
async function call(body) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Gate 2 — le secret ne quitte jamais ce process.
      'x-aurora-internal': INTERNAL_FN_SECRET,
    },
    body: JSON.stringify(body),
  });

  let payload = null;
  const text = await res.text();
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 400) };
  }

  if (res.status === 401) {
    throw new Error(
      '401 — INTERNAL_FN_SECRET ne correspond pas à celui de la fonction (gate 2). ' +
        'Vérifie `supabase secrets list`.',
    );
  }

  // 404 est AMBIGU : la fonction renvoie un 404 en texte brut quand elle est
  // désactivée (gate 1), et un 404 JSON quand une action ne trouve pas son
  // utilisateur. On tranche sur le corps, sinon le diagnostic enverrait
  // chercher DEV_AUTH_ENABLED pour un simple email mal orthographié.
  const isGate1 = res.status === 404 && typeof payload?.error !== 'string';
  if (isGate1) {
    throw new Error(
      '404 — DEV_AUTH_ENABLED != "true" côté fonction (ou fonction non déployée). ' +
        'La fonction se cache volontairement : c\'est le gate 1.',
    );
  }

  if (!res.ok) {
    throw new Error(`${res.status} — ${payload?.error ?? JSON.stringify(payload)}`);
  }
  return payload;
}

const [command, ...args] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') usage(0);

try {
  requireConfig();

  if (command === 'check') {
    // `list-users` est l'appel le moins destructif : s'il passe, les 2 gates
    // passent, et on sait que le reste du script fonctionnera.
    const out = await call({ action: 'list-users' });
    const users = Array.isArray(out?.users) ? out.users : [];
    console.log(`OK — les 2 gates répondent. ${users.length} utilisateur(s) dev.`);
    for (const u of users) {
      console.log(`  · ${u.email ?? '(sans email)'}  id=${u.id ?? '?'}`);
    }
    process.exit(0);
  }

  if (command === 'list') {
    const out = await call({ action: 'list-users' });
    const users = Array.isArray(out?.users) ? out.users : [];
    if (users.length === 0) {
      console.log('Aucun utilisateur dev.');
      process.exit(0);
    }
    for (const u of users) {
      const flags = [
        u.confirmed ? 'confirmé' : 'non confirmé',
        u.hasPassword ? 'mot de passe' : 'sans mot de passe',
      ].join(', ');
      console.log(`${u.email ?? '(sans email)'}\n  id=${u.id ?? '?'}  (${flags})`);
    }
    process.exit(0);
  }

  if (command === 'set-password') {
    const [email, password] = args;
    if (!email || !password) {
      console.error('set-password <email> <mot-de-passe> : arguments manquants.');
      process.exit(1);
    }
    const out = await call({ action: 'set-password', email, password });
    console.log(`Mot de passe mis à jour pour ${email}.${out?.ok === false ? ` ${JSON.stringify(out)}` : ''}`);
    process.exit(0);
  }

  if (command === 'signin') {
    const [email, password] = args;
    if (!email || !password) {
      console.error('signin <email> <mot-de-passe> : arguments manquants.');
      process.exit(1);
    }
    const out = await call({ action: 'test-signin', email, password });
    console.log(`Connexion testée pour ${email} : ${out?.ok === false ? 'ÉCHEC' : 'OK'}.`);
    if (out?.ok === false) console.log(JSON.stringify(out, null, 2));
    process.exit(out?.ok === false ? 1 : 0);
  }

  console.error(`Commande inconnue : ${command}`);
  usage(2);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'fetch failed') {
    console.error(
      `Échec réseau : impossible de joindre ${FN_URL}.\n` +
        'Vérifie SUPABASE_URL dans .env.dev (et que le projet n\'est pas en pause).',
    );
  } else {
    console.error(`Échec : ${message}`);
  }
  process.exit(1);
}
