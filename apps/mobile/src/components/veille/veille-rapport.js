/**
 * veille-rapport.js (M-44, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L464–476, écrans 13/14).
 *
 * Le SSoT PUR du rapport de veille (le pattern de `veille-programs-join.js` /
 * `mirror-findings-card.ts` : zéro React, zéro DOM, zéro réseau — chargeable
 * par le test `node:test` sous `--experimental-strip-types`).
 *
 *   - `parseVaultSections(md)` — les sections `## …` du VAULT.md (le SSoT
 *     `buildVaultMd`, packages/discovery/src/vault.ts), le chapeau (le
 *     contenu AVANT la 1re section) + l'INDEX des renvois `[n]` (n = le
 *     numéro de la source dans la feuille, le SSoT de la section
 *     `## Sources` du VAULT.md : les doublons ne sont JAMAIS ré-apportés,
 *     M-43).
 *   - `filterSources(sources, filtre)` — le filtre de la FEUILLE DES
 *     SOURCES (Stitch `discovery_menu_des_sources_pr_cision_fraunces`) :
 *     Toutes / Haute / Moyenne / Ce mois-ci (la crédibilité + la date).
 *   - `buildReportMeta(program)` — le chapeau du rapport (le titre du
 *     programme, le run N (l'index du run dans le manifest, 1-indexé),
 *     la date du dernier run, le verdict de pertinence en plain French,
 *     la cadence du cron) — le SSoT que la surface ne recalcule JAMAIS
 *     (le rapport est la surface de lecture, AD-7 single-writer : seul
 *     le run `research` écrit le vault).
 *
 * AD-13 : un programme SANS run → `meta.pending = true` (le rapport
 * affiche « 1er run en attente », un état vide HONNÊTE, jamais un faux
 * rapport). AD-16b : ce module est du PARSING (le contenu de tiers
 * reste du texte, le rendu markdown passe par le `marked` sécurisé de
 * `markdownToHtml` — voir `rapport-md.tsx`, les renvois `[n]` sont des
 * ÉTIQUETTES cliquables, jamais de l'HTML exécuté).
 */

/** Un renvoi `[n]` du rapport (n = le numéro de la source dans la feuille). */
export const VaultRef = null; // (type placeholder — le type vit dans le .d.ts)
export const VaultSection = null;
export const SourceEntry = null;

/** Le vocabulaire FERMÉ des filtres de la feuille (le SSoT des chips). */
export const VAULT_REF_FILTERS = ['Toutes', 'Haute', 'Moyenne', 'Ce mois-ci'];

/**
 * `parseVaultSections(md)` — le parsing du VAULT.md.
 *
 * SSoT : le VAULT.md du `buildVaultMd` (packages/discovery/src/vault.ts)
 * porte les sections stables `## Ce que je sais` / `## Ce qui a changé` /
 * `## Questions ouvertes` / `## Historique de runs` /
 * `## Sources (liens + date + crédibilité)`. Les `## ` du BODY ne
 * créent PAS de sous-section (le VAULT n'en a pas — le parsing ne
 * regarde QUE les headers de FIN DE LIGNE `^## `).
 *
 * L'INDEX des renvois `[n]` : les sources sont NUMÉROTÉES (`- [n]
 * <titre> (méta)`) dans la section `## Sources` (le SSoT de la dédup
 * M-43 : les doublons ne sont JAMAIS ré-apportés, les numéros
 * continuent) — le rapport en rend les renvois [n] CLIQUABLES (le n
 * renvoie à la source N de la feuille, AD-16b : le contenu est du
 * tiers, jamais exécuté).
 *
 * VAULT vide (le 1er run n'a PAS encore tourné) → chapeau '' + 0
 * section + 0 renvoi (l'état « 1er run en attente », AD-13).
 */
