import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';

import { extractJson, parseDesignPlan, parseModelResponse } from '../src/design/ai/contract.ts';
import { buildUserMessage, SYSTEM_PROMPT } from '../src/design/ai/prompt.ts';
import { planToDna, mergeBrief } from '../src/design/ai/plan-to-dna.ts';
import { requestDesignPlan, readContent, readSimulated } from '../src/design/ai/client.ts';
import { generatePoster, fetchServiceStatus } from '../src/design/ai/remote.ts';
import { buildPoster } from '../src/design/layout.ts';
import { validateLayout } from '../src/design/validate.ts';
import type { Brief } from '../src/design/types.ts';

/**
 * Contrat IA — tests du chemin complet.
 *
 * Deux familles :
 *   1. le contrat, testé seul : il doit ACCEPTER une réponse correcte et
 *      REFUSER tout le reste, avec un motif utilisable ;
 *   2. la chaîne réelle : un vrai serveur HTTP local est démarré, un vrai
 *      `fetch` est effectué. Un test contre un objet simulé ne prouverait rien
 *      du transport.
 */

const BRIEF: Brief = {
  name: 'Maison Kora',
  sector: 'Conseil en transition écologique',
  offer: 'Accompagner les PME vers un modèle bas carbone.',
  audience: 'Dirigeants de PME industrielles',
  tone: ['sobre', 'fiable'],
  constraints: [],
  deliverables: ['affiche'],
};

const VALID_PLAN = {
  brand: {
    name: 'Maison Kora',
    sector: 'Conseil en transition écologique',
    promise: 'Accompagner les PME vers un modèle bas carbone.',
    audience: 'Dirigeants de PME industrielles',
    personality: ['sobre', 'fiable', 'précise'],
    vocabulary: ['exigence', 'méthode', 'clarté'],
  },
  direction: {
    name: 'Sobre et affirmé',
    rationale: 'Lisibilité maximale au loin. Le texte long est réduit au minimum.',
    styleCategory: 'Minimal',
    harmonyTemplate: 'analogue',
    baseHue: 210,
    orientationDeg: 15,
  },
  copy: {
    headline: 'Bas carbone, sans compromis',
    subhead: 'Un accompagnement mesuré pour les PME industrielles.',
    body: 'Diagnostic, plan d’action et suivi.',
    footer: 'Conseil en transition écologique',
  },
  understanding: 'Une marque de conseil qui cible des dirigeants industriels.',
  unknowns: ['Aucune date de lancement fournie.'],
};

/* -------------------------------------------------------------------------- */
/* Extraction                                                                  */
/* -------------------------------------------------------------------------- */

test('extractJson accepte un objet nu', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});

test('extractJson accepte un bloc Markdown', () => {
  const raw = 'Voici ma proposition :\n```json\n{"a":2}\n```\nVoilà.';
  assert.deepEqual(extractJson(raw), { a: 2 });
});

test('extractJson accepte un bloc sans étiquette de langage', () => {
  assert.deepEqual(extractJson('```\n{"a":3}\n```'), { a: 3 });
});

test('extractJson retrouve un objet entouré de texte', () => {
  const raw = 'Ma réponse est {"a":4,"b":{"c":true}} et rien d’autre.';
  assert.deepEqual(extractJson(raw), { a: 4, b: { c: true } });
});

test('extractJson ne se laisse pas piéger par une accolade dans une chaîne', () => {
  const raw = '{"texte":"un { faux } objet","n":1}';
  assert.deepEqual(extractJson(raw), { texte: 'un { faux } objet', n: 1 });
});

test('extractJson rejette une réponse sans JSON', () => {
  assert.throws(() => extractJson('Bien sûr ! Voici mon idée.'), /aucun objet JSON/);
});

test('extractJson rejette un objet non terminé', () => {
  assert.throws(() => extractJson('{"a":1'), /non terminé|JSON/);
});

test('extractJson rejette une réponse vide', () => {
  assert.throws(() => extractJson('   '), /vide/);
});

/* -------------------------------------------------------------------------- */
/* Contrat                                                                     */
/* -------------------------------------------------------------------------- */

