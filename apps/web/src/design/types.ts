/**
 * Design Space Pro — modèles de données.
 *
 * Ces types suivent les schémas du corpus d'ingénierie (AFFICHE §5.1–5.3,
 * LOGO §5.1–5.2, Référence produit §6.2). Les noms de champs sont conservés
 * (`a_sem`, `a_geo`, `a_sty`, `o`, `M`) pour qu'un JSON produit ici reste
 * lisible par les outils qui implémenteront le reste du pipeline.
 *
 * Note d'import : les modules de `src/design` utilisent des extensions `.ts`
 * explicites. C'est ce qui permet de les exécuter tels quels avec le runner de
 * tests natif de Node, sans étape de build.
 */

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * La Référence produit (§6.2) l'impose : une information fournie, une
 * proposition générée, une décision acceptée et une information inconnue ne
 * sont pas la même chose. Les confondre transforme une hypothèse en fait.
 */
export type Provenance = 'fourni' | 'propose' | 'accepte' | 'inconnu';

export interface Field<T> {
  value: T | null;
  provenance: Provenance;
  /** D'où vient l'information quand elle n'est pas fournie par l'utilisateur. */
  source?: string;
}

export function fourni<T>(value: T): Field<T> {
  return { value, provenance: 'fourni' };
}
export function propose<T>(value: T, source: string): Field<T> {
  return { value, provenance: 'propose', source };
}
export function inconnu<T>(): Field<T> {
  return { value: null, provenance: 'inconnu' };
}

/* -------------------------------------------------------------------------- */
/* Brief                                                                       */
/* -------------------------------------------------------------------------- */

export interface Brief {
  name: string;
  sector: string;
  offer: string;
  audience: string;
  /** Mots-clés de personnalité choisis par l'utilisateur. */
  tone: string[];
  /** Contraintes explicites (« pas de rouge », « impression N&B »…). */
  constraints: string[];
  /** Livrables attendus. */
  deliverables: string[];
}

export const EMPTY_BRIEF: Brief = {
  name: '',
  sector: '',
  offer: '',
  audience: '',
  tone: [],
  constraints: [],
  deliverables: [],
};

/* -------------------------------------------------------------------------- */
/* Harmonie chromatique                                                        */
/* -------------------------------------------------------------------------- */

export type HarmonyTemplate =
  | 'monochrome'
  | 'analogue'
  | 'complementaire'
  | 'complementaire-divisee'
  | 'triadique'
  | 'tetradique';

export interface Palette {
  /**
   * Modèle d'harmonie réellement appliqué. Le corpus cite Matsuda (gabarits
   * V/Y/X/L/T/I/i) ; sa géométrie exacte n'étant pas fournie intégralement,
   * on nomme honnêtement ce qui est implémenté : Itten.
   */
  model: 'itten';
  template: HarmonyTemplate;
  /** Orientation du gabarit sur le cercle chromatique, en degrés. */
  orientation: number;
  /** [dominante, accent, clair, profond, neutre] — ordre du schéma §5.2. */
  colors: [string, string, string, string, string];
}

/* -------------------------------------------------------------------------- */
/* Brand DNA                                                                   */
/* -------------------------------------------------------------------------- */

export interface TypographyRole {
  font: string;
  weight: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  /** Taille relative au titre principal. */
  sizeScale: number;
}

export interface Typography {
  titre: TypographyRole;
  sousTitre: TypographyRole;
  corps: TypographyRole;
  note: TypographyRole;
}

export interface Grid {
  columns: number;
  /** Marges en fraction du plus petit côté. */
  margins: number;
  gutter: number;
}

export type StyleCategory =
  | 'Professional'
  | 'Elegant'
  | 'Playful'
  | 'Bold'
  | 'Minimal'
  | 'Organic'
  | 'Tech';

export interface BrandStrategy {
  promise: Field<string>;
  positioning: Field<string>;
  audience: Field<string>;
  personality: Field<string[]>;
  vocabulary: Field<string[]>;
  styleCategory: Field<StyleCategory>;
}

