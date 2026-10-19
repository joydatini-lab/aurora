/**
 * rapport-md.tsx (M-44, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L464–476, écran 13). Le RENDU du rapport de veille (le
 * VAULT.md du programme, le SSoT `buildVaultMd` des runs).
 *
 * Design SSoT : Stitch `discovery_rapport_de_veille_pr_cision_fraunces/
 * code.html` — le « style édition » (le serif de titre, le body sans,
 * les renvois `[n]` en monospace SUPERCRIPT cliquable, l'AMBER chip
 * HYPOTHÈSE des questions ouvertes, le bandeau « lecture seule »).
 *
 * Le RENDU MARKDOWN réutilise le `marked` SÉCURISÉ de `markdownToHtml`
 * (`@aurora/ui`, le SSoT de `VaultMdView` — AD-16b : le HTML brut du
 * vault est neutralisé, jamais exécuté) : le composant passe le markdown
 * DE CHAQUE SECTION par `markdownToHtml` et injecte l'HTML DANS le
 * rendu via `dangerouslySetInnerHTML` — le contenu est du PARSING du
 * `parseVaultSections` (le module pur `veille-rapport.js`), jamais du
 * markdown brut re-dans le DOM.
 *
 * Les RENVOIS `[n]` sont CLIQUABLES (l'écran 14) : le `[n]` du rapport
 * est UN BOUTON qui OUVRE LA FEUILLE DES SOURCES + met en SURBRILLANCE
 * la source N (le `onRefTap` callback — le parent passe la feuille
 * `SourcesSheet` en modale). Le `[n]` n'est PAS un lien externe (le
 * vault ne porte PAS les URL des sources dans le SSoT V1 — les URL
 * sont au Storage, `vault.storagePrefix`, AD-15 ; le `[n]` renvoie à la
 * FEUILLE, qui porte l'URL d'ouverture, le plan M-44).
 *
 * AD-13 : le rapport d'un programme SANS run (le `meta.pending`)
 * n'est PAS rendu ici — la page `rapport.tsx` affiche l'état vide
 * honnête « 1er run en attente » à la place (le composant ici
 * présuppose un rapport EXISTANT, le `vaultMd` non vide).
 *
 * COULEUR DYNAMIQUE (AD-17) : les classes `vault-rapport-*` du CSS
 * `data.css` (les `var(--aurora-*)`, zéro hex hardcodé) — le titre
 * `Fraunces` du Stitch est porteur par `font-serif` (le design
 * system du projet), le body est le `font-sans`.
 */
import { useMemo } from 'react';
import { AURORA_ICONS } from '@aurora/ui';
const Lock = AURORA_ICONS.Lock;

import { markdownToHtml } from '@aurora/ui';
import {
  parseVaultSections,
  buildReportMeta,
  type ReportMeta,
  type VaultSection,
  type VaultRef,
  type VeilleProgramInput,
} from './veille-rapport';
import '../../styles/data.css';

/** Le rapport du VAULT (le SSoT `vaultMd` du programme, le SSoT run N). */
export interface RapportMdProps {
  /** le VAULT.md du programme (le SSoT du `buildVaultMd`). */
  vaultMd: string;
  /** le `VeilleProgram` du join (le titre / la cadence / le verdict). */
  program: VeilleProgramInput;
  /** le domaine du vault (le SSoT du `data-vault` attribute). */
  domaine: string;
  /** L'aria-label de la région du rapport (l'a11y de la lecture). */
  ariaLabel?: string;
  /**
   * Callback appelé quand un renvoi `[n]` est TAPÉ (le SSoT de l'écran
   * 14 : le renvoi ouvre la FEUILLE des sources + surbrille la source
   * N). Le parent passe une fonction qui ouvre la `SourcesSheet` modale.
   */
  onRefTap: (ref: VaultRef) => void;
}

/**
 * `rapportMdSectionsHtml` — le rendu HTML (AD-16b) d'UNE SECTION du
 * VAULT.md : le `markdownToHtml` sécurisé du body de la section
 * (`## …` déjà stripé par le `parseVaultSections` — le body seul est
 * passé au renderer, le header est RENDU PAR LE COMPOSANT, le Stitch
 * porte les headers en `font-sans text-[17px] font-bold`, PAS en
 * markdown H2 du renderer).
 *
 * Les RENOIS `[n]` du body du VAULT.md : le `markdownToHtml` les rend
 * en TEXTE PLAIN (le `[1]` n'est PAS un lien markdown du VAULT.md —
 * c'est l'ÉTIQUETTE du rapport, le SSoT du Stitch : une `button
 * .citation-ref`). Le composant `rapport-md.tsx` NE re-parses PAS le
 * `[n]` dans le HTML (le markup est déjà du HTML sécurisé, re-parser
 * introduirait un 2e parseur = un risque AD-16b) — le composant
 * REND les sections en HTML (le Stitch les rend en HTML, le body du
 * VAULT.md ne porte PAS de `[n]` en V1 : les renvois `[n]` vivent
 * dans la SECTION du RAPPORT LLM du run, PAS dans le VAULT.md du
 * `buildVaultMd` — le VAULT.md porte les sections `## ` + le SSoT
 * `## Sources` numéroté, le rapport du RUN (le rapport.md
 * append-only du `buildRapportMd`, le plan lot 2) porte le `[n]`
 * rédigé. Ce composant rend le VAULT.md (le SSoT évolutif) : les
 * sections SONT le rapport — le `[n]` clickable est rendu DANS la
 * section `## Sources` (les lignes `- [n] <titre>` sont les
 * références sources ; le tap ouvre la feuille, le SSoT écran 14).
 */