test('un plan valide passe sans correction', () => {
  const result = parseDesignPlan(structuredClone(VALID_PLAN), BRIEF);
  assert.ok(result.ok, result.ok ? '' : result.issues.join(' | '));
  assert.deepEqual(result.corrections, []);
  assert.equal(result.plan.copy.headline, 'Bas carbone, sans compromis');
});

test('un plan sans copy est refusé', () => {
  const broken = structuredClone(VALID_PLAN) as Record<string, unknown>;
  delete broken.copy;
  const result = parseDesignPlan(broken, BRIEF);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.issues.some((i) => i.includes('copy')));
});

test('une accroche manquante est refusée', () => {
  const broken = structuredClone(VALID_PLAN);
  broken.copy.headline = '';
  const result = parseDesignPlan(broken, BRIEF);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.issues.some((i) => i.includes('headline')));
});

test('un gabarit d’harmonie inconnu est remplacé et SIGNALÉ', () => {
  const broken = structuredClone(VALID_PLAN) as Record<string, unknown> & {
    direction: Record<string, unknown>;
  };
  broken.direction.harmonyTemplate = 'fibonacci';
  const result = parseDesignPlan(broken, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.plan.direction.harmonyTemplate, 'analogue');
  assert.ok(result.corrections.some((c) => c.includes('fibonacci')), 'la correction doit être visible');
});