export interface BrandDNA {
  id: string;
  /** Version sémantique : `1`, `2`, … Une version approuvée n'est jamais écrasée. */
  version: number;
  createdAt: string;
  brief: Brief;
  strategy: BrandStrategy;
  palette: Palette;
  typography: Typography;
  grid: Grid;
  /** Nom de la direction, pour distinguer les propositions entre elles. */
  directionName: string;
  /** Explication courte de ce que la direction privilégie. */
  rationale: string;
}

/* -------------------------------------------------------------------------- */
/* Calques (AFFICHE §5.1)                                                      */
/* -------------------------------------------------------------------------- */

export type LayerKind = 'text' | 'asset' | 'underlay' | 'deco';

export interface LayerSemantic {
  type: LayerKind;
  text?: string;
  asset?: string;
  /** Rôle typographique déclaré dans la charte (titre, corps…). */
  role?: keyof Typography;
}

export interface LayerGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  crop: null;
  mask: null;
}

export interface LayerStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  opacity: number;
  stroke?: null;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  radius?: number;
}

/** Attributs verrouillés que la boucle de raffinement ne doit jamais modifier. */
export interface LayerLocks {
  lock_x: boolean;
  lock_y: boolean;
  lock_w: boolean;
  lock_h: boolean;
  lock_cat: boolean;
  lock_text?: boolean;
}

export interface Layer {
  id: string;
  a_sem: LayerSemantic;
  a_geo: LayerGeometry;
  a_sty: LayerStyle;
  /** Ordre de rendu bas→haut. Explicite, jamais déduit de la position du tableau. */
  o: number;
  M: LayerLocks;
  detail?: string;
}

export interface Layout {
  /**
   * `w` et `h` valent 1 : les coordonnées des calques sont normalisées par axe.
   * `ratio` est le rapport hauteur/largeur du support (A4 = 297/210) ; il ne
   * contamine jamais les coordonnées, seulement le rendu.
   */
  canvas: { w: number; h: number; ratio: number; bg: string };
  calques: Layer[];
}

/* -------------------------------------------------------------------------- */
/* Validation (AFFICHE §5.3)                                                   */
/* -------------------------------------------------------------------------- */

export type ViolationCode =
  | 'BOUNDARY_OVERRUN'
  | 'TEXT_OVERLAP'
  | 'LABEL_DUP'
  | 'WCAG_CONTRAST'
  | 'UNDERLAY_MISPLACE'
  | 'ZORDER_INVERSION'
  | 'ROUND_INSTABILITY'
  | 'CONSTITUTIONAL_VIOLATION'
  | 'STYLE_MISMATCH'
  /** Ajout hors corpus : un texte qui dépasse sa propre boîte. Aucun des dix
   *  codes du document ne le voit, parce qu'ils raisonnent tous sur des boîtes
   *  et que le débordement se produit À L'INTÉRIEUR de la boîte annoncée. */
  | 'TEXT_OVERFLOW'
  /** Ajout hors corpus : un élément obligatoire absent de la composition. */
  | 'MISSING_REQUIRED';

export type Severity = 'error' | 'warning';

export interface Violation {
  code: ViolationCode;
  severity: Severity;
  /** Message lisible, destiné à l'utilisateur — pas au développeur. */
  message: string;
  layerIds: string[];
  /** Valeur mesurée quand elle existe (ratio de contraste, dépassement en %)… */
  measured?: number;
  threshold?: number;
}

/**
 * Les 8 indicateurs PosterLayout (§5.4). Chacun est normalisé 0–1.
 * Ils ne remplacent pas les violations : ils résument la qualité du layout.
 */
export interface LayoutIndicators {
  /** Éléments valides (aire > 0,1 %). */
  val: number;
  /** Absence de chevauchement. */
  ove: number;
  /** Alignement des bords. */
  ali: number;
  /** Présence de sous-couches sous les textes. */
  undl: number;
  /** Règle stricte : la sous-couche est bien SOUS son texte. */
  unds: number;
  /** Utilisation de la surface. */
  uti: number;
  /** Absence d'occlusion indue. */
  occ: number;
  /** Lisibilité (contraste). */
  rea: number;
}

export interface ValidationReport {
  violations: Violation[];
  indicators: LayoutIndicators;
  /** 0–10, pilote l'arrêt anticipé de la boucle (AFFICHE §3.1). */
  score: number;
}

export function isBlocking(report: ValidationReport): boolean {
  return report.violations.some((v) => v.severity === 'error');
}
