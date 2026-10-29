import { contrastRatio, parseColor, relativeLuminance, type Rgb } from '../theme/color.ts';
import { estimateAdvance, resolvedLines, wrapLines } from './layout.ts';
import type {
  BrandDNA,
  Layer,
  Layout,
  LayoutIndicators,
  ValidationReport,
  Violation,
} from './types.ts';

/**
 * Validateur déterministe — la « spine » du pipeline.
 *
 * Il ne voit aucun pixel et n'appelle aucun modèle : il lit le JSON de calques,
 * applique les règles du corpus et rend un rapport TYPÉ. C'est ce rapport, et
 * non une impression, qui décide si une création peut être montrée comme
 * vérifiée.
 *
 * Codes de violation : ceux de AFFICHE §5.3. Une exception assumée — le corpus
 * écrit `CONSTANTIONAL_VIOLATION` (faute de frappe) ; on publie
 * `CONSTITUTIONAL_VIOLATION` et on documente l'écart plutôt que de propager
 * une faute dans une API.
 */

const EPS = 1e-6;
const AA_TEXT = 4.5;

const RANK: Record<Layer['a_sem']['type'], number> = {
  deco: 0,
  underlay: 1,
  text: 2,
  asset: 3,
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectOf(layer: Layer): Rect {
  return { x: layer.a_geo.x, y: layer.a_geo.y, w: layer.a_geo.w, h: layer.a_geo.h };
}

function intersection(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w <= 0 || h <= 0 ? 0 : w * h;
}

function area(r: Rect): number {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

function iou(a: Rect, b: Rect): number {
  const inter = intersection(a, b);
  const union = area(a) + area(b) - inter;
  return union <= 0 ? 0 : inter / union;
}

function covers(r: Rect, point: { x: number; y: number }): boolean {
  return point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;
}

function center(layer: Layer): { x: number; y: number } {
  return {
    x: layer.a_geo.x + layer.a_geo.w / 2,
    y: layer.a_geo.y + layer.a_geo.h / 2,
  };
}

/* -------------------------------------------------------------------------- */
/* Composition des couleurs                                                    */
/* -------------------------------------------------------------------------- */

function blend(base: Rgb, over: Rgb, alpha: number): Rgb {
  return {
    r: base.r * (1 - alpha) + over.r * alpha,
    g: base.g * (1 - alpha) + over.g * alpha,
    b: base.b * (1 - alpha) + over.b * alpha,
  };
}

/**
 * Couleur réellement perçue derrière un calque.
 *
 * On composite toutes les couches inférieures qui couvrent son centre, avec
 * leur opacité. Prendre simplement le `fill` de la couche du dessous donnerait
 * un contraste faux dès qu'un voile à 55 % s'intercale — exactement le cas de
 * notre sous-couche.
 */
export function resolveBackground(layout: Layout, layer: Layer): Rgb {
  const point = center(layer);
  const below = [...layout.calques]
    .filter((candidate) => candidate.o < layer.o && covers(rectOf(candidate), point))
    .sort((a, b) => a.o - b.o);

  let current = parseColor(layout.canvas.bg);
  for (const candidate of below) {
    const fill = candidate.a_sty.fill;
    if (!fill) continue;
    current = blend(current, parseColor(fill), clamp01(candidate.a_sty.opacity ?? 1));
  }
  return current;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/* -------------------------------------------------------------------------- */
/* Règles                                                                      */
/* -------------------------------------------------------------------------- */

export function validateLayout(layout: Layout, dna: BrandDNA): ValidationReport {
  const violations: Violation[] = [];
  const layers = [...layout.calques].sort((a, b) => a.o - b.o);
  const texts = layers.filter((l) => l.a_sem.type === 'text');
  const underlays = layers.filter((l) => l.a_sem.type === 'underlay');

  /* --- BOUNDARY_OVERRUN -------------------------------------------------- */
  for (const layer of layers) {
    const r = rectOf(layer);
    const overRight = r.x + r.w - layout.canvas.w;
    const overBottom = r.y + r.h - layout.canvas.h;
    const excess = Math.max(-r.x, -r.y, overRight, overBottom);
    if (excess > EPS) {
      violations.push({
        code: 'BOUNDARY_OVERRUN',
        severity: 'error',
        message: `« ${label(layer)} » dépasse le canevas de ${(excess * 100).toFixed(1)} %.`,
        layerIds: [layer.id],
        measured: round(excess * 100),
        threshold: 0,
      });
    }
  }

  /* --- TEXT_OVERLAP ------------------------------------------------------ */
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      const a = texts[i]!;
      const b = texts[j]!;
      const value = iou(rectOf(a), rectOf(b));
      if (value > EPS) {
        violations.push({
          code: 'TEXT_OVERLAP',
          severity: 'error',
          message: `Deux textes se chevauchent : « ${truncate(a.a_sem.text)} » et « ${truncate(b.a_sem.text)} ».`,
          layerIds: [a.id, b.id],
          measured: round(value, 3),
          threshold: 0,
        });
      }
    }
  }

  /* --- LABEL_DUP --------------------------------------------------------- */
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      const a = texts[i]!;
      const b = texts[j]!;
      const same = normalizeText(a.a_sem.text) === normalizeText(b.a_sem.text);
      if (same && intersection(rectOf(a), rectOf(b)) > EPS) {
        violations.push({
          code: 'LABEL_DUP',
          severity: 'warning',
          message: `Le texte « ${truncate(a.a_sem.text)} » apparaît deux fois au même endroit.`,
          layerIds: [a.id, b.id],
        });
      }
    }
  }

  /* --- TEXT_OVERFLOW ----------------------------------------------------- */
  /*
   * Ajout hors corpus. Les dix codes du document raisonnent sur les BOÎTES :
   * un texte qui déborde de sa boîte tout en restant dans le canevas ne
   * déclenche rien. C'est pourtant le défaut le plus visible d'une affiche
   * générée — la rastérisation l'a montré avant le validateur.
   */
  const ratio = layout.canvas.ratio;
  for (const layer of texts) {
    const size = layer.a_sty.fontSize ?? 0;
    const lineHeight = layer.a_sty.lineHeight ?? 1.15;
    const lines = resolvedLines(layer, ratio);
    const usedHeight = lines.length * size * ratio * lineHeight;
    const advance = estimateAdvance(layer.a_sty.fontWeight ?? 400);
    // Un mot plus large que la boîte ne peut pas être césuré : il sera coupé au
    // rendu, ce qui est un défaut visible. On le mesure sur le MOT le plus long,
    // pas sur la ligne produite (qui, elle, a déjà été découpée).
    const longestWord = Math.max(...(layer.a_sem.text ?? '').trim().split(/\s+/).map((w) => w.length), 0);
    const widest = Math.max(
      longestWord * advance * size * ratio,
      ...lines.map((line) => line.length * advance * size * ratio),
    );
    const overflowsHeight = usedHeight > layer.a_geo.h * ratio * 1.02;
    const overflowsWidth = widest > layer.a_geo.w * 1.02;

    if (overflowsHeight || overflowsWidth) {
      violations.push({
        code: 'TEXT_OVERFLOW',
        severity: 'error',
        message:
          `« ${truncate(layer.a_sem.text)} » dépasse sa boîte ` +
          `(${overflowsWidth ? 'en largeur' : ''}${overflowsWidth && overflowsHeight ? ' et ' : ''}` +
          `${overflowsHeight ? 'en hauteur' : ''}).`,
        layerIds: [layer.id],
        measured: round(Math.max(widest / Math.max(layer.a_geo.w, 1e-9), usedHeight / Math.max(layer.a_geo.h * ratio, 1e-9)), 3),
        threshold: 1.02,
      });
    }

    // Un texte qui serait relu autrement par un autre moteur doit être signalé :
    // c'est ce qui garantit que l'aperçu et l'export coupent pareil.
    const reWrapped = wrapLines(layer.a_sem.text ?? '', layer.a_geo.w, size * ratio, advance);
    if (reWrapped.length !== lines.length) {
      violations.push({
        code: 'ROUND_INSTABILITY',
        severity: 'warning',
        message: `« ${truncate(layer.a_sem.text)} » se coupe différemment selon la passe de rendu.`,
        layerIds: [layer.id],
      });
    }
  }

  /* --- WCAG_CONTRAST ----------------------------------------------------- */
  const contrastByLayer = new Map<string, number>();
  for (const layer of texts) {
    if (!layer.a_sty.fill) {
      violations.push({
        code: 'STYLE_MISMATCH',
        severity: 'error',
        message: `Le texte « ${truncate(layer.a_sem.text)} » n'a pas de couleur de remplissage.`,
        layerIds: [layer.id],
      });
      continue;
    }
    const fg = parseColor(layer.a_sty.fill);
    const bg = resolveBackground(layout, layer);
    const ratio = contrastRatio(fg, bg);
    contrastByLayer.set(layer.id, ratio);

    if (ratio < AA_TEXT) {
      violations.push({
        code: 'WCAG_CONTRAST',
        severity: 'error',
        message: `« ${truncate(layer.a_sem.text)} » : contraste ${ratio.toFixed(2)}:1, sous le minimum de 4,5:1.`,
        layerIds: [layer.id],
        measured: round(ratio, 2),
        threshold: AA_TEXT,
      });
    }
  }

  /* --- UNDERLAY_MISPLACE ------------------------------------------------- */
  for (const underlay of underlays) {
    for (const text of texts) {
      if (intersection(rectOf(underlay), rectOf(text)) <= EPS) continue;
      if (underlay.o > text.o) {
        violations.push({
          code: 'UNDERLAY_MISPLACE',
          severity: 'error',
          message: `La sous-couche « ${underlay.id} » est AU-DESSUS du texte « ${truncate(text.a_sem.text)} ».`,
          layerIds: [underlay.id, text.id],
        });
      }
    }
  }

  /* --- ZORDER_INVERSION -------------------------------------------------- */
  for (let i = 0; i < layers.length; i += 1) {
    for (let j = i + 1; j < layers.length; j += 1) {
      const a = layers[i]!;
      const b = layers[j]!;
      if (intersection(rectOf(a), rectOf(b)) <= EPS) continue;
      const byRank = RANK[a.a_sem.type] - RANK[b.a_sem.type];
      const byOrder = a.o - b.o;
      // Contradiction entre la hiérarchie sémantique et l'ordre de rendu.
      // Le couple underlay/texte est déjà couvert par UNDERLAY_MISPLACE.
      const bothDefined =
        !(a.a_sem.type === 'underlay' && b.a_sem.type === 'text') &&
        !(a.a_sem.type === 'text' && b.a_sem.type === 'underlay');
      if (bothDefined && byRank * byOrder < 0) {
        violations.push({
          code: 'ZORDER_INVERSION',
          severity: 'warning',
          message: `« ${label(a)} » et « ${label(b)} » sont rendus dans un ordre contraire à leur rôle.`,
          layerIds: [a.id, b.id],
        });
      }
    }
  }

  /* --- CONSTITUTIONAL_VIOLATION (grille) --------------------------------- */
  const { margins } = dna.grid;
  for (const layer of layers) {
    const r = rectOf(layer);
    const fullBleed = r.w >= 0.98 || r.h >= 0.98;
    if (fullBleed || layer.a_sem.type === 'deco') continue;
    const left = r.x;
    const right = 1 - (r.x + r.w);
    if (left < margins - EPS || right < margins - EPS) {
      violations.push({
        code: 'CONSTITUTIONAL_VIOLATION',
        severity: 'warning',
        message: `« ${label(layer)} » sort de la marge de grille (${(margins * 100).toFixed(0)} %).`,
        layerIds: [layer.id],
        measured: round(Math.min(left, right) * 100, 1),
        threshold: round(margins * 100, 1),
      });
    }
  }

  /* --- STYLE_MISMATCH ---------------------------------------------------- */
  // Noir et blanc purs sont des NEUTRES, pas des couleurs hors charte : ce
  // sont les seules valeurs qui garantissent un contraste sur n'importe quel
  // fond (voir `pickForeground`). Les refuser produirait un faux positif dès
  // qu'un texte est posé sur un fond saturé.
  const palette = new Set([...dna.palette.colors, '#FFFFFF', '#000000'].map((c) => c.toUpperCase()));
  for (const layer of layers) {
    const fill = layer.a_sty.fill;
    if (fill && layer.a_sem.type !== 'deco' && !palette.has(fill.toUpperCase())) {
      violations.push({
        code: 'STYLE_MISMATCH',
        severity: 'warning',
        message: `La couleur ${fill} de « ${label(layer)} » n'appartient pas à la palette.`,
        layerIds: [layer.id],
      });
    }
    const role = layer.a_sem.role;
    if (role && !(role in dna.typography)) {
      violations.push({
        code: 'STYLE_MISMATCH',
        severity: 'error',
        message: `Le rôle typographique « ${role} » n'existe pas dans la charte.`,
        layerIds: [layer.id],
      });
    }
  }

  /* --- MISSING_REQUIRED -------------------------------------------------- */
  const ids = new Set(layers.map((l) => l.id));
  for (const required of ['l-fond', 'l-titre', 'l-logo']) {
    if (!ids.has(required)) {
      violations.push({
        code: 'MISSING_REQUIRED',
        severity: 'error',
        message: `L'élément obligatoire « ${required} » est absent de la composition.`,
        layerIds: [required],
      });
    }
  }

  /* --- Indicateurs + score ---------------------------------------------- */
  const indicators = computeIndicators(layout, dna, contrastByLayer);
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const mean = meanIndicators(indicators);
  // Le score ne peut pas contredire les violations : une erreur le plafonne.
  const raw = Math.max(0, mean * 10 - errors * 1.4 - warnings * 0.3);
  const score = round(errors > 0 ? Math.min(raw, 6) : raw, 1);

  return { violations, indicators, score };
}

