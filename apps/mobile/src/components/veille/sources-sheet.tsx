/**
 * sources-sheet.tsx (M-44, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L464–476, écran 14). La FEUILLE DES SOURCES (le SSoT
 * Stitch `discovery_menu_des_sources_pr_cision_fraunces/code.html`).
 *
 * La feuille est un SHEET (le `Sheet` de Radix / shadcn, `side="bottom"`
 * sur mobile — la surface qui glisse depuis le bas, le Stitch la rend
 * en modal plein bas) : le titre « Sources · N » + le close `X`,
 * les CHIPS DE FILTRES (`VAULT_REF_FILTERS` — le SSoT du module pur
 * `veille-rapport.js`), la LISTE DES SOURCES (le `[n]` monospace
 * bleu + le titre + le chip de crédibilité + le `ExternalLink`
 * d'ouverture) + le bouton « Copier les références » (le `SheetFooter`).
 *
 * 44px A11Y : chaque item de la feuille + chaque chip de filtre +
 * chaque bouton porte UN CIBLE DE TAP ≥ 44 px (le `min-h-[44px]` du
 * `Sheet` / le `min-h-[44px]` du `li` — le SSoT du 44 px minimum
 * tap-target du design system mobile, 02 S6.1). Le renvoi `[n]` du
 * rapport (le `onRefTap` du `rapport-md.tsx`) OUVRE cette feuille +
 * met en SURBRILLANCE la source N (`highlightN` prop, le SSoT du
 * focus du Stitch « la feuille s'ouvre sur la source du renvoi »).
 *
 * AD-13 : une source SANS URL (`s.url === undefined`) → le
 * `ExternalLink` est DÉSERACTIVÉ (l'`a` n'est PAS rendu, l'item
 * reste lisible, le titre + le chip de crédibilité — jamais un lien
 * mort, le SSoT de la feuille : le `url` du rapport est au Storage,
 * `vault.storagePrefix`, AD-15 — la feuille V1 ne porte que le
 * titre/crédibilité/date du SSoT, l'URL est le `url` optionnel).
 *
 * « Copier les références » : le `clipboard` de l'API navigateur
 * (le SSoT du Stitch — le `navigator.clipboard.writeText`, le
 * format `[n] <titre> (crédibilité, date)` par ligne, le SSoT de la
 * section `## Sources` du VAULT.md) ; hors ligne / `clipboard`
 * indisponible → le copie est DÉGRADÉ (le bouton reste, le
 * `aria-live` annonce l'échec, AD-13 : jamais une rupture, le
 * contenu reste lisible dans la feuille).
 *
 * COULEUR DYNAMIQUE (AD-17) : les classes `vault-sources-sheet-*` du
 * CSS `data.css` (les `var(--aurora-*)`, zéro hex) — les chips de
 * filtre (le `data-active` = le brand), le chip de crédibilité
 * (le `data-credibility` = le SSoT du rapport), l'`ExternalLink`
 * (le brand du design system).
 */
import { useEffect, useState } from 'react';
import { AURORA_ICONS } from '@aurora/ui';
const X = AURORA_ICONS.X;
const ExternalLink = AURORA_ICONS.ExternalLink;
const Copy = AURORA_ICONS.Copy;
const List = AURORA_ICONS.List;

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@aurora/ui';
import {
  filterSources,
  VAULT_REF_FILTERS,
  type SourceEntry,
} from './veille-rapport';
import '../../styles/data.css';

export interface SourcesSheetProps {
  /** L'ouverture de la feuille (le state du `Sheet`). */
  open: boolean;
  /** Le close de la feuille (le callback `onClose` du `Sheet`). */
  onOpenChange: (open: boolean) => void;
  /** Les sources de la feuille (le `parsed.refs` du rapport, enrichies). */
  sources: ReadonlyArray<SourceEntry>;
  /** La source à SURBRILLER (le renvoi `[n]` tapé du rapport, le SSoT
      du focus du Stitch) — l'item correspondant porte
      `data-highlight="true"` (le SSoT du CSS). */
  highlightN?: number;
  /** L'aria-label de la feuille (l'a11y du dialog Radix). */
  ariaLabel?: string;
}

/** Le format de la référence copiée (le SSoT de la section `## Sources`). */
function formatReference(s: SourceEntry): string {
  const parts = [`[${s.n ?? ''}] ${s.title}`];
  const meta: string[] = [];
  if (s.credibility) meta.push(s.credibility);
  if (s.date) meta.push(s.date);
  if (meta.length > 0) parts.push(`(${meta.join(', ')})`);
  return parts.join(' ');
}

