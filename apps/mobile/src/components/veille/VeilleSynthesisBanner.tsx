/**
 * VeilleSynthesisBanner — la bannière de synthèse des 10 vaults de
 * veille (Discovery L5, lot post-ReUI 2026-10-14, figelé commit
 * `c42f3c9`).
 *
 * C'est le document SSoT de synthèse des vaults (le § L5 "Décision 3
 * figelée" de la mémoire `discovery-refactor-lots-2-4`) : une bannière
 * en tête de la page `/discovery` qui croise les 10 vaults en
 * READ-ONLY (AD-7, le chat-agent propose les synthèses globales, la
 * bannière n'est QUE la surface de lecture locale — le seul writer
 * reste le run `research`).
 *
 * Les 3 invariants SSoT du L5 (figelés 2026-10-14) sont portés par le
 * SSoT `VeilleSynthesis` du join pur `veille-synthesis-join.js` :
 *   (1) le **taux de doublons** `dupRate` (0..1) — la preuve que le
 *       cache du vault préserve le run N+1 (le run ne re-recherche
 *       pas le contenu des runs précédents).
 *   (2) la **pertinence SSoT** `avgRelevance` (dérivée du delta,
 *       agrégée du SSoT, jamais recalculée par la surface).
 *   (3) le **verdict du cache** `cacheValid` (true si `dupRate ≤
 *       0.20`, le seuil SSoT du critère de validation de la feature).
 *
 * Design (AD-10 / AD-17) : la bannière est posée au-dessus de la liste
 * de cartes (le SSoT du § L5 : « la bannière de la page /discovery »).
 * Elle ne redéfinit PAS le contenu d'une carte — elle agrège les
 * SSoT des 10 vaults en 4 chiffres (le total programmes, le total
 * sources, la pertinence moyenne, le verdict du cache) + le CTA de
 * synthèse globale (le « Consulter » qui ouvre l'agent, le § L5
 * "Décision 3" : le chat-agent croise les 10 vaults, il propose des
 * synthèses globales — la bannière n'est QUE l'entrée, la synthèse
 * elle-même est produite par l'agent).
 *
 * Bornes (AD-7 état vide honnête, jamais une synthèse factice) :
 *   - 0 programme (le vault est vide, le SSoT de `buildVeilleSynthesis`)
 *     → la bannière est MASQUÉE (elle n'apparaît que si ≥ 1 vault a
 *     au moins 1 run — le § L5 "le run N+1 avec mémoire" exige un
 *     vault déjà existant, pas un état vide factice).
 *   - le SSoT `cacheValid` = false (le `dupRate` > 0.20, le run N+1
 *     re-recherche tout) → la bannière affiche le verdict du SSoT
 *     (« le cache ne préserve pas le run N+1 »), jamais un verdict
 *     factice d'un cache qui ne fonctionne pas.
 *   - le SSoT `avgRelevance` = null (aucun run, le § L5 "En attente
 *     du 1er run") → la bannière est MASQUÉE (pas de verdict SSoT
 *     sans run, l'état vide honnête AD-7).
 */
import { AURORA_ICONS } from '@aurora/ui';
const ShieldCheck = AURORA_ICONS.ShieldCheck;
const ShieldX = AURORA_ICONS.ShieldX;
const Files = AURORA_ICONS.Files;
const Compass = AURORA_ICONS.Compass;

import type { VeilleSynthesis } from '../../hooks/veille-synthesis-join';

/**
 * Format le verdict du cache SSoT (le L5 invariant 3) : le `cacheValid`
 * (true si `dupRate ≤ 0.20`) → l'état du SSoT (la bannière n'invente
 * JAMAIS un verdict, elle ne rend QUE le SSoT du join).
 */
function cacheVerdict(s: VeilleSynthesis) {
  if (s.cacheValid) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <ShieldCheck size={14} aria-hidden />
        Cache du vault valide
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-warning">
      <ShieldX size={14} aria-hidden />
      Cache en veille
    </span>
  );
}

/**
 * La bannière de synthèse des 10 vaults de veille (le § L5 de la
 * page `/discovery`). La surface est un `<section>` (le SSoT du
 * design system — pas une carte AD-10, la bannière est le SSoT
 * transversal des 10 programmes, pas une carte d'un programme).
 *
 * Les 4 chiffres SSoT (le total programmes, le total sources, la
 * pertinence moyenne, le verdict du cache) sont portés par le
 * SSoT `VeilleSynthesis` (le join pur du plain-JS module — la
 * bannière ne recalcule RIEN, elle ne rend QUE le SSoT du SSoT).
 */
export function VeilleSynthesisBanner({
  synthesis,
  onSynthesize,
}: {
  synthesis: VeilleSynthesis;
  onSynthesize?: () => void;
}) {
  // Le SSoT de la bannière (le § L5) : elle n'apparaît QUE si ≥ 1
  //  vault a au moins 1 run + un verdict SSoT de pertinence (le
  //  SSoT d'un cache "inconnu" n'est PAS un verdict factice —
  //  l'état vide honnête AD-7, jamais une bannière factice).
  if (synthesis.totalRuns === 0 || synthesis.avgRelevance === null) {
    return null;
  }

  const pct = Math.round(synthesis.avgRelevance * 100);
  // La date du dernier run (le SSoT du "à jour au" de la bannière, le
  //  § L5 "le document SSoT de synthèse des vaults évolue au fil des
  //  runs").
  const asOf = synthesis.lastDate ? `à jour au ${synthesis.lastDate}` : '—';

  return (
    <section className="veille-synthesis-banner" data-synthesis-banner aria-label="Synthèse des programmes de veille">
      <div className="veille-synthesis-banner__head">
        <div className="veille-synthesis-banner__title">
          <Compass size={18} aria-hidden />
          <span>Synthèse de ta veille</span>
          <span className="veil-synthesis-banner__as-of">{asOf}</span>
        </div>
        {onSynthesize && (
          <button
            type="button"
            onClick={onSynthesize}
            className="aurora-btn aurora-btn--ghost aurora-tap"
            data-synthesis-global-cta
          >
            <Files size={14} aria-hidden />
            Synthèse globale
          </button>
        )}
      </div>
      <div className="veille-synthesis-banner__stats">
        <div className="veille-synthesis-banner__stat">
          <span className="veil-synthesis-banner__value">{synthesis.totalPrograms}</span>
          <span className="veil-synthesis-banner__label">programmes</span>
        </div>
        <div className="veil-synthesis-banner__stat">
          <span className="veil-synthesis-banner__value">{synthesis.totalSources}</span>
          <span className="veil-synthesis-banner__label">sources au total</span>
        </div>
        <div className="veil-synthesis-banner__stat">
          <span className="veil-synthesis-banner__value">{pct}%</span>
          <span className="veil-synthesis-banner__label">pertinence moyenne</span>
        </div>
        <div className="veil-synthesis-banner__stat veil-synthesis-banner__stat--cache">
          {cacheVerdict(synthesis)}
          <span className="veil-synthesis-banner__label">
            {synthesis.pendingCount > 0 ? `· ${synthesis.pendingCount} en attente du 1er run` : ''}
          </span>
        </div>
      </div>
    </section>
  );
}
