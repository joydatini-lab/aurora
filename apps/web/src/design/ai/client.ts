import { parseModelResponse, type DesignPlan } from './contract.ts';
import { buildUserMessage, SYSTEM_PROMPT } from './prompt.ts';
import type { Brief } from '../types.ts';

/**
 * Client « Chat Completions ».
 *
 * Pourquoi ce format et pas un SDK : Agnes 3.0 Flash expose trois surfaces
 * (Chat Completions, Responses, Messages Anthropic) sur la même base URL.
 * Chat Completions est le plus répandu et le plus simple à relayer ; en
 * s'y tenant, ce client fonctionne aussi bien avec le service local qu'avec
 * n'importe quel fournisseur compatible, sans dépendance supplémentaire.
 *
 * Ce fichier ne connaît AUCUNE clé : il reçoit une configuration. La clé est
 * lue par le service local, côté serveur, et ne descend jamais ici.
 */

export interface AiEndpointConfig {
  /** URL complète de la route de complétion. */
  endpoint: string;
  model: string;
  /**
   * Clé à joindre à la requête.
   *
   * ATTENTION : dans un navigateur, ce champ doit TOUJOURS rester vide. Une clé
   * présente ici finirait dans le bundle ou dans l'onglet Réseau, lisible par
   * n'importe qui. Il n'existe que pour les appelants Node (tests, outils) qui
   * parlent directement au fournisseur. Le chemin navigateur passe par le
   * service local, qui ajoute l'en-tête côté serveur.
   */
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface CallMetadata {
  /** Durée de l'aller-retour, en millisecondes. */
  ms: number;
  model: string;
  endpoint: string;
  /** Jetons consommés, quand le service les rapporte. */
  usage?: { prompt?: number; completion?: number; total?: number };
  /**
   * Vrai quand la réponse vient d'un SIMULATEUR.
   *
   * Ce drapeau traverse toute la chaîne jusqu'à l'écran : une affiche produite
   * sans modèle doit être annoncée comme telle, sinon on fait passer une
   * démonstration pour un résultat.
   */
  simulated: boolean;
}

export type CallResult =
  | { ok: true; plan: DesignPlan; raw: string; meta: CallMetadata; corrections: string[] }
  | { ok: false; stage: 'network' | 'http' | 'shape' | 'contract' | 'aborted'; message: string; detail?: string };

/** Erreur lisible par l'utilisateur, jamais un code HTTP nu. */
function describeHttp(status: number, body: string): string {
  const snippet = body.replace(/\s+/g, ' ').slice(0, 240);
  if (status === 401 || status === 403) {
    return `Authentification refusée (${status}). Vérifie la clé du service, pas celle du navigateur.`;
  }
  if (status === 404) {
    return `Route introuvable (404) : ${snippet || 'l’URL de l’endpoint est probablement fausse.'}`;
  }
  if (status === 429) return `Quota ou débit dépassé (429) : ${snippet}`;
  if (status >= 500) return `Le service a échoué (${status}) : ${snippet}`;
  return `Réponse non exploitable (${status}) : ${snippet}`;
}

/**
 * Appelle le modèle et rend un plan VALIDÉ.
 *
 * Le pipeline distingue explicitement quatre échecs — réseau, HTTP, forme,
 * contrat — parce qu'ils ne se réparent pas de la même façon : une URL fausse
 * se corrige dans la configuration, un JSON invalide se corrige dans le prompt,
 * et un plan hors bornes se corrige dans le modèle. Un seul « ça a échoué »
 * n'aiderait personne.
 */
export async function requestDesignPlan(
  brief: Brief,
  request: string,
  config: AiEndpointConfig,
): Promise<CallResult> {
  const started = Date.now();
  const timeoutMs = config.timeoutMs ?? 60_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  config.signal?.addEventListener('abort', onOuterAbort);

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(brief, request) },
    ],
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2_048,
    stream: false,
  };

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      return { ok: false, stage: 'http', message: describeHttp(response.status, text), detail: text.slice(0, 2_000) };
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(text);
    } catch {
      return {
        ok: false,
        stage: 'shape',
        message: 'Le service a renvoyé autre chose que du JSON.',
        detail: text.slice(0, 2_000),
      };
    }

    const content = readContent(envelope);
    if (content === null) {
      return {
        ok: false,
        stage: 'shape',
        message: 'Réponse sans contenu exploitable : la forme de l’enveloppe ne correspond pas à Chat Completions.',
        detail: text.slice(0, 2_000),
      };
    }

    const parsed = parseModelResponse(content, brief);
    if (!parsed.ok) {
      return {
        ok: false,
        stage: 'contract',
        message: `Le modèle a répondu, mais le plan est inutilisable : ${parsed.issues[0] ?? 'raison inconnue'}`,
        detail: parsed.issues.join(' | '),
      };
    }

    return {
      ok: true,
      plan: parsed.plan,
      raw: content,
      corrections: parsed.corrections,
      meta: {
        ms: Date.now() - started,
        model: config.model,
        endpoint: config.endpoint,
        usage: readUsage(envelope),
        simulated: readSimulated(envelope),
      },
    };
  } catch (cause) {
    if (controller.signal.aborted) {
      const timeout = Date.now() - started >= timeoutMs - 100;
      return {
        ok: false,
        stage: 'aborted',
        message: timeout
          ? `Le service n’a pas répondu en ${Math.round(timeoutMs / 1000)} s.`
          : 'Appel annulé.',
      };
    }
    return {
      ok: false,
      stage: 'network',
      message:
        'Service injoignable. Vérifie qu’il tourne et que l’URL est correcte ' +
        `(${cause instanceof Error ? cause.message : 'erreur inconnue'}).`,
    };
  } finally {
    clearTimeout(timer);
    config.signal?.removeEventListener('abort', onOuterAbort);
  }
}