export function parseVaultSections(md) {
  const text = typeof md === 'string' ? md : '';
  if (text.trim() === '') {
    return { lead: '', sections: [], refs: [] };
  }
  // Split sur les headers de FIN DE LIGNE `^## ` (le `m` flag) — un
  // `## ` au milieu d'une ligne du body n'est PAS un header (le VAULT
  // n'a pas de sous-section ; le test M-44 l'assert : le `## fausse
  // section` d'un body ne crée PAS une section). Le split garde le
  // préfixe (`(?=`) — la 1re partie peut être UNE SECTION si le
  // document DÉBUTE par `## ` (le VAULT du `buildVaultMd` porte un
  // `# VAULT …` en tête, mais un VAULT vide / partiel peut démarrer
  // directement par une section) : on ne prend QUE les parties qui
  // COMMENCENT par `## ` comme sections, le reste (la 1re partie,
  // non-headée) = le chapeau.
  const parts = text.split(/(?=^## )/m);
  const sections = [];
  const refs = [];
  let lead = '';
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!/^## /.test(part)) {
      // La partie non-headée (la 1re, le chapeau — le contenu avant
      // la 1re section ; vide si le document démarre par `## `).
      if (i === 0) lead = part.trim();
      continue;
    }
    const nl = part.indexOf('\n');
    const title = (nl === -1 ? part : part.slice(0, nl))
      .replace(/^##\s+/, '')
      .trim();
    const body = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    sections.push({ title, body });
    // L'index des renvois `[n]` : les lignes de la section `## Sources`
    // (le SSoT du `buildVaultMd` : `- [n] <titre> (méta)`). Les lignes
    // des AUTRES sections ne sont PAS des sources (le parsing est
    // borné à la section Sources, le numéro est borné par la section).
    if (/^Sources/i.test(title)) {
      for (const line of body.split('\n')) {
        const m = /^\s*-\s*\[(\d+)\]\s+(.*)$/.exec(line);
        if (m === null) continue;
        const n = parseInt(m[1], 10);
        const rawTitle = (m[2] || '').trim();
        const titleText = rawTitle
          .replace(/\s*\([^)]*\)\s*$/, '') // strip le méta `(crédibilité, date)`
          .trim();
        if (n > 0 && titleText !== '') {
          refs.push({ n, title: titleText });
        }
      }
    }
  }
  return { lead, sections, refs };
}

/**
 * `filterSources(sources, filtre)` — le filtre de la feuille des
 * sources (le SSoT des chips Stitch : Toutes / Haute / Moyenne /
 * Ce mois-ci).
 *
 *   - `Toutes` (le défaut) → aucune source filtrée ;
 *   - `Haute` / `Moyenne` → la crédibilité de la source (`s.credibility`) ;
 *   - `Ce mois-ci` → la date de la source est dans le mois courant
 *     (le `YYYY-MM` du `new Date()` ; une source SANS date n'est PAS
 *     « ce mois-ci », jamais une supposition — l'AD-13 honnête) ;
 *   - un filtre INCONNU → l'intégralité (le `AD-1` dégradation : le
 *     filtre inconnu ne casse JAMAIS la feuille, rien n'est filtré).
 *
 * Les sources sont DES ENTRÉES (le `SourceEntry` du `.d.ts`) : `{ n?,
 * title, credibility?, date?, url? }` — la structure est dérivée, pas
 * importée (le module reste chargeable sans le monorepo, le pattern
 * `veille-programs-join.js`).
 */
export function filterSources(sources, filtre) {
  const list = Array.isArray(sources) ? sources : [];
  if (filtre === 'Toutes' || filtre === undefined || filtre === null) {
    return list;
  }
  if (filtre === 'Inconnu') {
    // (jamais un vrai filtre — le cas inconnu est géré ci-dessous).
  }
  if (filtre === 'Haute') {
    return list.filter((s) => s.credibility === 'haute');
  }
  if (filtre === 'Moyenne') {
    return list.filter((s) => s.credibility === 'moyenne');
  }
  if (filtre === 'Ce mois-ci') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return list.filter((s) => {
      const d = s.date;
      // Une source SANS date n'est PAS « ce mois-ci » (AD-13 honnête) :
      return typeof d === 'string' && d.slice(0, 7) === prefix;
    });
  }
  // Filtre inconnu → le `AD-1` dégradation (rien n'est filtré) :
  return list;
}

