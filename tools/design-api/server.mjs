#!/usr/bin/env node
/**
 * Service de création d'affiche — mock + relais.
 *
 * POURQUOI CE SERVICE EXISTE
 * --------------------------
 * 1. La clé API ne doit JAMAIS partir dans le bundle. Une variable `VITE_*` est
 *    inlinée en clair dans le JavaScript servi au navigateur : n'importe quel
 *    visiteur peut la lire. Ici la clé reste dans un `.env.local` côté serveur,
 *    ignoré par git, et le navigateur n'appelle qu'une route relative.
 * 2. On veut pouvoir tester le pipeline complet sans clé et sans réseau. Le
 *    mode `mock` produit une réponse de la MÊME FORME qu'un vrai modèle, ce qui
 *    permet de valider le parseur, le contrat et l'écran avant d'avoir la clé.
 * 3. Le CORS disparaît : le navigateur appelle /api/chat sur la même origine
 *    que l'application, c'est Vite qui relaie.
 *
 * MODES
 *   mock  (défaut sans clé) : un modèle SIMULÉ répond, de façon déterministe.
 *   live                    : relais réel vers Agnes (ou tout compatible).
 *
 * Le serveur ne connaît NI le prompt NI le contrat : il reçoit des messages et
 * rend du texte, comme un fournisseur. Le prompt, le schéma et la validation
 * vivent dans l'application, ce qui évite d'avoir deux copies à maintenir.
 *
 * USAGE
 *   node tools/design-api/server.mjs
 *   AGNES_API_KEY=... node tools/design-api/server.mjs     (mode live)
 *
 * Aucune dépendance : uniquement `node:http`.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DESIGN_API_PORT ?? 8787);
const HOST = process.env.DESIGN_API_HOST ?? '0.0.0.0';

/**
 * Valeurs par défaut : celles d'Agnes 3.0 Flash, vérifiées dans la
 * documentation publique du fournisseur. Elles sont surchargeables pour
 * n'importe quel autre service compatible Chat Completions.
 */
const DEFAULTS = {
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  model: 'agnes-3.0-flash',
  temperature: 0.7,
  maxTokens: 2048,
  timeoutMs: 60_000,
};

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

/** Lecture minimale d'un .env local — pas de dépendance pour trois variables. */
function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
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

/**
 * Ordre de priorité : variables d'environnement, puis `.env.local` du service,
 * puis `.env.local` de la racine. Le fichier local gagne sur l'environnement
 * pour que le développement ne dépende pas d'un `export` oublié.
 */
export function loadConfig(env = process.env) {
  const files = [
    path.join(HERE, '.env.local'),
    path.resolve(HERE, '../../.env.local'),
  ];
  const fromFiles = files.reduce((acc, file) => ({ ...acc, ...readEnvFile(file) }), {});
  const merged = { ...env, ...fromFiles };

  const apiKey = merged.AGNES_API_KEY ?? merged.DESIGN_API_KEY ?? '';
  const baseUrl = (merged.AGNES_BASE_URL ?? DEFAULTS.baseUrl).replace(/\/+$/, '');

  return {
    apiKey,
    baseUrl,
    model: merged.AGNES_MODEL ?? DEFAULTS.model,
    temperature: Number(merged.AGNES_TEMPERATURE ?? DEFAULTS.temperature),
    maxTokens: Number(merged.AGNES_MAX_TOKENS ?? DEFAULTS.maxTokens),
    timeoutMs: Number(merged.AGNES_TIMEOUT_MS ?? DEFAULTS.timeoutMs),
    /** `mock` | `live` | `auto` (live si une clé existe, sinon mock). */
    mode: (merged.DESIGN_API_MODE ?? 'auto').toLowerCase(),
    endpoint: `${baseUrl}/chat/completions`,
    hasKey: Boolean(apiKey),
  };
}

function effectiveMode(config) {
  if (config.mode === 'live' || config.mode === 'mock') return config.mode;
  return config.hasKey ? 'live' : 'mock';
}

/* -------------------------------------------------------------------------- */
/* Simulation (mode mock)                                                      */
/* -------------------------------------------------------------------------- */

const STYLES = ['Professional', 'Elegant', 'Playful', 'Bold', 'Minimal', 'Organic', 'Tech'];
const TEMPLATES = [
  'monochrome',
  'analogue',
  'complementaire',
  'complementaire-divisee',
  'triadique',
  'tetradique',
];