/* -------------------------------------------------------------------------- */
/* Les 8 indicateurs PosterLayout                                             */
/* -------------------------------------------------------------------------- */

function computeIndicators(
  layout: Layout,
  dna: BrandDNA,
  contrasts: Map<string, number>,
): LayoutIndicators {
  const layers = [...layout.calques].sort((a, b) => a.o - b.o);
  const canvasArea = layout.canvas.w * layout.canvas.h;
  const texts = layers.filter((l) => l.a_sem.type === 'text');

  const val = ratio(
    layers.filter((l) => area(rectOf(l)) / canvasArea > 0.001).length,
    layers.length,
  );

  let overlappingPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      totalPairs += 1;
      if (iou(rectOf(texts[i]!), rectOf(texts[j]!)) > EPS) overlappingPairs += 1;
    }
  }
  const ove = totalPairs === 0 ? 1 : 1 - overlappingPairs / totalPairs;

  // Alignement : un bord gauche ou droit proche d'une marge de grille.
  const { margins } = dna.grid;
  const aligned = layers.filter((l) => {
    const r = rectOf(l);
    if (r.w >= 0.98) return true;
    const left = Math.abs(r.x - margins);
    const right = Math.abs(1 - (r.x + r.w) - margins);
    return Math.min(left, right) < 0.012;
  }).length;
  const ali = ratio(aligned, layers.length);

  const underlays = layers.filter((l) => l.a_sem.type === 'underlay');

  /*
   * Undl ne mesure pas « combien de textes ont une sous-couche » (ce serait
   * punir une affiche dont un seul texte en a besoin), mais « parmi les textes
   * qui en ont BESOIN, combien en ont une ». Le besoin est mesuré, pas déclaré :
   * on recalcule le contraste en ignorant les sous-couches, et un texte dont le
   * contraste tombe sous AA sans elles est considéré comme dépendant.
   */
  const withoutUnderlays: Layout = {
    ...layout,
    calques: layout.calques.filter((l) => l.a_sem.type !== 'underlay'),
  };
  const needing = texts.filter((t) => {
    if (!t.a_sty.fill) return true;
    const bg = resolveBackground(withoutUnderlays, t);
    return contrastRatio(parseColor(t.a_sty.fill), bg) < AA_TEXT;
  });
  const supported = needing.filter((t) =>
    underlays.some((u) => intersection(rectOf(u), rectOf(t)) > EPS && u.o < t.o),
  ).length;
  const undl = needing.length === 0 ? 1 : ratio(supported, needing.length);

  const strictlyBelow = underlays.filter((u) =>
    texts.every((t) => intersection(rectOf(u), rectOf(t)) <= EPS || u.o < t.o),
  ).length;
  const unds = ratio(strictlyBelow, underlays.length);

  // Utilisation : union des aires (approchée par somme saturée, suffisant pour
  // un indicateur et volontairement conservateur).
  let covered = 0;
  const background = layers.find((l) => l.id === 'l-fond');
  for (const layer of layers) {
    if (layer.id === background?.id) continue;
    covered += area(rectOf(layer));
  }
  const uti = round(Math.min(1, covered / canvasArea), 3);

  // Occlusion : part des textes recouverts par une couche opaque au-dessus.
  const occluded = texts.filter((t) =>
    layers.some(
      (l) =>
        l.o > t.o &&
        l.a_sem.type !== 'underlay' &&
        (l.a_sty.opacity ?? 1) > 0.9 &&
        intersection(rectOf(l), rectOf(t)) > area(rectOf(t)) * 0.15,
    ),
  ).length;
  const occ = 1 - ratio(occluded, texts.length);

  const readable = texts.filter((t) => (contrasts.get(t.id) ?? 0) >= AA_TEXT).length;
  const rea = ratio(readable, texts.length);

  return { val, ove, ali, undl, unds, uti, occ, rea };
}