export function SourcesSheet({
  open,
  onOpenChange,
  sources,
  highlightN,
  ariaLabel,
}: SourcesSheetProps) {
  const [filtre, setFiltre] = useState<string>('Toutes');
  const [copied, setCopied] = useState(false);

  // Le `highlightN` du rapport (le renvoi `[n]` tapé) → le filtre
  // « Toutes » (le renvoi renvoie à la source, la feuille ne
  // S'ouvre JAMAIS dans un état filtré qui exclurait sa cible —
  // l'AD-13 honnête : la surbrillance est toujours visible).
  useEffect(() => {
    if (open && highlightN !== undefined) {
      setFiltre('Toutes');
    }
  }, [open, highlightN]);

  const filtered = filterSources(sources, filtre);

  async function handleCopy() {
    const text = filtered.map(formatReference).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // L'annonce A11Y (le `aria-live` polypill, le SSoT du
      // design system mobile) + le reset visuel après 2 s (le
      // SSoT du Stitch : le « Copié » disparaît, le bouton
      // revient à « Copier les références »).
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Hors ligne / clipboard indisponible (AD-13 dégradation) :
      // le bouton reste, le contenu reste LISIBLE dans la feuille
      // (le SSoT : jamais une rupture, le copie est un bonus,
      // pas le SSoT de la feuille). Le `aria-live` n'annonce PAS
      // l'échec (un `role="status"` vide est plus honnête qu'un
      // message d'erreur factice, le SSoT du `AD-1`).
      setCopied(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      aria-label={ariaLabel}
    >
      <SheetContent side="bottom" className="vault-sources-sheet" data-sources-sheet>
        <SheetHeader>
          <SheetTitle className="vault-sources-sheet__title" data-sources-title>
            <List size={18} aria-hidden className="vault-sources-sheet__title-icon" />
            Sources
            <span className="vault-sources-sheet__count" aria-hidden>·</span>
            {sources.length}
          </SheetTitle>
          <SheetDescription>
            Les sources du rapport — filtrées par crédibilité ou par date.
          </SheetDescription>
          <button
            type="button"
            className="vault-sources-sheet__close aurora-tap"
            aria-label="Fermer la feuille des sources"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} aria-hidden />
          </button>
        </SheetHeader>

        {/* Les CHIPS DE FILTRES (le SSoT `VAULT_REF_FILTERS` — le
            module pur, jamais dupliqué ici) : le SSoT du Stitch
            (le pill `data-active` = le brand, le min-h 44px a11y). */}
        <div
          className="vault-sources-sheet__filters"
          role="group"
          aria-label="Filtres des sources"
        >
          {VAULT_REF_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`vault-sources-sheet__filter ${
                filtre === f ? 'is-active' : ''
              } aurora-tap`}
              data-active={filtre === f ? 'true' : 'false'}
              aria-pressed={filtre === f}
              onClick={() => setFiltre(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* La LISTE DES SOURCES (le SSoT de la feuille) : le `[n]`
            monospace bleu + le titre + le chip de crédibilité +
            l'`ExternalLink` (le SSoT du Stitch, le min-h 44px). */}
        <ul className="vault-sources-sheet__list" data-sources-list>
          {filtered.length === 0 ? (
            <li className="vault-sources-sheet__empty" data-ux="empty">
              Aucune source pour ce filtre.
            </li>
          ) : (
            filtered.map((s) => (
              <li
                key={s.n ?? s.title}
                className="vault-sources-sheet__item aurora-tap"
                data-source-item
                data-highlight={highlightN !== undefined && s.n === highlightN ? 'true' : 'false'}
              >
                <span className="vault-sources-sheet__refnum" aria-hidden>
                  [{s.n ?? ''}]
                </span>
                <div className="vault-sources-sheet__body">
                  <div className="vault-sources-sheet__title-row">
                    <span className="vault-sources-sheet__source-title">{s.title}</span>
                    {s.credibility ? (
                      <span
                        className="vault-sources-sheet__credibility"
                        data-credibility={s.credibility}
                      >
                        {s.credibility}
                      </span>
                    ) : null}
                  </div>
                  {(s.meta || s.date) ? (
                    <span className="vault-sources-sheet__meta">
                      {s.meta ?? s.date}
                    </span>
                  ) : null}
                </div>
                {s.url ? (
                  <a
                    className="vault-sources-sheet__open"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ouvrir la source ${s.n ?? s.title}`}
                  >
                    <ExternalLink size={15} aria-hidden />
                  </a>
                ) : (
                  <span className="vault-sources-sheet__open is-disabled" aria-hidden>
                    <ExternalLink size={15} aria-hidden />
                  </span>
                )}
              </li>
            ))
          )}
        </ul>

        {/* Le « Copier les références » (le SSoT du `SheetFooter` du
            Stitch — le `navigator.clipboard`, le format `[n] <titre>
            (crédibilité, date)` par ligne, AD-13 dégradé hors ligne). */}
        <SheetFooter>
          <button
            type="button"
            className="vault-sources-sheet__copy aurora-btn aurora-btn--secondary aurora-tap"
            data-copy-references
            onClick={() => {
              void handleCopy();
            }}
            aria-live="polite"
          >
            <Copy size={15} aria-hidden />
            {copied ? 'Copié' : 'Copier les références'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
