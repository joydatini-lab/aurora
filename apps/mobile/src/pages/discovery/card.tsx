/**
 * VeilleProgramCard — la CARTE DE LISTE v2 d'un programme de veille
 * (M-46, v2 MVP Veille + Chat agentique, S4, écran 12 « Carte de liste
 * au design v2 » du plan 2026-10-17, le Stitch
 * `discovery_cartes_fiches_ditoriales_a_r_es_statut`).
 *
 * Une carte = UN programme de veille (une `Automation`
 * `jobKind:'research'`). La carte v2 (M-46) reprend le design Stitch
 * écran 12 :
 *   1. l'EN-TÊTE COLORÉ (`data-card-header`) : la pastille teintée
 *      par le SSoT de la teinte (`pickCardTone`, 4 teintes cyclées
 *      par le hash stable de l'`id` du programme) + le sous-titre
 *      type/cadence (`cardToneLabel`, le SSoT du `cadenceLabel`
 *      partagé avec le rapport) + le TITRE en gras du programme ;
 *   2. le 3-POINTS MENU **DANS L'EN-TÊTE** (le menu s'est déporté
 *      du corps vers le header, le SSoT du Stitch écran 12 :
 *      le menu est en haut à droite, plus dans le body) ;
 *   3. le corps (le SSoT du programme, le VAULT.md rendu « style
 *      Notion » via `VaultMdView`) ;
 *   4. les 3 INFOS SSoT (le footer v2, une ligne de 3 pilules :
 *      le count sources + le delta "ce jour", la date de la
 *      DERNIÈRE VEILLE, le verdict de PERTINENCE) — plus le
 *      footer v1 (total + date en 2 spans distincts, le SSoT du
 *      Lot 4 remplacé ici par le SSoT du Stitch écran 12).
 *
 * AD-7 : le menu N'ÉCRIT JAMAIS `automations` directement — il émet
 * les commandes typées du kernel (`update_automation` G2 /
 * `delete_automation` G3), appliquées par le module Integrations
 * (le single-writer, ADR §5 : la suppression est DESTRUCTIVE →
 * confirmation, le vault est ARCHIVÉ pas supprimé — cohérent avec
 * le gel G2). Les actions s'ouvrent sur l'agent (le SSoT du
 * programme), pré-bound à l'identité du programme.
 *
 * AD-13 : les états (chargement / vide / erreur / hors-ligne /
 * tué) sont portés par `AuroraCard` (le `state` prop) — la carte
 * v2 reprend le SSoT `idle` du contenu (le header + le corps + le
 * footer 3 infos), les autres états remplacent le contenu par leur
 * shell (le `AuroraCard` les gère, pas cette carte).
 *
 * Design (AD-17) : les teintes sont des `var(--aurora-*)` tokens
 * (`data-card-tone="accent"` → le CSS applique `--aurora-accent-primary`
 * à la pastille), zéro valeur brute. Radius ≤ 8px, tap ≥ 44px.
 */
import { AURORA_ICONS } from '@aurora/ui';
const Ellipsis = AURORA_ICONS.Ellipsis;
const Pencil = AURORA_ICONS.Pencil;
const Trash2 = AURORA_ICONS.Trash2;
const Files = AURORA_ICONS.Files;
const Minus = AURORA_ICONS.Minus;
const Compass = AURORA_ICONS.Compass;

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aurora/ui';
import {
  AuroraCard,
  AuroraCardBadge,
  AuroraCardFooter,
} from '@aurora/ui';
import type { VeilleProgram } from '../../hooks/use-veille-programs';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { VaultMdView } from '../../components/vault/VaultMdView';
import { pickCardTone, cardToneLabel } from '../../lib/veille-card-ssoT';
import { cadenceLabel } from '../../components/veille/veille-rapport.js';

/** Format the 0..1 relevance verdict into the card chip (plain French). */
function relevanceLabel(
  relevance: number | null,
): { text: string; tone: 'high' | 'mid' | 'low' | 'muted' } {
  if (relevance === null) return { text: 'Premier run…', tone: 'muted' };
  const pct = Math.round(relevance * 100);
  if (relevance >= 0.7) return { text: `Pertinence élevée · ${pct}%`, tone: 'high' };
  if (relevance >= 0.4) return { text: `Pertinence moyenne · ${pct}%`, tone: 'mid' };
  return { text: `Pertinence faible · ${pct}%`, tone: 'low' };
}

/** Maps the plain `relevanceLabel` tone onto the design-system `tone`. */
const TONE_MAP = {
  high: 'success',
  mid: 'neutral',
  low: 'warning',
  muted: 'neutral',
} as const;

/** The "ce jour" delta chip (the last run vs the previous one). */
function deltaChip(delta: number) {
  if (delta > 0)
    return (
      <AuroraCardBadge label={`+${delta}`} tone="success" />
    );
  if (delta < 0)
    return <AuroraCardBadge label={`${delta}`} tone="warning" />;
  return (
    <AuroraCardBadge
      label={
        <span className="inline-flex items-center gap-1">
          <Minus size={11} aria-hidden />
          aucun
        </span>
      }
      tone="neutral"
    />
  );
}

/** The 3-point menu (Modifier G2 / Supprimer G3). READ-ONLY surface.
 *  M-46 : le menu est porté par l'en-tête (le `data-card-header`),
 *  plus par le corps (le design Stitch écran 12 : le menu est en
 *  haut à droite de la carte, pas dans le body). */
