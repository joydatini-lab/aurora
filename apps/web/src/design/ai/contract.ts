import { TEMPLATE_OFFSETS } from '../harmony.ts';
import type { Brief, HarmonyTemplate, StyleCategory } from '../types.ts';

/**
 * Contrat de sortie du modèle.
 *
 * Principe du corpus (§2.3) : « l'IA interprète, propose et orchestre ; des
 * moteurs déterministes rendent, calculent et valident ».
 *
 * Le modèle ne renvoie donc **jamais** de calques. Il renvoie une INTENTION :
 * une marque, une direction chromatique, une catégorie de style et un texte.
 * La géométrie, la césure, les contrastes et le score restent calculés ici.
 * C'est ce qui rend une réponse de modèle vérifiable : un calque mal placé
 * serait indétectable, une teinte hors bornes ne l'est pas.
 *
 * Ce fichier n'importe RIEN du réseau : il est testable seul, et c'est lui qui
 * décide si une réponse de modèle est utilisable.
 */

export const STYLE_CATEGORIES: StyleCategory[] = [
  'Professional',
  'Elegant',
  'Playful',
  'Bold',
  'Minimal',
  'Organic',
  'Tech',
];

export const HARMONY_TEMPLATES = Object.keys(TEMPLATE_OFFSETS) as HarmonyTemplate[];

export interface DesignPlan {
  brand: {
    name: string;
    sector: string;
    /** Promesse en une phrase, formulée pour être lue sur une affiche. */
    promise: string;
    audience: string;
    personality: string[];
    vocabulary: string[];
  };
  direction: {
    name: string;
    rationale: string;
    styleCategory: StyleCategory;
    harmonyTemplate: HarmonyTemplate;
    /** Teinte de base sur le cercle chromatique, 0–359. */
    baseHue: number;
    /** Rotation du gabarit, en degrés (multiple de 15). */
    orientationDeg: number;
  };
  copy: {
    headline: string;
    subhead: string;
    body: string;
    footer: string;
  };
  /** Ce que le modèle a compris du brief, en une phrase. Affiché à l'écran. */
  understanding?: string;
  /** Ce qu'il n'a pas su déduire. Jamais masqué. */
  unknowns?: string[];
}

export interface ParseSuccess {
  ok: true;
  plan: DesignPlan;
  /** Coercitions appliquées, toutes déclarées. Une correction silencieuse est un mensonge. */
  corrections: string[];
}

export interface ParseFailure {
  ok: false;
  issues: string[];
}

export type ParseResult = ParseSuccess | ParseFailure;

/* -------------------------------------------------------------------------- */
/* Extraction du JSON                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Récupère un objet JSON dans une réponse de modèle.
 *
 * Les modèles enrobent spontanément leur JSON dans un bloc Markdown ou le font
 * précéder d'une phrase. Refuser ces réponses serait fragile ; les accepter
 * sans cadre serait dangereux. On extrait donc l'objet, puis on le VALIDE
 * strictement — c'est la validation, pas l'extraction, qui protège.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim();
  if (!text) throw new Error('réponse vide');

  // 1. Bloc de code ```json … ``` ou ``` … ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text;

  // 2. Objet nu
  try {
    return JSON.parse(candidate);
  } catch {
    // 3. Premier objet équilibré trouvé dans le texte
    const start = candidate.indexOf('{');
    if (start === -1) throw new Error('aucun objet JSON dans la réponse');

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < candidate.length; i += 1) {
      const char = candidate[i]!;
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(candidate.slice(start, i + 1));
        }
      }
    }
    throw new Error('objet JSON non terminé dans la réponse');
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const LIMITS = {
  shortText: 120,
  longText: 600,
  list: 8,
} as const;

type Bag = Record<string, unknown>;

function isBag(value: unknown): value is Bag {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Bag,
  key: string,
  issues: string[],
  path: string,
  options: { required?: boolean; max?: number } = {},
): string {
  const value = source[key];
  if (value === undefined || value === null || value === '') {
    if (options.required) issues.push(`${path}.${key} : champ obligatoire manquant`);
    return '';
  }
  if (typeof value !== 'string') {
    issues.push(`${path}.${key} : chaîne attendue, reçu ${typeOf(value)}`);
    return '';
  }
  const clean = value.replace(/\s+/g, ' ').trim();
  const max = options.max ?? LIMITS.shortText;
  if (clean.length > max) {
    // Tronquer est une décision visible : on la déclare.
    return clean.slice(0, max);
  }
  return clean;
}

function readStringList(source: Bag, key: string, path: string, issues: string[]): string[] {
  const value = source[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push(`${path}.${key} : tableau de chaînes attendu`);
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, LIMITS.list);
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'tableau';
  return typeof value;
}

/** Normalise un libellé pour le comparer à une énumération. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function matchEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: string[],
  corrections: string[],
  fallback?: T,
): T {
  if (typeof value === 'string') {
    const folded = fold(value);
    const exact = allowed.find((item) => fold(item) === folded);
    if (exact) {
      if (exact !== value) corrections.push(`${path} : « ${value} » normalisé en « ${exact} »`);
      return exact;
    }
  }

  if (fallback !== undefined) {
    corrections.push(
      `${path} : ${JSON.stringify(value)} n'appartient pas à ${allowed.join(' | ')} — remplacé par « ${fallback} »`,
    );
    return fallback;
  }

  issues.push(`${path} : valeur ${JSON.stringify(value)} hors de ${allowed.join(' | ')}`);
  // Valeur de secours pour continuer l'analyse, l'échec est déjà enregistré.
  return allowed[0]!;
}

function readNumber(
  source: Bag,
  key: string,
  path: string,
  issues: string[],
  corrections: string[],
  options: { min: number; max: number; step?: number; fallback: number },
): number {
  const value = source[key];

  if (value === undefined || value === null) {
    corrections.push(`${path}.${key} : absent — ${options.fallback} appliqué`);
    return options.fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    issues.push(`${path}.${key} : nombre attendu, reçu ${typeOf(value)}`);
    return options.fallback;
  }

  let next = parsed;
  if (next < options.min || next > options.max) {
    const clamped = Math.min(options.max, Math.max(options.min, next));
    corrections.push(`${path}.${key} : ${next} hors bornes — ramené à ${clamped}`);
    next = clamped;
  }

  if (options.step) {
    const snapped = Math.round(next / options.step) * options.step;
    if (snapped !== next) {
      corrections.push(`${path}.${key} : ${next} aligné sur ${snapped}`);
      next = snapped;
    }
  }

  return next;
}

/**
 * Valide et normalise un plan de design.
 *
 * Deux niveaux :
 *   - ce qui est réparable est RÉPARÉ et listé dans `corrections` ;
 *   - ce qui est structurellement faux fait échouer le parsing, et l'écran
 *     affichera pourquoi plutôt que de rendre une affiche au hasard.
 */
