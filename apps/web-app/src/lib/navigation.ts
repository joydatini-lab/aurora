/**
 * L3 — le SSoT de la navigation web : les 9 sections de la référence §4.2
 * (A → I), dans l'ordre de la référence.
 *
 * POURQUOI CE MODULE EST LA SOURCE UNIQUE
 * La même liste alimente la barre latérale (`lg+`), le rail (`md`) et la tab
 * bar basse (`< md`) : trois formes, UNE déclaration. C'est le contrat C1
 * (« navigation compacte quand la largeur diminue ») rendu structurel — la
 * forme change, jamais le contenu ni l'ordre.
 *
 * LES ROUTES SONT CELLES QUI EXISTENT (`apps/mobile/src/router.tsx`) : on ne
 * crée pas de route neuve ici. Les sections qui n'ont pas encore d'écran dans
 * le socle pointent vers la route la plus proche et sont marquées
 * `readiness: 'shell'` — elles restent VISIBLES (la référence §4.3 interdit
 * qu'une fonction essentielle « soit invisible sans explication ») mais le
 * shell affiche un état vide honnête plutôt qu'un écran factice.
 *
 * AD-14 (invariant Home) : la composition de Home ne change pas ici ; seule sa
 * place dans la navigation est déclarée.
 */
import { AURORA_ICONS } from '@aurora/ui';
import type { PhosphorComponent } from '@aurora/ui';

/**
 * `ready` = l'écran existe dans le socle et est branché (L4+).
 * `shell` = l'entrée est légitime mais son écran n'est pas encore livré : le
 *           shell doit rendre un état vide HONNÊTE, jamais une coquille qui
 *           prétend fonctionner (c'est le défaut « phantom empty-state » que
 *           le dépôt a déjà payé).
 */
export type SectionReadiness = 'ready' | 'shell';

export interface NavSection {
  /** L'identifiant stable, utilisé par l'état actif et les tests. */
  id: string;
  /** Le libellé affiché (français, comme le reste de la surface produit). */
  label: string;
  /**
   * La lettre de la référence §4.2 (A → I) : traçabilité vers la spec.
   * `undefined` = surface transverse — l'Agent n'est pas une des 9 sections de
   * la référence, mais c'est le centre du produit (M-13) et la 5ᵉ entrée de la
   * tab bar (§3.1). On ne l'invente pas : il existe déjà comme route `/agent`.
   */
  ref?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  /** La route cible — toujours une route qui EXISTE dans le routeur. */
  path: string;
  icon: PhosphorComponent;
  readiness: SectionReadiness;
  /** Les 5 entrées de la tab bar basse (< md). La référence §3.3 en veut 5. */
  primaryTab: boolean;
}

/**
 * Les 9 sections, dans l'ordre de la référence §4.2.
 *
 * Les 5 `primaryTab` sont celles de la tab bar basse (< md) : ce sont les
 * points d'entrée du quotidien (Accueil, Apprendre, S'organiser, Connaissances,
 * Agent — §3.1). Les 5 autres restent dans le rail et la barre latérale, où la
 * place ne manque pas. Ce partage est VÉRIFIÉ par `shell-routes.test.ts` : si
 * le compte dérive de 5, le test échoue.
 */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    ref: 'A',
    path: '/home',
    icon: AURORA_ICONS.Home,
    readiness: 'shell',
    primaryTab: true,
  },
  {
    id: 'projets',
    label: 'Projets',
    ref: 'B',
    path: '/projects',
    icon: AURORA_ICONS.Folder,
    readiness: 'shell',
    primaryTab: false,
  },
  {
    id: 'creer',
    label: 'Créer',
    ref: 'C',
    path: '/design-space',
    icon: AURORA_ICONS.Sparkles,
    readiness: 'shell',
    primaryTab: false,
  },
  {
    id: 'apprendre',
    label: 'Apprendre',
    ref: 'D',
    path: '/learn',
    icon: AURORA_ICONS.BookOpen,
    readiness: 'shell',
    primaryTab: true,
  },
  {
    id: 'decouvrir',
    label: 'Découvrir',
    ref: 'E',
    path: '/discovery',
    icon: AURORA_ICONS.Compass,
    readiness: 'shell',
    primaryTab: false,
  },
  {
    id: 'organiser',
    label: "S'organiser",
    ref: 'F',
    path: '/tasks',
    icon: AURORA_ICONS.CheckSquare,
    // L5 : l'écran de capture est livré (chemin vertical réel).
    readiness: 'ready',
    primaryTab: true,
  },
  {
    id: 'connaissances',
    label: 'Connaissances',
    ref: 'G',
    path: '/knowledge',
    icon: AURORA_ICONS.Brain,
    readiness: 'shell',
    primaryTab: true,
  },
  {
    id: 'bibliotheque',
    label: 'Bibliothèque',
    ref: 'H',
    path: '/artifacts',
    icon: AURORA_ICONS.Layers,
    readiness: 'shell',
    primaryTab: false,
  },
  {
    id: 'agent',
    label: 'Agent',
    // Pas de lettre : surface transverse, présente dans le produit (M-13) et
    // 5ᵉ entrée de la tab bar (§3.1), hors des 9 sections de §4.2.
    path: '/agent',
    icon: AURORA_ICONS.Bot,
    readiness: 'shell',
    primaryTab: true,
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    ref: 'I',
    path: '/settings',
    icon: AURORA_ICONS.Settings,
    readiness: 'shell',
    primaryTab: false,
  },
] as const;

/** Les 5 onglets de la tab bar basse, dans l'ordre de la référence. */
export const PRIMARY_TABS: readonly NavSection[] = NAV_SECTIONS.filter(
  (s) => s.primaryTab,
);

/**
 * La section active pour un chemin donné : le préfixe le plus long gagne, donc
 * `/tasks/42` reste dans « S'organiser » et non dans une section vide.
 */
export function sectionForPath(pathname: string): NavSection | undefined {
  let best: NavSection | undefined;
  for (const section of NAV_SECTIONS) {
    if (pathname === section.path || pathname.startsWith(`${section.path}/`)) {
      if (!best || section.path.length > best.path.length) best = section;
    }
  }
  return best;
}