function meanIndicators(i: LayoutIndicators): number {
  const values = [i.val, i.ove, i.ali, i.undl, i.unds, i.uti, i.occ, i.rea];
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* -------------------------------------------------------------------------- */
/* Boucle de raffinement : instabilité inter-ronde                            */
/* -------------------------------------------------------------------------- */

/**
 * Détecte les attributs NON verrouillés qui changent d'une ronde à l'autre.
 *
 * C'est la règle `ROUND_INSTABILITY` du corpus : une valeur qui oscille n'a pas
 * été décidée. Elle n'est calculable qu'en comparant deux rondes — d'où cette
 * fonction séparée du validateur.
 */
export function detectInstability(previous: Layout, next: Layout): Violation[] {
  const violations: Violation[] = [];
  const before = new Map(previous.calques.map((l) => [l.id, l]));

  for (const layer of next.calques) {
    const old = before.get(layer.id);
    if (!old) continue;

    const checks: Array<[keyof Layer['M'], keyof Layer['a_geo'], number, number]> = [
      ['lock_x', 'x', old.a_geo.x, layer.a_geo.x],
      ['lock_y', 'y', old.a_geo.y, layer.a_geo.y],
      ['lock_w', 'w', old.a_geo.w, layer.a_geo.w],
      ['lock_h', 'h', old.a_geo.h, layer.a_geo.h],
    ];

    for (const [lock, attr, a, b] of checks) {
      if (layer.M[lock]) continue;
      if (Math.abs(a - b) > 1e-4) {
        violations.push({
          code: 'ROUND_INSTABILITY',
          severity: 'warning',
          message: `« ${layer.id} » : ${attr} change à chaque ronde sans être verrouillé (${a.toFixed(3)} → ${b.toFixed(3)}).`,
          layerIds: [layer.id],
          measured: round(Math.abs(a - b), 4),
        });
      }
    }

    const textChanged = old.a_sem.text !== layer.a_sem.text && !layer.M.lock_text;
    if (textChanged && old.a_sty.fontSize !== layer.a_sty.fontSize) {
      // Un changement de contenu doit réajuster la taille : ce n'est pas de
      // l'instabilité, c'est la règle « taille déduite du contenu ».
      continue;
    }
  }

  return violations;
}

/* -------------------------------------------------------------------------- */
/* Utilitaires                                                                 */
/* -------------------------------------------------------------------------- */

function label(layer: Layer): string {
  if (layer.a_sem.text) return truncate(layer.a_sem.text);
  if (layer.a_sem.asset) return layer.a_sem.asset;
  return layer.id;
}

function truncate(text: string | undefined, max = 34): string {
  const value = (text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function normalizeText(text: string | undefined): string {
  return (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function ratio(part: number, total: number): number {
  return total <= 0 ? 1 : round(part / total, 3);
}

function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export { relativeLuminance };