function rapportMdSectionsHtml(section: VaultSection): string {
  // Le body de la section `## Sources` est numéroté (`- [n] …`) —
  // on le passe au `markdownToHtml` COMME EST (le rendu liste) :
  // les `<li>` du body sont le SSoT de la feuille des sources (le
  // composant `sources-sheet.tsx` lit le `## Sources` en DROIT, le
  // parse `parseVaultSections` a déjà l'index des refs).
  return markdownToHtml(section.body);
}

export function RapportMd({
  vaultMd,
  program,
  domaine,
  ariaLabel,
  onRefTap,
}: RapportMdProps) {
  const meta: ReportMeta = useMemo(
    () => buildReportMeta(program),
    [program],
  );
  const parsed = useMemo(() => parseVaultSections(vaultMd), [vaultMd]);
  const sectionsHtml = useMemo(
    () => parsed.sections.map((s) => rapportMdSectionsHtml(s)),
    [parsed],
  );

  return (
    <article
      className="vault-rapport"
      data-vault={domaine}
      role="region"
      aria-label={ariaLabel ?? `Rapport de veille ${meta.title}`}
    >
      {/* Le bandeau « lecture seule » (Stitch : le rapport ne commite
          JAMAIS — AD-7 single-writer, seul le run `research` écrit
          le vault, le rapport est la surface de LECTURE). */}
      <div className="vault-rapport__readonly" data-purpose="readonly-banner">
        <Lock size={13} aria-hidden />
        <span>Lecture seule — le rapport est écrit au run suivant</span>
      </div>

      {/* Le chapeau du rapport (le SSoT `buildReportMeta`, le Stitch
          « HeaderMetadata » : le titre serif + le meta row Run N ·
          date · pertinence). */}
      <header className="vault-rapport__header" data-purpose="report-header">
        <p className="vault-rapport__meta">
          {meta.title}
          {meta.cadence ? (
            <>
              <span className="vault-rapport__dot" aria-hidden>·</span>
              {meta.cadence}
            </>
          ) : null}
        </p>
        <h1 className="vault-rapport__title">
          {/* Le titre du rapport = le titre du VAULT (le `lead` du
              parse — le `# VAULT …` du SSoT du `buildVaultMd`). */}
          {parsed.lead.replace(/^#\s*VAULT\s*—\s*/i, '') || meta.title}
        </h1>
        <div className="vault-rapport__runrow" data-purpose="run-metadata">
          <span>Run {meta.runNumber}</span>
          <span aria-hidden>·</span>
          <span>
            {meta.date
              ? meta.date.split('-').reverse().join('/')
              : 'à venir'}
          </span>
          {meta.relevanceLabel ? (
            <>
              <span aria-hidden>·</span>
              <span className="vault-rapport__relevance">
                {meta.relevanceLabel}
              </span>
            </>
          ) : null}
        </div>
      </header>

      {/* Les sections du VAULT (le body du rapport — le « style
          édition » du Stitch : le `h3` de section + le body en HTML
          sécurisé par `markdownToHtml`, les renvois `[n]` de la
          section `## Sources` sont CLICKABLES via `onRefTap`). */}
      <div className="vault-rapport__body">
        {parsed.sections.map((section, i) => (
          <section
            key={section.title}
            className="vault-rapport__section"
            data-purpose={sectionPurpose(section.title)}
          >
            <h2 className="vault-rapport__section-title">{section.title}</h2>
            {section.title.startsWith('Sources') ? (
              // La section `## Sources` : les LIGNES `- [n] <titre>`
              // sont les références sources CLIQUABLES (le SSoT de
              // l'écran 14 : le tap ouvre la feuille + surbrille la
              // source N). Le `parsed.refs` est l'index des sources
              // (le n = le numéro de la source dans la feuille).
              <ol className="vault-rapport__sources">
                {parsed.refs.map((ref) => (
                  <li key={ref.n}>
                    <button
                      type="button"
                      className="vault-rapport__ref"
                      data-ref={ref.n}
                      aria-label={`Ouvrir la source [${ref.n}] — ${ref.title}`}
                      onClick={() => onRefTap(ref)}
                    >
                      [{ref.n}] {ref.title}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              // Les sections de rapport (Ce que je sais / Ce qui a
              // changé / Questions ouvertes / Historique) : le body en
              // HTML sécurisé (AD-16b), le `[n]` du body du rapport
              // (le SSoT du `buildRapportMd` du run, le rapport.md
              // append-only) est rendu en TEXTE PLAIN par le
              // `markdownToHtml` (le SSoT de `VaultMdView` — le
              // composant `sources-sheet.tsx` est la surface qui
              // rend le `[n]` CLIQUABLE, le rapport ne le rend PAS
              // ici pour garder UN SEUL parseur, AD-16b).
              <div
                className="vault-rapport__section-body"
                dangerouslySetInnerHTML={{ __html: sectionsHtml[i] ?? '' }}
              />
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

/** Le `data-purpose` Stitch de la section (le SSoT de `code.html`). */
function sectionPurpose(title: string): string {
  const t = title.toLowerCase();
  if (t.startsWith('ce que je sais')) return 'knowledge-base';
  if (t.startsWith('ce qui a changé')) return 'monthly-updates';
  if (t.startsWith('questions')) return 'open-questions';
  if (t.startsWith('au prochain')) return 'next-run-plan';
  if (t.startsWith('historique')) return 'history-section';
  if (t.startsWith('sources')) return 'sources-section';
  return 'section';
}