function ProgramMenu({ program }: { program: VeilleProgram }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const a = program.automation;
  const label = a.name || 'ce programme';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="aurora-tap rounded-md p-1.5 text-muted-foreground hover:bg-muted/60"
          aria-label={`Options du programme ${label}`}
        >
          <Ellipsis size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Programme de veille</DropdownMenuLabel>
        {/* G2 (AD-7) : modifier le programme → l'agent, pré-bound au nom du
            programme (le module Integrations écrit `automations`, pas ici). */}
        <DropdownMenuItem
          onSelect={() =>
            navigate(
              `/agent?intent=${encodeURIComponent(`Modifie mon programme de veille "${a.name}"`)}`,
            )
          }
        >
          <Pencil size={14} aria-hidden />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* G3 (AD-7, ADR §5) : la suppression est DESTRUCTIVE → confirmation.
            Le vault est ARCHIVÉ (pas supprimé, gel G2) — l'agent applique
            `delete_automation` et le module Discovery archive le vault. */}
        {confirming ? (
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() =>
              navigate(
                `/agent?intent=${encodeURIComponent(
                  `Supprime mon programme de veille "${a.name}" (le vault d'archivage est conservé)`,
                )}`,
              )
            }
          >
            <Trash2 size={14} aria-hidden />
            Confirmer la suppression ?
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => setConfirming(true)}
          >
            <Trash2 size={14} aria-hidden />
            Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VeilleProgramCard({ program }: { program: VeilleProgram }) {
  const a = program.automation;
  const last = program.lastRun;
  const relevance = relevanceLabel(program.relevance);
  const vaultMd = program.vault?.vaultMd ?? '';
  const domaine = program.vault?.domaine ?? a.id;

  // M-46 : la teinte SSoT du programme (le `data-card-tone` du header)
  // + le sous-titre type/cadence (le `cardToneLabel`, le SSoT du
  // `cadenceLabel` partagé avec le rapport).
  const tone = pickCardTone(a.id);
  const cron = a.cron ?? null;
  const cadence = cron ? cadenceLabel(cron) : null;
  const typeLabel = cardToneLabel(cadence);

  // Le footer v2 (M-46) : 3 infos SSoT sur une ligne (le design
  // Stitch écran 12 : sources+delta, date dernière veille, pertinence)
  // — le SSoT du Lot 4 (total + date) est remplacé par le SSoT du
  // Stitch (le delta "ce jour" remplace le "total au total", la
  // date est la DERNIÈRE VEILLE (pas le run), la pertinence est le
  // verdict du run).
  const lastDate = last?.date ?? '—';

  return (
    <AuroraCard
      variant="object"
      data-card-tone={tone}
      data-veille-program={a.id}
      aria-label={`Programme de veille ${a.name}`}
    >
      {/* M-46 : l'EN-TÊTE COLORÉ (le SSoT du Stitch écran 12) —
          le pastille + le type/cadence + le titre + le MENU 3 POINTS
          (le menu est DANS l'en-tête, plus dans le corps). */}
      <div
        data-card-header
        className="flex items-start justify-between gap-2"
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* La pastille teintée (le SSoT de la teinte, `data-card-tone`). */}
          <span
            aria-hidden
            className="veil-card-pastille flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          >
            <Compass size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {/* Le sous-titre type/cadence (le SSoT du `cardToneLabel`). */}
            <p className="veil-card-type-cadence m-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </p>
            {/* Le titre en gras du programme (le SSoT de l'`AuroraCardHeader`
                v1 remplacé ici par le SSoT du Stitch écran 12). */}
            <h3 className="veil-card-title m-0 text-[15px] font-semibold leading-tight text-foreground">
              {a.name}
            </h3>
          </div>
        </div>
        {/* M-46 : le menu 3 points est DANS l'en-tête (le SSoT du Stitch
            écran 12 : le menu est en haut à droite de la carte). */}
        <ProgramMenu program={program} />
      </div>

      {/* Le SSoT du programme : le VAULT.md est rendu « style Notion »
          DANS la carte (Lot 4.1) — c'est le document unique évolutif
          que l'élève consulte, PAS un lien externe vers l'agent. */}
      <div data-vault-view={domaine} className="rounded-md bg-muted/40 p-2.5">
        <VaultMdView
          vaultMd={vaultMd}
          domaine={domaine}
          ariaLabel={`Document de synthèse du programme ${a.name}`}
        />
      </div>

      {/* M-46 : le footer v2 (3 infos SSoT, le design Stitch écran 12 :
          le count sources + le delta "ce jour", la DERNIÈRE VEILLE
          (la date du run), le verdict de pertinence). */}
      <AuroraCardFooter className="veil-card-stats-v2">
        {/* Info 1 : le count sources du dernier run + le delta "ce jour". */}
        <span className="inline-flex items-center gap-1">
          <Files size={11} aria-hidden />
          {last
            ? `${last.newSources} source${last.newSources > 1 ? 's' : ''}`
            : 'En attente du 1er run'}
          {deltaChip(program.delta)}
        </span>
        {/* Info 2 : la date de la DERNIÈRE VEILLE (le `lastRun.date` du
            `VaultRunManifest`, le SSoT du Lot 4). */}
        <span className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums">
          {lastDate}
        </span>
        {/* Info 3 : le verdict de PERTINENCE du dernier run (le SSoT
            du `relevanceLabel`, remplacé ici par le SSoT du Stitch
            écran 12 : le badge coloré à droite du footer). */}
        <AuroraCardBadge
          label={relevance.text}
          tone={TONE_MAP[relevance.tone]}
        />
      </AuroraCardFooter>
    </AuroraCard>
  );
}