export function parseDesignPlan(raw: unknown, brief?: Brief): ParseResult {
  const issues: string[] = [];
  const corrections: string[] = [];

  if (!isBag(raw)) {
    return { ok: false, issues: [`racine : objet attendu, reçu ${typeOf(raw)}`] };
  }

  const brandBag = isBag(raw.brand) ? raw.brand : null;
  const directionBag = isBag(raw.direction) ? raw.direction : null;
  const copyBag = isBag(raw.copy) ? raw.copy : null;

  if (!brandBag) issues.push('brand : objet absent ou invalide');
  if (!directionBag) issues.push('direction : objet absent ou invalide');
  if (!copyBag) issues.push('copy : objet absent ou invalide');
  if (issues.length > 0) return { ok: false, issues };

  const brand = brandBag!;
  const direction = directionBag!;
  const copy = copyBag!;

  const plan: DesignPlan = {
    brand: {
      name: readString(brand, 'name', issues, 'brand', { required: true }),
      sector: readString(brand, 'sector', issues, 'brand', { required: true }),
      promise: readString(brand, 'promise', issues, 'brand', {
        required: true,
        max: LIMITS.longText,
      }),
      audience: readString(brand, 'audience', issues, 'brand', { max: LIMITS.longText }),
      personality: readStringList(brand, 'personality', 'brand', issues),
      vocabulary: readStringList(brand, 'vocabulary', 'brand', issues),
    },
    direction: {
      name: readString(direction, 'name', issues, 'direction', { required: true }),
      rationale: readString(direction, 'rationale', issues, 'direction', {
        required: true,
        max: LIMITS.longText,
      }),
      styleCategory: matchEnum(
        direction.styleCategory ?? direction.style,
        STYLE_CATEGORIES,
        'direction.styleCategory',
        issues,
        corrections,
        'Professional',
      ),
      harmonyTemplate: matchEnum(
        direction.harmonyTemplate ?? direction.template,
        HARMONY_TEMPLATES,
        'direction.harmonyTemplate',
        issues,
        corrections,
        'analogue',
      ),
      baseHue: readNumber(direction, 'baseHue', 'direction', issues, corrections, {
        min: 0,
        max: 359,
        fallback: 210,
      }),
      orientationDeg: readNumber(direction, 'orientationDeg', 'direction', issues, corrections, {
        min: 0,
        max: 345,
        step: 15,
        fallback: 0,
      }),
    },
    copy: {
      // Les quatre textes sont obligatoires : une affiche sans accroche n'est
      // pas une affiche. Le repli du moteur existe, mais il ne doit pas
      // masquer une réponse incomplète du modèle.
      headline: readString(copy, 'headline', issues, 'copy', { required: true, max: 80 }),
      subhead: readString(copy, 'subhead', issues, 'copy', { required: true, max: LIMITS.longText }),
      body: readString(copy, 'body', issues, 'copy', { max: LIMITS.longText }),
      footer: readString(copy, 'footer', issues, 'copy', { max: LIMITS.shortText }),
    },
    understanding: readString(raw, 'understanding', issues, 'root', { max: LIMITS.longText }),
    unknowns: readStringList(raw, 'unknowns', 'root', issues),
  };

  // Le nom du brief est une DONNÉE, pas une proposition : si le modèle l'a
  // changé, on le signale — une marque ne se renomme pas toute seule.
  if (brief?.name.trim() && fold(plan.brand.name) !== fold(brief.name)) {
    corrections.push(
      `brand.name : « ${plan.brand.name} » remplacé par le nom du brief « ${brief.name} »`,
    );
    plan.brand.name = brief.name.trim();
  }

  if (plan.copy.headline.length < 2) {
    issues.push('copy.headline : trop court pour composer une affiche');
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, plan, corrections };
}

/** Chaîne complète : extraction puis validation. C'est ce qu'appelle le client. */
export function parseModelResponse(raw: string, brief?: Brief): ParseResult {
  let extracted: unknown;
  try {
    extracted = extractJson(raw);
  } catch (cause) {
    return {
      ok: false,
      issues: [cause instanceof Error ? cause.message : 'réponse illisible'],
    };
  }
  return parseDesignPlan(extracted, brief);
}