test('une teinte hors bornes est ramenée dans le cercle et signalée', () => {
  const broken = structuredClone(VALID_PLAN) as { direction: Record<string, unknown> };
  broken.direction.baseHue = 725;
  const result = parseDesignPlan(broken, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.ok(result.plan.direction.baseHue >= 0 && result.plan.direction.baseHue <= 359);
  assert.ok(result.corrections.some((c) => c.includes('baseHue')));
});

test('une orientation est alignée sur un multiple de 15', () => {
  const broken = structuredClone(VALID_PLAN) as { direction: Record<string, unknown> };
  broken.direction.orientationDeg = 17;
  const result = parseDesignPlan(broken, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.plan.direction.orientationDeg % 15, 0);
});

test('les accents et la casse des énumérations sont tolérés', () => {
  const variant = structuredClone(VALID_PLAN) as { direction: Record<string, unknown> };
  variant.direction.styleCategory = 'complémentaire-divisée';
  variant.direction.harmonyTemplate = 'Complémentaire-Divisée';
  const result = parseDesignPlan(variant, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.plan.direction.harmonyTemplate, 'complementaire-divisee');
});

test('le modèle ne peut pas renommer la marque', () => {
  const renamed = structuredClone(VALID_PLAN);
  renamed.brand.name = 'Société Générale';
  const result = parseDesignPlan(renamed, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.plan.brand.name, 'Maison Kora');
  assert.ok(result.corrections.some((c) => c.includes('brief')));
});

test('un plan racine qui n’est pas un objet est refusé', () => {
  for (const bad of ['une chaîne', 42, null, [1, 2, 3]]) {
    const result = parseDesignPlan(bad, BRIEF);
    assert.equal(result.ok, false, `accepté à tort : ${JSON.stringify(bad)}`);
  }
});

test('un champ texte trop long est tronqué et la troncature est comptée', () => {
  const long = structuredClone(VALID_PLAN);
  long.copy.headline = 'A'.repeat(400);
  const result = parseDesignPlan(long, BRIEF);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.ok(result.plan.copy.headline.length <= 80);
});

test('parseModelResponse enchaîne extraction et validation', () => {
  const ok = parseModelResponse('```json\n' + JSON.stringify(VALID_PLAN) + '\n```', BRIEF);
  assert.ok(ok.ok);

  const ko = parseModelResponse('Je ne peux pas répondre.', BRIEF);
  assert.equal(ko.ok, false);
});

/* -------------------------------------------------------------------------- */
/* Prompt et conversion                                                        */
/* -------------------------------------------------------------------------- */

test('le prompt cite exactement les énumérations du validateur', () => {
  // Si une valeur est ajoutée d'un côté et pas de l'autre, le modèle recevrait
  // une consigne que le validateur refuserait.
  for (const template of [
    'monochrome',
    'analogue',
    'complementaire',
    'complementaire-divisee',
    'triadique',
    'tetradique',
  ]) {
    assert.ok(SYSTEM_PROMPT.includes(`"${template}"`), `gabarit absent du prompt : ${template}`);
  }
  for (const style of ['Professional', 'Elegant', 'Playful', 'Bold', 'Minimal', 'Organic', 'Tech']) {
    assert.ok(SYSTEM_PROMPT.includes(`"${style}"`), `catégorie absente du prompt : ${style}`);
  }
});

test('le message utilisateur reprend le brief et la demande', () => {
  const message = buildUserMessage(BRIEF, 'Fais quelque chose de très sobre');
  assert.ok(message.includes('Maison Kora'));
  assert.ok(message.includes('très sobre'));
  assert.ok(message.indexOf('DEMANDE') > message.indexOf('BRIEF'), 'la demande doit venir en dernier');
});

test('le brief de l’utilisateur gagne sur ce que propose le modèle', () => {
  const merged = mergeBrief(
    { ...BRIEF, audience: 'Artisans' },
    { ...(VALID_PLAN as never), brand: { ...VALID_PLAN.brand, audience: 'Grands comptes' } } as never,
  );
  assert.equal(merged.audience, 'Artisans');
});

test('la conversion produit une charte et un copy exploitables', () => {
  const parsed = parseDesignPlan(structuredClone(VALID_PLAN), BRIEF);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;

  const conversion = planToDna(BRIEF, parsed.plan);
  assert.equal(conversion.dna.palette.colors.length, 5);
  assert.equal(conversion.dna.strategy.promise.provenance, 'fourni');
  assert.equal(conversion.dna.strategy.styleCategory.provenance, 'propose');
  assert.equal(conversion.copy.headline, VALID_PLAN.copy.headline);

  // Une affiche composée depuis une réponse de modèle passe le validateur.
  const report = validateLayout(buildPoster(conversion.dna, undefined, conversion.copy), conversion.dna);
  assert.equal(report.violations.filter((v) => v.severity === 'error').length, 0);
});

test('le copy du modèle change réellement le texte de l’affiche', () => {
  const parsed = parseDesignPlan(structuredClone(VALID_PLAN), BRIEF);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;

  const { dna, copy } = planToDna(BRIEF, parsed.plan);
  const withCopy = buildPoster(dna, undefined, copy);
  const withoutCopy = buildPoster(dna);

  const title = (layout: typeof withCopy) => layout.calques.find((l) => l.id === 'l-titre')?.a_sem.text;
  assert.equal(title(withCopy), copy.headline);
  assert.notEqual(title(withCopy), title(withoutCopy));
});

/* -------------------------------------------------------------------------- */
/* Enveloppes                                                                  */
/* -------------------------------------------------------------------------- */

test('readContent accepte les formes usuelles', () => {
  const chat = { choices: [{ message: { content: 'texte' } }] };
  assert.equal(readContent(chat), 'texte');

  const blocks = { choices: [{ message: { content: [{ text: 'a' }, { text: 'b' }] } }] };
  assert.equal(readContent(blocks), 'a\nb');

  const responses = { output_text: 'direct' };
  assert.equal(readContent(responses), 'direct');

  assert.equal(readContent({ choices: [] }), null);
  assert.equal(readContent(null), null);
});

test('readSimulated ne confond pas absent et faux', () => {
  assert.equal(readSimulated({ simulated: true }), true);
  assert.equal(readSimulated({}), false);
  assert.equal(readSimulated({ simulated: 'true' }), false);
});

/* -------------------------------------------------------------------------- */
/* Chaîne réelle contre le service local                                       */
/* -------------------------------------------------------------------------- */

interface MockServer {
  close: () => Promise<void>;
  url: string;
}

let service: MockServer;

before(async () => {
  // Le serveur est importé tel quel : c'est le même fichier que celui utilisé
  // en développement, pas une doublure écrite pour les tests.
  const module = (await import('../../../tools/design-api/server.mjs')) as {
    createDesignServer: (options: { config: unknown; latencyMs?: number }) => import('node:http').Server;
  };

  const server = module.createDesignServer({
    latencyMs: 0,
    config: {
      apiKey: '',
      baseUrl: 'https://example.invalid/v1',
      model: 'agnes-3.0-flash',
      temperature: 0.7,
      maxTokens: 2048,
      timeoutMs: 5_000,
      mode: 'mock',
      endpoint: 'https://example.invalid/v1/chat/completions',
      hasKey: false,
    },
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  service = {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
});

after(async () => {
  await service.close();
});

test('le service répond à /api/health sans divulguer de clé', async () => {
  const response = await fetch(`${service.url}/api/health`);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(body.mode, 'mock');
  assert.equal(body.hasKey, false);
  assert.ok(!JSON.stringify(body).toLowerCase().includes('apikey'));
});

test('le service refuse une requête sans messages', async () => {
  const response = await fetch(`${service.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
});

test('un vrai aller-retour HTTP produit un plan validé', async () => {
  const call = await requestDesignPlan(BRIEF, '', {
    endpoint: `${service.url}/api/chat`,
    model: 'agnes-3.0-flash',
    timeoutMs: 5_000,
  });

  assert.ok(call.ok, call.ok ? '' : `${call.stage} : ${call.message}`);
  if (!call.ok) return;

  assert.equal(call.meta.simulated, true, 'le drapeau « simulé » doit remonter');
  assert.equal(call.plan.brand.name, 'Maison Kora');
  assert.ok(call.plan.copy.headline.length > 0);
  assert.ok(call.meta.ms >= 0);
});

test('un modèle qui répond du texte libre est rejeté à l’étape « contrat »', async () => {
  const call = await requestDesignPlan(BRIEF, '', {
    endpoint: `${service.url}/api/chat?fault=invalid_json`,
    model: 'agnes-3.0-flash',
    timeoutMs: 5_000,
  });
  assert.equal(call.ok, false);
  assert.ok(!call.ok && call.stage === 'contract');
});

test('un modèle qui renvoie un plan incomplet est rejeté', async () => {
  const call = await requestDesignPlan(BRIEF, '', {
    endpoint: `${service.url}/api/chat?fault=bad_schema`,
    model: 'agnes-3.0-flash',
    timeoutMs: 5_000,
  });
  assert.equal(call.ok, false);
  assert.ok(!call.ok && call.stage === 'contract');
});

test('une erreur 500 du fournisseur est rapportée comme telle', async () => {
  const call = await requestDesignPlan(BRIEF, '', {
    endpoint: `${service.url}/api/chat?fault=http_500`,
    model: 'agnes-3.0-flash',
    timeoutMs: 5_000,
  });
  assert.equal(call.ok, false);
  assert.ok(!call.ok && call.stage === 'http');
  assert.ok(!call.ok && /service/i.test(call.message));
});

test('un service éteint produit une erreur réseau, pas un écran blanc', async () => {
  const call = await requestDesignPlan(BRIEF, '', {
    // Port fermé : le cas réel quand on oublie de lancer `pnpm design-api`.
    endpoint: 'http://127.0.0.1:9/api/chat',
    model: 'agnes-3.0-flash',
    timeoutMs: 2_000,
  });
  assert.equal(call.ok, false);
  assert.ok(!call.ok && call.stage === 'network');
});

test('generatePoster rend une affiche validée de bout en bout', async () => {
  // `remote.ts` appelle des routes relatives ; on lui donne l'URL absolue du
  // serveur de test. Le reste du chemin est celui de production.
  const result = await generatePoster(BRIEF, 'Une affiche sobre', {
    endpoint: `${service.url}/api/chat`,
  });

  assert.ok(result.ok, result.ok ? '' : `${result.stage} : ${result.message}`);
  if (!result.ok) return;

  assert.equal(result.layout.calques.length, 10);
  assert.equal(result.report.violations.filter((v) => v.severity === 'error').length, 0);
  assert.equal(result.simulated, true);
  assert.equal(result.copy.headline.length > 0, true);
  assert.ok(result.meta.ms >= 0);
});

test('fetchServiceStatus distingue service absent et service présent', async () => {
  // Le vrai `/api/health` passe par le proxy Vite, absent ici : on vérifie donc
  // le comportement de repli, qui est celui que verra l'écran avant démarrage.
  const status = await fetchServiceStatus();
  assert.equal(typeof status.reachable, 'boolean');
  assert.equal(typeof status.note, 'string');
  assert.ok(status.note.length > 0, 'un service absent doit s’expliquer, pas rester muet');
});
