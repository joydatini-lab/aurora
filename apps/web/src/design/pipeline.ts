import { parseColor, pickForeground } from '../theme/color.ts';
import { detectInstability, resolveBackground, validateLayout } from './validate.ts';
import type { BrandDNA, Layer, Layout, ValidationReport, Violation } from './types.ts';

/**
 * Boucle de raffinement.
 *
 * Le corpus impose trois choses (AFFICHE §3.1, §2.3) :
 *   1. un plafond de rondes (K = 4) ;
 *   2. un arrêt anticipé dès que le score ne progresse plus ;
 *   3. le respect absolu des attributs verrouillés (`M`) à chaque ronde.
 *
 * Les réparations sont déterministes : ce n'est pas un modèle qui « améliore »
 * la composition, c'est une règle qui corrige un défaut mesuré. Le modèle, s'il
 * est un jour branché, ne verra que le rapport — jamais les pixels.
 */

export type StopReason = 'clean' | 'plateau' | 'max-rounds';

export interface RoundInfo {
  round: number;
  score: number;
  errors: number;
  warnings: number;
}

export interface RefinedLayout {
  layout: Layout;
  report: ValidationReport;
  rounds: number;
  history: RoundInfo[];
  stoppedBy: StopReason;
  instability: Violation[];
}

export interface RefineOptions {
  maxRounds?: number;
  /** Gain minimal de score pour continuer. En dessous, on s'arrête. */
  minGain?: number;
}

export function refine(
  initial: Layout,
  dna: BrandDNA,
  options: RefineOptions = {},
): RefinedLayout {
  const maxRounds = options.maxRounds ?? 4;
  const minGain = options.minGain ?? 0.05;

  let layout = initial;
  let report = validateLayout(layout, dna);
  const history: RoundInfo[] = [snapshot(0, report)];
  let stoppedBy: StopReason = 'max-rounds';
  let rounds = 0;

  for (let round = 1; round <= maxRounds; round += 1) {
    if (!report.violations.some((v) => v.severity === 'error')) {
      stoppedBy = 'clean';
      break;
    }

    const next = repair(layout, dna, report);
    const nextReport = validateLayout(next, dna);
    rounds = round;

    history.push(snapshot(round, nextReport));

    if (nextReport.score <= report.score + minGain) {
      // Plus de gain : continuer ne ferait qu'ajouter du bruit et du coût.
      layout = next;
      report = nextReport;
      stoppedBy = 'plateau';
      break;
    }

    layout = next;
    report = nextReport;
  }

  if (rounds === maxRounds && stoppedBy === 'max-rounds' && report.violations.some((v) => v.severity === 'error')) {
    stoppedBy = 'max-rounds';
  }

  // Instabilité : on compare la dernière ronde à la précédente.
  const instability =
    history.length > 1 ? detectInstability(initial, layout) : [];

  return { layout, report, rounds, history, stoppedBy, instability };
}

function snapshot(round: number, report: ValidationReport): RoundInfo {
  return {
    round,
    score: report.score,
    errors: report.violations.filter((v) => v.severity === 'error').length,
    warnings: report.violations.filter((v) => v.severity === 'warning').length,
  };
}

/* -------------------------------------------------------------------------- */
/* Réparations                                                                 */
/* -------------------------------------------------------------------------- */

function repair(layout: Layout, dna: BrandDNA, report: ValidationReport): Layout {
  const byCode = (code: Violation['code']) => report.violations.filter((v) => v.code === code);
  const layers = layout.calques.map((l) => clone(l));
  const byId = new Map(layers.map((l) => [l.id, l]));

  // 1 — Contraste : on change la couleur du texte, jamais sa géométrie.
  for (const violation of byCode('WCAG_CONTRAST')) {
    const layer = byId.get(violation.layerIds[0] ?? '');
    if (!layer || layer.M.lock_cat) continue;
    const bg = resolveBackground({ ...layout, calques: layers }, layer);
    layer.a_sty.fill = pickForeground(bg).color;
  }

  // 2 — Sous-couche au-dessus de son texte : on échange les ordres de rendu.
  for (const violation of byCode('UNDERLAY_MISPLACE')) {
    const [underlayId, textId] = violation.layerIds;
    const underlay = byId.get(underlayId ?? '');
    const text = byId.get(textId ?? '');
    if (!underlay || !text) continue;
    if (underlay.M.lock_cat || text.M.lock_cat) continue;
    const swap = underlay.o;
    underlay.o = text.o;
    text.o = swap;
  }

  // 3 — Dépassement : on ramène dans le canevas, sauf attributs verrouillés.
  for (const violation of byCode('BOUNDARY_OVERRUN')) {
    const layer = byId.get(violation.layerIds[0] ?? '');
    if (!layer) continue;
    const g = layer.a_geo;
    if (!layer.M.lock_w) g.w = Math.min(g.w, layout.canvas.w);
    if (!layer.M.lock_h) g.h = Math.min(g.h, layout.canvas.h);
    if (!layer.M.lock_x) g.x = clamp(g.x, 0, layout.canvas.w - g.w);
    if (!layer.M.lock_y) g.y = clamp(g.y, 0, layout.canvas.h - g.h);
  }

  // 4 — Marges de grille : on aligne, sans jamais forcer un calque verrouillé.
  for (const violation of byCode('CONSTITUTIONAL_VIOLATION')) {
    const layer = byId.get(violation.layerIds[0] ?? '');
    if (!layer || layer.M.lock_x) continue;
    const { margins } = dna.grid;
    if (layer.a_geo.x < margins) layer.a_geo.x = margins;
    const overflow = layer.a_geo.x + layer.a_geo.w - (1 - margins);
    if (overflow > 0 && !layer.M.lock_w) layer.a_geo.w -= overflow;
  }

  return { ...layout, calques: layers.sort((a, b) => a.o - b.o) };
}

function clone(layer: Layer): Layer {
  return {
    ...layer,
    a_sem: { ...layer.a_sem },
    a_geo: { ...layer.a_geo },
    a_sty: { ...layer.a_sty },
    M: { ...layer.M },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Vérifie qu'aucun attribut verrouillé n'a bougé. Utilisé par les tests et l'UI. */
export function locksRespected(before: Layout, after: Layout): boolean {
  const previous = new Map(before.calques.map((l) => [l.id, l]));
  for (const layer of after.calques) {
    const old = previous.get(layer.id);
    if (!old) continue;
    if (layer.M.lock_x && Math.abs(old.a_geo.x - layer.a_geo.x) > 1e-9) return false;
    if (layer.M.lock_y && Math.abs(old.a_geo.y - layer.a_geo.y) > 1e-9) return false;
    if (layer.M.lock_w && Math.abs(old.a_geo.w - layer.a_geo.w) > 1e-9) return false;
    if (layer.M.lock_h && Math.abs(old.a_geo.h - layer.a_geo.h) > 1e-9) return false;
    if (layer.M.lock_cat && old.a_sty.fill !== layer.a_sty.fill) return false;
    if (layer.M.lock_text && old.a_sem.text !== layer.a_sem.text) return false;
  }
  return true;
}

export { parseColor };