/**
 * La cadence du cron en plain French (le SSoT du sous-titre Stitch
 * « · mensuel »). Le `Automation.cron` du SSoT (entities-integrations)
 * est l'expression cron du déclencheur `schedule` (le G1 du M-45 :
 * jour/semaine/mois/trimestre + heure). Ce mapping est le SSOt du
 * RAPPORT (le sous-titre), PAS du formulaire (le M-45 génère le cron,
 * ce mapping le lit — les deux sont le même SSoT, jamais dupliqué).
 *
 * Bornes : un cron inconnu / absent → `null` (le rapport ne SUPPOSE
 * JAMAIS la cadence, l'AD-13 honnête : le sous-titre s'ommet).
 */
export function cadenceLabel(cron) {
  if (typeof cron !== 'string' || cron.trim() === '') return null;
  const parts = cron.trim().split(/\s+/);
  // Un cron `0 H D M J` (5 champs). Le cadence = le champ du jour
  // (index 3 = le jour du mois, le champ M du cron) :
  const dom = parts[2];
  const month = parts[3];
  const dow = parts[4];
  if (month !== undefined && month !== '*' && dom !== undefined && dom !== '*') {
    // `0 8 1 1,4,7,10 *` → trimestriel (les 4 premiers jours du
    // trimestre : janvier, avril, juillet, octobre) ; `0 8 1 * *` →
    // mensuel (le 1er de chaque mois).
    const months = month.split(',');
    if (months.length > 1) return 'trimestriel';
    return 'mensuel';
  }
  if (dow !== undefined && dow !== '*' && dow !== undefined) {
    // `0 8 * * 1` → hebdomadaire (un jour de semaine fixé).
    return 'hebdomadaire';
  }
  if (dom === '*' && month === '*' && (dow === undefined || dow === '*')) {
    return 'quotidien';
  }
  return null; // un cron exotique → la cadence s'omet (l'AD-13 honnête)
}

/**
 * `buildReportMeta(program)` — le chapeau du rapport (le SSoT que la
 * surface ne recalcule JAMAIS). `program` = le `VeilleProgram` du
 * `buildVeilleProgram` (veille-programs-join.js) : le
 * `{ automation, lastRun, delta, relevance, totalSources, vault }`.
 *
 *   - `title` = le nom du programme (le `automation.name`) ;
 *   - `runNumber` = l'INDEX du run dans le manifest (1-indexé, le
 *     « Run 3 » du Stitch — le SSoT du manifest append-only) ;
 *   - `date` = la date du dernier run (le SSoT du manifest) ;
 *   - `relevanceLabel` = le verdict du run en plain French (le SSoT du
 *     `runVerdictFromDelta`, M-43 : la pertinence DÉRIVÉE du delta,
 *     jamais le 1.0/0 figé de V1) ;
 *   - `cadence` = la cadence du cron (le SSoT de `cadenceLabel`) ;
 *   - `pending` = `true` si le programme n'a PAS encore de run (le
 *     rapport affiche « 1er run en attente », l'AD-13 honnête) — le
 *     `runNumber`/`date`/`relevanceLabel` sont bornés (`0`/`null`/
 *     le défaut, jamais un faux rapport).
 *
 * Bornes : un `program` vide (le join n'a PAS de vault) → `pending`
 * `true` + les bornes (le rapport reste l'état vide, jamais une
 * rupture — le test M-44 l'assert).
 */
export function buildReportMeta(program) {
  const p = program && typeof program === 'object' ? program : {};
  const automation = p.automation ?? {};
  const vault = p.vault ?? {};
  const runs = Array.isArray(vault.runs) ? vault.runs : [];
  const last = p.lastRun ?? null;
  const runNumber = last ? runs.length : 0;
  // Le verdict du rapport = le verdict du DERNIER run (le SSoT du
  // `runVerdictFromDelta`, M-43 : la pertinence DÉRIVÉE du delta —
  // la surface ne le recalcule JAMAIS, le rapport le LIT).
  let relevanceLabel = null;
  if (last && typeof last.relevance === 'number') {
    const r = last.relevance;
    if (r >= 0.7) relevanceLabel = 'pertinence élevée';
    else if (r >= 0.4) relevanceLabel = 'pertinence moyenne';
    else relevanceLabel = 'pertinence faible';
  }
  return {
    title: automation.name ?? 'Veille',
    runNumber,
    date: last ? last.date : null,
    relevanceLabel,
    cadence: cadenceLabel(automation.cron),
    totalSources: typeof p.totalSources === 'number' ? p.totalSources : 0,
    pending: last === null,
  };
}
