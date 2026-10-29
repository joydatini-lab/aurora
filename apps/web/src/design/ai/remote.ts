import { buildPoster, type PosterFormat } from '../layout.ts';
import { refine } from '../pipeline.ts';
import { validateLayout } from '../validate.ts';
import type { BrandDNA, Brief, Layout, PosterCopy, ValidationReport } from '../types.ts';
import { requestDesignPlan, type CallMetadata } from './client.ts';
import { planToDna, type PlanConversion } from './plan-to-dna.ts';

/**
 * Génération d'affiche par un modèle distant.
 *
 * Le navigateur n'appelle qu'une route RELATIVE (`/api/chat`). C'est le service
 * local qui porte la clé et relaie. Conséquence directe : aucune clé dans le
 * bundle, aucun CORS, et le même code fonctionne en mode simulé comme en mode
 * réel — seul le service change de mode.
 *
 * Ce que ce fichier garantit :
 *   - une réponse de modèle n'atteint jamais l'écran sans être validée ;
 *   - l'affiche produite passe le MÊME validateur que le moteur de règles ;
 *   - l'origine de chaque valeur reste lisible (fourni / proposé / inconnu).
 */

export interface ServiceStatus {
  reachable: boolean;
  mode: 'mock' | 'live' | 'unknown';
  model: string;
  hasKey: boolean;
  note: string;
}

export interface GenerateSuccess {
  ok: true;
  dna: BrandDNA;
  copy: PosterCopy;
  layout: Layout;
  report: ValidationReport;
  conversion: PlanConversion;
  meta: CallMetadata;
  /** Vrai quand la réponse vient du simulateur, pas d'un modèle. */
  simulated: boolean;
  corrections: string[];
  understanding?: string;
  unknowns: string[];
}

export interface GenerateFailure {
  ok: false;
  stage: 'network' | 'http' | 'shape' | 'contract' | 'aborted' | 'service';
  message: string;
  detail?: string;
  ms: number;
}

export type GenerateResult = GenerateSuccess | GenerateFailure;

export interface RemoteOptions {
  /** Route de complétion. Relative : le service local s'en charge. */
  endpoint?: string;
  /** Nom du modèle envoyé au service — informatif côté service local. */
  model?: string;
  timeoutMs?: number;
  format?: PosterFormat;
  signal?: AbortSignal;
  /** Applique la boucle de correction après génération. */
  refine?: boolean;
}

/**
 * Route par défaut : le service local (`tools/design-api`), relayé par Vite.
 * Elle peut être changée pour pointer un autre relais, mais elle doit rester
 * RELATIVE : une URL absolue obligerait à gérer CORS et à exposer la clé.
 */
const DEFAULT_ENDPOINT = '/api/chat';
const DEFAULT_MODEL = 'agnes-3.0-flash';

/** Lit l'état du service local, sans jamais tenter d'appeler le fournisseur. */
export async function fetchServiceStatus(signal?: AbortSignal): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/health', { signal });
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as Partial<ServiceStatus> & { mode?: string };
    return {
      reachable: true,
      mode: body.mode === 'live' || body.mode === 'mock' ? body.mode : 'unknown',
      model: body.model ?? '—',
      hasKey: Boolean(body.hasKey),
      note: body.note ?? '',
    };
  } catch {
    return {
      reachable: false,
      mode: 'unknown',
      model: '—',
      hasKey: false,
      note: 'Service de génération injoignable : lance `pnpm design-api`.',
    };
  }
}

/**
 * Demande une affiche.
 *
 * Une seule requête de modèle par appel : pas de relance automatique. Un modèle
 * relancé en boucle masque un prompt défaillant et multiplie la facture.
 */
export async function generatePoster(
  brief: Brief,
  request: string,
  options: RemoteOptions = {},
): Promise<GenerateResult> {
  const started = Date.now();
  const format = options.format;

  const call = await requestDesignPlan(brief, request, {
    endpoint: options.endpoint ?? DEFAULT_ENDPOINT,
    model: options.model ?? DEFAULT_MODEL,
    timeoutMs: options.timeoutMs ?? 60_000,
    signal: options.signal,
    // Pas de clé ici, jamais : le service local l'ajoute côté serveur.
  });

  if (!call.ok) {
    return { ok: false, stage: call.stage, message: call.message, detail: call.detail, ms: Date.now() - started };
  }

  const conversion = planToDna(brief, call.plan);
  const initial = buildPoster(conversion.dna, format, conversion.copy);

  /*
   * Le modèle a proposé une INTENTION ; la composition reste calculée. On
   * passe donc la même boucle de raffinement que pour les règles, et le même
   * validateur : c'est ce qui garantit qu'une affiche générée par un modèle
   * n'est pas jugée avec un barème différent.
   */
  const outcome = options.refine === false ? null : refine(initial, conversion.dna);
  const layout = outcome ? outcome.layout : initial;
  const report = outcome ? outcome.report : validateLayout(initial, conversion.dna);

  return {
    ok: true,
    dna: conversion.dna,
    copy: conversion.copy,
    layout,
    report,
    conversion,
    meta: call.meta,
    simulated: call.meta.simulated,
    corrections: [...call.corrections, ...(outcome?.instability.map((v) => v.message) ?? [])],
    understanding: call.plan.understanding,
    unknowns: call.plan.unknowns ?? [],
  };
}