/* -------------------------------------------------------------------------- */
/* Lecture défensive des enveloppes                                            */
/* -------------------------------------------------------------------------- */

/**
 * Extrait le texte d'une réponse de complétion.
 *
 * Trois formes rencontrées en pratique :
 *   - `choices[0].message.content` (Chat Completions, le cas nominal) ;
 *   - `content` en tableau de blocs (certains relais recopient la forme
 *     Anthropic) ;
 *   - `output_text` (OpenAI Responses, si l'on pointe dessus par erreur).
 * On les accepte toutes : refuser une enveloppe différente pour un contenu
 * identique serait une fragilité gratuite.
 */
export function readContent(envelope: unknown): string | null {
  if (typeof envelope !== 'object' || envelope === null) return null;
  const bag = envelope as Record<string, unknown>;

  const choices = bag.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const direct = message?.content;
    if (typeof direct === 'string' && direct.trim()) return direct;

    if (Array.isArray(direct)) {
      const joined = direct
        .map((block) =>
          typeof block === 'object' && block !== null && typeof (block as Record<string, unknown>).text === 'string'
            ? ((block as Record<string, unknown>).text as string)
            : '',
        )
        .join('\n')
        .trim();
      if (joined) return joined;
    }

    const legacy = first?.text;
    if (typeof legacy === 'string' && legacy.trim()) return legacy;
  }

  if (typeof bag.output_text === 'string' && bag.output_text.trim()) return bag.output_text;
  if (typeof bag.content === 'string' && bag.content.trim()) return bag.content;

  return null;
}

export function readSimulated(envelope: unknown): boolean {
  if (typeof envelope !== 'object' || envelope === null) return false;
  return (envelope as Record<string, unknown>).simulated === true;
}

export function readUsage(envelope: unknown): CallMetadata['usage'] {
  if (typeof envelope !== 'object' || envelope === null) return undefined;
  const usage = (envelope as Record<string, unknown>).usage;
  if (typeof usage !== 'object' || usage === null) return undefined;
  const bag = usage as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
  return {
    prompt: num(bag.prompt_tokens),
    completion: num(bag.completion_tokens),
    total: num(bag.total_tokens),
  };
}