const STYLE_HINTS = [
  ['Tech', ['logiciel', 'saas', 'ia', 'numérique', 'numerique', 'data', 'plateforme', 'api', 'cyber']],
  ['Elegant', ['luxe', 'joaillerie', 'parfum', 'hôtel', 'hotel', 'gastronomie', 'mode', 'art']],
  ['Playful', ['jeunesse', 'enfance', 'jeu', 'loisir', 'festival', 'sport', 'créatif', 'creatif']],
  ['Bold', ['énergie', 'energie', 'lancement', 'manifeste', 'streetwear', 'musique', 'compétition', 'competition']],
  ['Organic', ['bio', 'agriculture', 'nature', 'écologie', 'ecologie', 'cosmétique', 'cosmetique', 'soin', 'alimentaire']],
  ['Minimal', ['conseil', 'juridique', 'finance', 'audit', 'architecture', 'ingénierie', 'ingenierie']],
  ['Professional', ['santé', 'sante', 'industrie', 'banque', 'assurance', 'formation', 'b2b']],
];

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick(items, seed) {
  return items[seed % items.length];
}

/**
 * Accroche courte : 2 à 6 mots, distincte de l'offre.
 *
 * Trois patrons seulement, choisis par le style. Un simulateur n'a pas à être
 * créatif — il doit produire une forme CRÉDIBLE pour que le pipeline et
 * l'écran soient testables.
 */
function buildHeadline(name, offer, style) {
  /** Tronque sans laisser une préposition en fin d'accroche. */
  const DANGLING = new Set(['vers', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'à', 'au', 'aux', 'pour', 'sur', 'par', 'avec', 'dans']);
  const short = (value, words) => {
    const parts = value.replace(/[.!?]+$/, '').split(/\s+/).slice(0, words);
    while (parts.length > 1 && DANGLING.has(parts[parts.length - 1].toLowerCase())) parts.pop();
    return parts.join(' ').trim();
  };

  if (style === 'Bold' || style === 'Playful') {
    return offer ? short(offer, 4).toUpperCase() : `${name} assume`.toUpperCase();
  }
  if (style === 'Elegant') {
    return offer ? short(offer, 5) : name;
  }
  // Professional / Minimal / Tech / Organic : nominal, sobre, distinct de l'offre.
  return offer ? short(offer, 5) : `${name}, autrement`;
}

function styleOf(text) {
  const haystack = text.toLowerCase();
  for (const [style, keywords] of STYLE_HINTS) {
    if (keywords.some((word) => haystack.includes(word))) return style;
  }
  return 'Professional';
}

/**
 * Extrait le brief du message utilisateur.
 *
 * Le serveur ne connaît PAS le prompt métier : il reçoit des messages, comme
 * n'importe quel modèle. Le simulateur doit donc lire le texte reçu, exactement
 * comme le ferait un vrai modèle. Reconstruire le brief autrement reviendrait à
 * simuler notre propre code au lieu de simuler le fournisseur.
 */
export function briefFromMessages(messages) {
  const user = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find((message) => message?.role === 'user');
  const text = typeof user?.content === 'string' ? user.content : '';

  const field = (label) => {
    const match = text.match(new RegExp(`^\\s*-\\s*${label}\\s*:\\s*(.*)$`, 'mi'));
    const value = match?.[1]?.trim() ?? '';
    return value.startsWith('(') ? '' : value;
  };

  const toneLine = field('personnalité');

  return {
    name: field('marque'),
    sector: field('secteur'),
    offer: field('offre'),
    audience: field('public'),
    tone: toneLine ? toneLine.split(/\s*,\s*/).filter(Boolean) : [],
    request: text,
  };
}

/**
 * Construit une réponse SIMULÉE, de la forme exacte d'un modèle.
 *
 * Déterministe à partir du brief : le même brief donne le même plan, ce qui
 * rend les tests stables. C'est une simulation assumée — elle prouve que le
 * pipeline fonctionne, pas qu'un modèle a bien répondu.
 */
