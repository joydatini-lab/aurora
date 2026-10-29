import { proposeDirections } from '../brand.ts';
import { buildPoster, type PosterFormat } from '../layout.ts';
import type { Brief, BrandDNA, Layout, ValidationReport } from '../types.ts';

/**
 * La couture IA.
 *
 * Le document est explicite (§2.3, « IA encadrée par des moteurs et des
 * règles ») : le modèle interprète et propose ; il ne rend pas et ne valide
 * pas. Ce fichier est donc une INTERFACE étroite, avec deux implémentations :
 *
 *   - `RuleBasedDesignAi` : déterministe, disponible immédiatement, testée ;
 *   - `HttpDesignAi` : appelle un modèle distant. Branchée, mais **jamais
 *     appelée** ici — aucun réseau sortant vers un fournisseur de modèles
 *     n'existe dans cet environnement. Elle refuse de s'exécuter sans
 *     configuration, plutôt que d'échouer silencieusement.
 *
 * Le reste de l'application ne connaît que l'interface : remplacer les règles
 * par un modèle ne touche aucun écran.
 */

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export interface DesignAiProvider {
  readonly id: string;
  readonly kind: 'rules' | 'http';
  /** Faux quand aucune configuration n'est fournie : l'UI doit le dire. */
  readonly available: boolean;
  /** Nom lisible, affiché dans l'interface à côté de chaque proposition. */
  readonly label: string;

  proposeDirections(brief: Brief): Promise<BrandDNA[]>;
  proposeLayout(dna: BrandDNA, format: PosterFormat): Promise<Layout>;
  /** Commentaire en langage naturel sur un rapport de validation. */
  critique(report: ValidationReport): Promise<string>;
}

/* -------------------------------------------------------------------------- */
/* Implémentation déterministe                                                 */
/* -------------------------------------------------------------------------- */

export class RuleBasedDesignAi implements DesignAiProvider {
  readonly id = 'rules-v1';
  readonly kind = 'rules' as const;
  readonly available = true;
  readonly label = 'Moteur de règles (déterministe)';

  async proposeDirections(brief: Brief): Promise<BrandDNA[]> {
    return proposeDirections(brief);
  }

  async proposeLayout(dna: BrandDNA, format: PosterFormat): Promise<Layout> {
    return buildPoster(dna, format);
  }

  async critique(report: ValidationReport): Promise<string> {
    const errors = report.violations.filter((v) => v.severity === 'error');
    if (errors.length === 0) {
      return `Aucune violation bloquante. Score ${report.score}/10 sur les huit indicateurs de layout.`;
    }
    const unique = [...new Set(errors.map((v) => v.code))];
    return `${errors.length} violation(s) bloquante(s) : ${unique.join(', ')}. Score ${report.score}/10.`;
  }
}

/* -------------------------------------------------------------------------- */
/* Implémentation HTTP (non exécutée ici)                                      */
/* -------------------------------------------------------------------------- */

export interface HttpAiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * Lit la configuration à l'exécution.
 *
 * `import.meta.env` est le seul mécanisme autorisé côté client : `process.env`
 * n'existe pas en ESM navigateur et lève un `ReferenceError` au chargement —
 * c'est exactement le défaut qui avait produit un écran blanc (voir
 * `src/boot/fatal.ts`).
 */
export function readAiConfig(): HttpAiConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const endpoint = env.VITE_AURORA_AI_URL;
  const apiKey = env.VITE_AURORA_AI_KEY;
  const model = env.VITE_AURORA_AI_MODEL;
  if (!endpoint || !apiKey || !model) return null;
  return { endpoint, apiKey, model };
}

export class HttpDesignAi implements DesignAiProvider {
  readonly id = 'http-v1';
  readonly kind = 'http' as const;
  readonly label = 'Modèle distant';
  readonly available: boolean;

  private readonly config: HttpAiConfig | null;

  constructor(config: HttpAiConfig | null = readAiConfig()) {
    this.config = config;
    this.available = config !== null;
  }

  async proposeDirections(): Promise<BrandDNA[]> {
    // Le modèle est branché mais jamais appelé : la fin de non-recevoir est
    // explicite pour que l'interface puisse l'afficher, au lieu de laisser
    // croire à une génération en cours.
    void this.config;
    throw new AiUnavailableError(
      'Aucun modèle distant configuré (VITE_AURORA_AI_URL / _KEY / _MODEL). ' +
        'Le moteur de règles reste actif ; la proposition par modèle n’est pas branchée.',
    );
  }

  async proposeLayout(): Promise<Layout> {
    throw new AiUnavailableError('Génération de layout par modèle non configurée.');
  }

  async critique(): Promise<string> {
    throw new AiUnavailableError('Critique par modèle non configurée.');
  }
}

/* -------------------------------------------------------------------------- */
/* Sélection                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Choisit le provider disponible.
 *
 * Un modèle distant n'est retenu QUE s'il est configuré ; sinon on retombe sur
 * les règles. Aucun écran ne doit dépendre d'un service absent pour s'afficher.
 */
export function selectProvider(http: DesignAiProvider | null = null): DesignAiProvider {
  if (http?.available) return http;
  return new RuleBasedDesignAi();
}
