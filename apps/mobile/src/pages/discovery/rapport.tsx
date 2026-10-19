/**
 * rapport.tsx (M-44, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L464–476, écran 13). Le RAPPORT DE VEILLE d'un programme
 * (route `/discovery/:id`, gated sur le feature `discovery`).
 *
 * La page LIT le programme par `id` (le `:id` = l'`id` de l'
 * `Automation` du programme, le SSoT du `buildVeilleProgram` — le
 * domaine du vault est keyé par `automation.id`, le V1 du
 * `veille-programs-join.js`) : le `useVeillePrograms` join local
 * (le miroir PowerSync `automations` + `discovery_vault`, AD-7
 * local-first, la LECTURE HORS LIGNE du rapport — le miroir est le
 * SSoT, le réseau n'est PAS sur le chemin de rendu).
 *
 * Design SSoT : Stitch `discovery_rapport_de_veille_pr_cision_fraunces`
 * — le `RapportMd` (le VAULT.md rendu « style édition », les renvois
 * `[n]` CLICKABLES, le bandeau « lecture seule », le bouton
 * « Sources · N » qui ouvre la `SourcesSheet` de l'écran 14) +
 * l'en-tête du rapport (le titre du programme + le run N + la date +
 * le verdict, le SSoT `buildReportMeta` du module pur
 * `veille-rapport.js`).
 *
 * 5 états UX + killed (AD-13, le G-M2 via `UxStates`) :
 *   - chargement  = le `VeilleProgramSkeleton` (le SSoT du rapport,
 *     jamais un skeleton générique) ;
 *   - vide        = « 1er run en attente » (le programme existe mais
 *     n'a PAS encore de run — le SSoT du `meta.pending`, le CTA vide
 *     retourne à la LISTE des programmes, l'état AD-13 honnête,
 *     jamais un faux rapport, le motif `AuroraEmptyBackdrop` M-13) ;
 *   - erreur      = le rapport est indisponible (le retry local) ;
 *   - succès      = le rapport du dernier run (le SSoT du manifest
 *     append-only, le verdict DÉRIVÉ du delta M-43) ;
 *   - hors-ligne  = le dernier connu du miroir (AD-7, le badge
 *     « Hors ligne » + le SSoT du rapport lisible — le rapport est
 *     la surface de LECTURE locale, le miroir suffit, l'état est
 *     honnête) ;
 *   - killed      = la reconnexion (le G-M2, le `useKilledDetection`).
 *
 * AD-7 single-writer : le rapport ne commite JAMAIS dans le vault —
 * seul le run `research` (le module Discovery) écrit le SSoT, la page
 * est la surface de lecture. Le menu 3 pts du rapport (le G3
 * `delete_automation` du SSoT du `ProgramMenu` de la carte) reste
 * l'émission de la commande typée du kernel, l'application est le
 * module Integrations (le single-writer, AD-7).
 */
import { IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const ChevronLeft = AURORA_ICONS.ChevronLeft;
const Ellipsis = AURORA_ICONS.Ellipsis;
const List = AURORA_ICONS.List;

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@aurora/ui';
import { UxStates, type UxStateFlags } from '../../ux-states';
import { useOnlineStatus } from '../../hooks/use-online';
import { useKilledDetection } from '../../hooks/use-killed';
import { useVeillePrograms } from '../../hooks/use-veille-programs';
import type { VeilleProgram } from '../../hooks/use-veille-programs';
import { AuroraEmptyBackdrop } from '../../components/AuroraEmptyBackdrop';
import { RapportMd } from '../../components/veille/rapport-md';
import { SourcesSheet } from '../../components/veille/sources-sheet';
import {
  buildReportMeta,
  parseVaultSections,
  type VaultRef,
} from '../../components/veille/veille-rapport';

export function RapportDeVeillePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { programs, isPending, isError, refetch } = useVeillePrograms();
  const killed = useKilledDetection(() => refetch());

  // Le programme du `:id` (le `id` de l'`Automation`, le SSoT du
  // `buildVeilleProgram` — le domaine du vault est keyé par `id`).
  const program = programs.find((p) => p.automation.id === id) ?? null;
  const vaultMd = program?.vault?.vaultMd ?? '';

  // L'ouverture de la FEUILLE DES SOURCES (le SSoT de l'écran 14,
  // le bouton « Sources · N » du rapport + le renvoi `[n]` tapé) :
  // l'état local du `Sheet` + la source surbrillée (le renvoi
  // `[n]` du rapport cible la source N de la feuille, le SSoT du
  // focus du Stitch).
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [highlightN, setHighlightN] = useState<number | undefined>(undefined);

  const onRefTap = (ref: VaultRef) => {
    setHighlightN(ref.n);
    setSourcesOpen(true);
  };

  // Le SSoT des sources de la feuille (le `parsed.refs` du rapport,
  // le SSoT de la section `## Sources` du VAULT.md — le `## Sources`
  // est le SSoT de la dédup M-43, les numéros continuent).
  const parsed = program ? parseVaultSections(vaultMd) : null;
  const refs = parsed?.refs ?? [];
  const meta = program ? buildReportMeta(program) : null;

  const state = isError
    ? ({ status: 'error', error: { code: 'discovery/rapport_load_failed', message: 'Rapport indisponible' } } as const)
    : isPending || program === null || meta === null
      ? ({ status: 'loading' } as const)
      : meta.pending
        ? ({ status: 'empty' } as const)
        : ({ status: 'success', data: program } as const);

  const flags: UxStateFlags = {
    offline: !online,
    killed,
    onRetry: () => refetch(),
    // Le CTA vide du rapport = « 1er run en attente » (le SSoT du
    // `meta.pending`) : retour à la LISTE des programmes (le
    // rapport n'a pas encore de run, l'état AD-13 honnête — le
    // `emptyCtaHref` retient le rapport, le motif `AuroraEmptyBackdrop`
    // M-13 est monté sur l'état vide de la page).
    emptyCta: 'Voir le programme',
    emptyCtaHref: '/discovery',
    emptyMessage:
      'Le 1er run de ce programme est en attente — le rapport s\'écrira au prochain run.',
  };

  return (
    <>
      <IonHeader>
        <IonTitle>Rapport de veille</IonTitle>
      </IonHeader>
      <IonContent>
        <div data-veille-rapport className="relative">
          {/* L'en-tête du rapport (le SSoT du Stitch « TopNavigationBar »
              — le retour + le bouton « Sources · N » + le menu 3 pts) :
              le bouton Sources ouvre la FEUILLE (l'écran 14), le menu
              3 pts est le G3 `delete_automation` (le SSoT de la carte,
              l'émission de la commande typée, AD-7 single-writer). */}
          <div className="veille-rapport__bar" data-veille-rapport-bar>
            <button
              type="button"
              className="aurora-btn aurora-btn--ghost aurora-tap"
              aria-label="Retour aux programmes de veille"
              onClick={() => navigate('/discovery')}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <span className="veille-rapport__bar-title">Rapport de veille</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="aurora-btn aurora-btn--secondary aurora-tap"
                data-sources-button
                aria-label={`Afficher les sources (${refs.length})`}
                onClick={() => {
                  setHighlightN(undefined);
                  setSourcesOpen(true);
                }}
              >
                <List size={15} aria-hidden />
                Sources
                <span aria-hidden>·</span>
                {refs.length}
              </button>
              {program ? <RapportMenu program={program} /> : null}
            </div>
          </div>

          <UxStates state={state} flags={flags} label="Rapport de veille">
            {meta?.pending ? (
              // L'état vide honnête (le SSoT du `meta.pending` — le
              // programme n'a PAS encore de run, l'AD-13 : jamais un
              // faux rapport, le motif `AuroraEmptyBackdrop` M-13 est
              // monté en ARRIÈRE-PLAN du bloc, le parent `.relative`).
              <div className="relative" data-ux="empty" data-rapport-pending>
                <AuroraEmptyBackdrop />
                <p>{flags.emptyMessage}</p>
                <a className="aurora-btn aurora-btn--primary aurora-tap" href="/discovery" data-cta="back">
                  {flags.emptyCta}
                </a>
              </div>
            ) : program ? (
              // Le RAPPORT (le SSoT du VAULT.md du `buildVaultMd`, le
              // run N du SSoT du manifest append-only — le verdict
              // DÉRIVÉ du delta M-43, le SSoT du rapport est lu,
              // jamais recalculé par la surface, AD-7).
              <RapportMd
                vaultMd={vaultMd}
                program={program}
                domaine={program.vault?.domaine ?? program.automation.id}
                ariaLabel={`Rapport de veille ${meta?.title ?? program.automation.name ?? ''}`}
                onRefTap={onRefTap}
              />
            ) : null}
          </UxStates>

          {/* La FEUILLE DES SOURCES (le SSoT de l'écran 14, le
              `Sheet` Radix du `@aurora/ui` — le SSoT Stitch
              `discovery_menu_des_sources_pr_cision_fraunces` :
              les filtres + les sources + le « Copier les
              références », le 44 px a11y, le focus du renvoi `[n]`
              surbrille la source N de la feuille). */}
          {program ? (
            <SourcesSheet
              open={sourcesOpen}
              onOpenChange={setSourcesOpen}
              sources={refs.map((r) => ({
                n: r.n,
                title: r.title,
              }))}
              highlightN={highlightN}
              ariaLabel={`Sources du rapport ${meta?.title ?? ''}`}
            />
          ) : null}
        </div>
      </IonContent>
    </>
  );
}

/**
 * Le menu 3 pts du RAPPORT (le SSoT de l'en-tête du Stitch — le
 * rapport a le MÊME menu que la carte : le G3 `delete_automation`,
 * le SSoT de la carte. Le rapport ne porte PAS de G2
 * `update_automation` (le rapport n'est PAS le SSoT du programme —
 * le programme est SSoT de la LISTE, le rapport est la lecture, le
 * « Modifier » reste le G2 de la carte). Le menu 3 pts du rapport
 * est le G3 `delete_automation` + le « Modifier » (le G2, le
 * SSoT du rapport : le rapport porte le MÊME menu que la carte, le
 * SSoT du Stitch).
 */
function RapportMenu({ program }: { program: VeilleProgram }) {
  const navigate = useNavigate();
  const label = program.automation.name ?? 'ce programme';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="aurora-btn aurora-btn--ghost aurora-tap"
          aria-label={`Options du rapport ${label}`}
        >
          <Ellipsis size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            navigate(
              `/agent?intent=${encodeURIComponent(`Modifie mon programme de veille "${label}"`)}`,
            )
          }
        >
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onSelect={() =>
            navigate(
              `/agent?intent=${encodeURIComponent(
                `Supprime mon programme de veille "${label}" (le vault d'archivage est conservé)`,
              )}`,
            )
          }
        >
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