export function mockPlan(brief = {}, request = '') {
  const name = (brief.name ?? '').trim() || 'Marque';
  const sector = (brief.sector ?? '').trim() || 'secteur à préciser';
  const offer = (brief.offer ?? '').trim();
  const audience = (brief.audience ?? '').trim();
  const tone = Array.isArray(brief.tone) ? brief.tone : [];

  const basis = `${name} ${sector} ${offer} ${request}`;
  const seed = hash(basis);
  const style = styleOf(basis);

  const templateIndex = { Tech: 1, Minimal: 0, Elegant: 4, Playful: 5, Bold: 2, Organic: 1, Professional: 3 }[style] ?? 1;

  /*
   * Une accroche n'est pas une offre recopiée.
   *
   * La première version du simulateur prenait la première phrase de l'offre :
   * l'affiche affichait alors le même texte en titre et en sous-titre, sur cinq
   * lignes. Le simulateur doit imiter un bon modèle, pas notre facilité.
   */
  const headline = buildHeadline(name, offer, style);
  const subhead = offer
    ? offer.split(/(?<=[.!?])\s/)[0].slice(0, 140).trim()
    : `${name} — ${sector}`;

  return {
    brand: {
      name,
      sector,
      promise: offer || `${name} accompagne ${audience || 'ses clients'} avec exigence.`,
      audience: audience || 'public à préciser',
      personality: tone.length > 0 ? tone.slice(0, 5) : ['sobre', 'fiable', 'précis'],
      vocabulary: ['exigence', 'clarté', 'accompagnement', 'méthode'],
    },
    direction: {
      name: `${style} · ${pick(['Contrasté', 'Sobre', 'Affirmé'], seed)}`,
      rationale:
        `Direction ${style.toLowerCase()} : lisibilité maximale au loin, hiérarchie nette entre ` +
        `l'accroche et le contexte. Le texte long est volontairement réduit pour laisser respirer l'accroche.`,
      styleCategory: style,
      harmonyTemplate: TEMPLATES[templateIndex],
      baseHue: seed % 360,
      orientationDeg: (Math.floor(seed / 7) % 24) * 15,
    },
    copy: {
      headline,
      subhead,
      body: audience ? `Pour ${audience}.` : 'Public à préciser dans le brief.',
      footer: sector,
    },
    understanding: `Affiche pour ${name} (${sector}), accroche construite sur le nom.`,
    unknowns: audience ? [] : ['Le public n’est pas précisé dans le brief.'],
    __simulated: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Relais réel                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Relais réel.
 *
 * Le corps transmis est RECONSTRUIT à partir d'une liste blanche : on ne
 * laisse pas passer `tools`, `stream` ou des champs propres à un fournisseur.
 * Un proxy ouvert sur une clé est une faille, même en développement.
 */
async function callLive(config, messages) {
  const body = {
    model: config.model,
    messages: messages.map((message) => ({
      role: String(message?.role ?? 'user'),
      content: typeof message?.content === 'string' ? message.content : String(message?.content ?? ''),
    })),
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        status: response.status,
        payload: {
          error: 'upstream',
          message: `Le fournisseur a répondu ${response.status}.`,
          detail: text.slice(0, 500),
        },
      };
    }

    const envelope = JSON.parse(text);
    const content = envelope?.choices?.[0]?.message?.content ?? envelope?.output_text ?? null;

    return {
      status: 200,
      payload: {
        content,
        usage: envelope?.usage ?? null,
        model: envelope?.model ?? config.model,
        simulated: false,
      },
    };
  } catch (cause) {
    return {
      status: 502,
      payload: {
        error: 'upstream_unreachable',
        message:
          'Le fournisseur est injoignable depuis ce service. ' +
          'Vérifie l’URL de base, la connexion sortante et la clé.',
        detail: String(cause?.message ?? cause),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/* Serveur                                                                    */
/* -------------------------------------------------------------------------- */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

/**
 * Enveloppe une réponse dans la forme Chat Completions.
 *
 * L'application envoie `{ model, messages, temperature, max_tokens }` et lit
 * `choices[0].message.content` : exactement ce qu'un fournisseur renvoie. Le
 * service local est donc interchangeable avec Agnes, et `content` reste présent
 * à côté pour les appels manuels.
 */
function asCompletion(content, extra = {}) {
  return {
    content,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    ...extra,
  };
}

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { ...JSON_HEADERS, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req, limitBytes = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('corps de requête trop volumineux'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Défauts provoqués volontairement — pour tester les chemins d'échec. */
const FAULTS = new Set(['http_500', 'invalid_json', 'bad_schema', 'empty', 'timeout']);

export function createDesignServer(options = {}) {
  const config = options.config ?? loadConfig();

  return http.createServer(async (req, res) => {
    // L'application est servie depuis la même origine (proxy Vite). En
    // développement, Vite peut aussi exposer un port différent : on autorise
    // l'origine locale, jamais `*` sur une route qui porte une clé.
    const origin = req.headers.origin;
    if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const route = url.pathname.replace(/\/+$/, '') || '/';

    /* --- santé ---------------------------------------------------------- */
    if (route === '/api/health' && req.method === 'GET') {
      const mode = effectiveMode(config);
      send(res, 200, {
        ok: true,
        mode,
        model: config.model,
        endpoint: config.endpoint,
        hasKey: config.hasKey,
        // La clé n'est jamais renvoyée, même tronquée : un identifiant de clé
        // suffit à cibler une attaque.
        note:
          mode === 'mock'
            ? 'Mode simulé : aucune clé configurée, les réponses sont fabriquées localement.'
            : 'Mode réel : les requêtes sont relayées au fournisseur configuré.',
      });
      return;
    }

    /* --- complétion ----------------------------------------------------- */
    if (route === '/api/chat' && req.method === 'POST') {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (cause) {
        send(res, 400, { error: 'bad_request', message: String(cause?.message ?? cause) });
        return;
      }

      const messages = payload?.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        send(res, 400, { error: 'bad_request', message: '« messages » est requis (tableau non vide).' });
        return;
      }

      const brief = briefFromMessages(messages);
      const request = brief.request;
      const fault = url.searchParams.get('fault');

      if (fault && !FAULTS.has(fault)) {
        send(res, 400, { error: 'bad_fault', message: `Défaut inconnu : ${fault}` });
        return;
      }

      const started = Date.now();
      const mode = effectiveMode(config);

      // Défauts simulés : ils n'existent QUE pour prouver que l'écran sait
      // refuser une réponse invalide sans casser.
      if (fault === 'http_500') {
        send(res, 500, { error: 'simulated', message: 'Échec simulé du fournisseur.' });
        return;
      }

      if (mode === 'mock' || fault) {
        await new Promise((resolve) => setTimeout(resolve, options.latencyMs ?? 220));

        if (fault === 'invalid_json') {
          send(res, 200, asCompletion('Bien sûr ! Voici mon idée : une affiche très classe.', { simulated: true }));
          return;
        }
        if (fault === 'empty') {
          send(res, 200, asCompletion('', { simulated: true }));
          return;
        }
        if (fault === 'bad_schema') {
          send(
            res,
            200,
            asCompletion(JSON.stringify({ brand: { name: 'X' }, direction: {}, copy: {} }), {
              simulated: true,
            }),
          );
          return;
        }

        const plan = mockPlan(brief, request);
        send(res, 200, asCompletion(JSON.stringify(plan), {
          simulated: true,
          model: 'mock-deterministic',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          ms: Date.now() - started,
        }));
        return;
      }

      const result = await callLive(config, messages);
      send(res, result.status, {
        ...result.payload,
        ms: Date.now() - started,
        model: config.model,
        simulated: false,
      });
      return;
    }

    send(res, 404, {
      error: 'not_found',
      message: 'Routes disponibles : GET /api/health, POST /api/chat',
    });
  });
}

/* --- lancement direct : `node tools/design-api/server.mjs` ----------------- */
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const config = loadConfig();
  const mode = effectiveMode(config);
  const server = createDesignServer({ config });

  server.listen(PORT, HOST, () => {
    console.log(`\n  design-api  ·  http://localhost:${PORT}`);
    console.log(`  mode        ·  ${mode.toUpperCase()}${mode === 'mock' ? ' (aucune clé — réponses simulées)' : ''}`);
    console.log(`  modèle      ·  ${config.model}`);
    console.log(`  endpoint    ·  ${config.endpoint}`);
    if (mode === 'live') console.log('  clé         ·  présente (jamais renvoyée par l’API)');
    console.log('\n  GET  /api/health   POST /api/chat\n');
  });
}
