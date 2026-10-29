import { buildStrategy, gridFor, slug, typographyFor } from '../brand.ts';
import { buildPalette } from '../harmony.ts';
import { inconnu, propose, type BrandDNA, type Brief, type PosterCopy } from '../types.ts';
import type { DesignPlan } from './contract.ts';

/**
 * Traduction d'un plan de modèle en Brand DNA.
 *
 * Le modèle a proposé ; ce fichier transforme la proposition en objet que le
 * moteur sait rendre. Il ne « corrige » rien en silence : chaque champ généré
 * porte sa provenance, et la provenance d'une valeur imaginée par un modèle
 * n'est pas « fourni ». C'est la différence entre une marque et une suggestion.
 */

export interface PlanConversion {
  dna: BrandDNA;
  copy: PosterCopy;
  /** Brief enrichi de ce que le modèle a apporté (secteur, promesse, public). */
  brief: Brief;
  /** Provenances, pour l'écran : d'où vient chaque valeur. */
  provenance: {
    name: 'fourni' | 'propose';
    sector: 'fourni' | 'propose';
    promise: 'fourni' | 'propose';
    audience: 'fourni' | 'propose' | 'inconnu';
    copy: 'propose';
  };
}

/**
 * Fusionne le brief saisi et ce que le modèle en a déduit.
 *
 * Règle : ce que l'utilisateur a écrit GAGNE. On ne laisse pas un modèle
 * renommer une marque ou remplacer un secteur saisi à la main — sinon le brief
 * n'est plus une source de vérité, et plus rien n'est vérifiable.
 */
export function mergeBrief(brief: Brief, plan: DesignPlan): Brief {
  return {
    name: brief.name.trim() || plan.brand.name,
    sector: brief.sector.trim() || plan.brand.sector,
    offer: brief.offer.trim() || plan.brand.promise,
    audience: brief.audience.trim() || plan.brand.audience,
    tone: brief.tone.length > 0 ? brief.tone : plan.brand.personality,
    constraints: brief.constraints,
    deliverables: brief.deliverables.length > 0 ? brief.deliverables : ['affiche'],
  };
}

export function planToDna(brief: Brief, plan: DesignPlan): PlanConversion {
  const merged = mergeBrief(brief, plan);
  const style = plan.direction.styleCategory;

  const palette = buildPalette(
    plan.direction.baseHue,
    plan.direction.harmonyTemplate,
    plan.direction.orientationDeg,
  );

  /*
   * La stratégie part des règles (elles savent déduire ce qui manque), puis le
   * modèle complète les champs que le brief laisse vides — sans jamais écraser
   * une valeur fournie par l'utilisateur.
   */
  const fromRules = buildStrategy(merged, style);
  const strategy = {
    promise: brief.offer.trim()
      ? fromRules.promise
      : propose(plan.brand.promise, 'proposition du modèle'),
    positioning: fromRules.positioning,
    audience: brief.audience.trim()
      ? fromRules.audience
      : plan.brand.audience.trim()
        ? propose(plan.brand.audience, 'proposition du modèle')
        : inconnu<string>(),
    personality: brief.tone.length
      ? fromRules.personality
      : propose(plan.brand.personality, 'proposition du modèle'),
    vocabulary: plan.brand.vocabulary.length
      ? propose(plan.brand.vocabulary, 'proposition du modèle')
      : fromRules.vocabulary,
    styleCategory: propose(style, 'proposition du modèle'),
  };

  const dna: BrandDNA = {
    // `-ai` distingue une charte proposée par un modèle d'une charte calculée
    // par les règles : sans cela, deux origines différentes porteraient le même
    // identifiant et seraient indiscernables dans l'historique.
    id: `dna-${slug(merged.name)}-${plan.direction.harmonyTemplate}-ai`,
    version: 1,
    createdAt: new Date(0).toISOString(),
    brief: merged,
    strategy,
    palette,
    typography: typographyFor(style),
    grid: gridFor(style),
    directionName: plan.direction.name,
    rationale: plan.direction.rationale,
  };

  const copy: PosterCopy = {
    headline: plan.copy.headline,
    subhead: plan.copy.subhead,
    body: plan.copy.body,
    footer: plan.copy.footer || merged.sector,
  };

  return {
    dna,
    copy,
    brief: merged,
    provenance: {
      name: brief.name.trim() ? 'fourni' : 'propose',
      sector: brief.sector.trim() ? 'fourni' : 'propose',
      promise: brief.offer.trim() ? 'fourni' : 'propose',
      audience: brief.audience.trim()
        ? 'fourni'
        : plan.brand.audience.trim()
          ? 'propose'
          : 'inconnu',
      copy: 'propose',
    },
  };
}
