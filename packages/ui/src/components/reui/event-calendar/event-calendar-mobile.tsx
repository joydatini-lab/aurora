/**
 * event-calendar-mobile.tsx — le preset de style MOBILE du moteur EventCalendar
 * @reui (lot 2026-10-12, docs/ui-libraries.md §1).
 *
 * Le moteur reui est le "desktop" de la ref : il est conçu pour une souris
 * (hover tooltips, drag/resize au pointeur, scrollbars custom). Sur mobile
 * (notre cible, AD-13/AD-7), on le rhabille avec :
 *
 *   · les touch targets >= 44px (les boutons de nav, les chips d'événements) ;
 *   · le scroll `native` (pas de ScrollArea — les barres de défilement du
 *     navigateur natif, pas de scrollbar fantôme) ;
 *   · le scroll "contained" (la vue défile à l'intérieur de son conteneur,
 *     la page IonContent défile autour — le pattern des vues calendrier
 *     existantes, `DayView`/`MultiDayView`/`MonthView`) ;
 *   · les "time-grid" et "days" (5 jours) en mode scroll HORIZONTAL natif,
 *     1 jour plein écran à la fois (la vue "days" avec `dayCountPresets`
 *     pilote le nombre de colonnes : 3 ou 5 jours) ;
 *   · les i18n FROZEN en français (05 §2.5 : l'app est 100 % française,
 *     AD-17, le label du "today", le "+N autres", etc. — jamais un libellé
 *     anglais par défaut) ;
 *   · la hauteur pilote la densité : `h-[60vh]` (grilles) / `h-[70vh]`
 *     (time-grid) — le conteneur parent (la page) fournit le cadre, le
 *     preset ne force PAS une hauteur fixe trop agressive (un calendrier
 *     qui envahit tout l'écran est le pattern desktop, pas mobile).
 *
 * Ce preset n'est PAS un 2e moteur : il est la couche de style +
 * configuration SSoT du DS (AD-10) par-dessus le composant générique
 * reui — la logique (drag/drop, l'overlap, la récurrence, le time-zone)
 * reste dans le moteur, le preset ne change que l'habillage et les
 * dimensions (la règle "le contenu est le SSoT du DS, l'enveloppe est
 * pilotable par `classNames`/`viewConfig`").
 */
import type {
  EventCalendarViewSettings,
} from "./event-calendar-types";
import type { EventCalendarI18nOverrides } from "./event-calendar-i18n";
// `EventCalendarClassNames` est un type d'impl�mentation (non export� par
// le SSoT public) � on le retype ici par sa forme structurelle (une map
// optionnelle de champs string) : le preset reste 100 % assignable au
// `viewConfig.classNames` du moteur, sans r�-exposer un type interne.
type EventCalendarClassNames = {
  [key: string]: string | undefined;
};
import type { CSSProperties } from "react";

/** Les touch targets mobile : les boutons de nav (44px), les chips
 *  d'événements (44px min height, le `timedChip`), le "more" popover
 *  (le "+N autres" en 2 lignes min pour le thumb). */
const MOBILE_TOUCH_CLASS_NAMES: EventCalendarClassNames = {
  navButton: "h-11 w-11", // 44px — le bouton prev/next/today
  toolbar: "h-11 items-center gap-1 px-2",
  viewSwitcherContent: "rounded-lg p-1",
  viewSwitcherLabel: "h-9 min-w-9 rounded-md px-2.5 text-xs",
  title: "text-sm",
  nav: "px-1 py-1",
  content: "text-sm",
  // Les vues grilles : les cellules sont pilotées par `minHeight` CSS
  // (voir le preset style en-dessous), jamais une classe Tailwind de
  // hauteur fixe (le `--ec-hour-height` variable pilote la time-grid).
  monthCell: "min-h-[3.5rem]", // ~56px (2 lignes min : le numéro + la
  monthCellContent: "px-1.5 py-1.5", // 1re ligne de tags)
  monthDayNumber: "text-[13px]",
  timeGrid: "text-[13px]",
  timeGutter: "text-[11px]",
  timedChip: "min-h-11 text-[12px]", // le chip horaire = 44px min
  event: "min-h-11",
  // Le "more" popover ("+N autres") : 2 lignes de hauteur min pour le
  // thumb (jamais un pop-over à 1 ligne — pattern de la liste).
  moreIndicator: "text-[11px]",
  morePopover: "text-xs",
  morePopoverHeader: "text-[11px]",
  // L'agenda (la vue "Liste") : le "dayHeader" + le "item" en 44px.
  agendaDayHeader: "h-9",
  agendaItem: "min-h-11",
  agendaItemSurface: "min-h-11",
  // La vue "resource" (le planning type hôtel, la vue "Time-grid"
  // multi-ressources) : le "header" + la "cell" en 44px.
  resourceHeader: "h-9 min-w-24 text-xs",
  timeGridHeader: "h-9 text-xs",
  dayColumn: "min-w-24", // la colonne jour (le "5 jours" défile sur
}; // l'axe X natif, 1 à 2 jours visibles)

/** Les variables CSS qui pilotent la densité (le `--ec-*`) : le preset
 *  mobile est le plus dense raisonnable sans sacrifier le legibility
 *  (la time-grid = 48px/h par défaut, le gutter = 3rem). */
export const MOBILE_EVENT_CALENDAR_STYLE: CSSProperties = {
  "--ec-hour-height": "48px", // 48px/h (le desktop est 64px/h — le mobile
  "--ec-gutter-width": "3rem", // fait plus dense, le thumb)
  "--ec-day-min-width": "6rem", // le "N jours" : 96px min / jour
} as CSSProperties;

/** Le viewSettings mobile : le "N days" avec `dayCountPresets [3, 5]`
 *  (le "3 jours" et le "5 jours" — les 2 vues demandées, jamais un
 *  preset inventé), le `weekdaysOnly` OFF (les week-ends restent,
 *  le "5 jours" inclut les 2 jours week-end de fin, AD-7 honest —
 *  jamais masquer un jour existant sans demande expresse). */
export const MOBILE_EVENT_CALENDAR_VIEW_SETTINGS: EventCalendarViewSettings = {
  weekends: true,
  weekNumbers: false, // le "N days" (3/5) n' affiche pas le numéro de
}; // semaine (la vue "week" 7 jours, si activée, non plus)

/** Les presets "N jours" du bouton de bascule (la vue "days" du moteur) :
 *  le 2e "vue 5 jours" + le "3 jours" déjà existant — le consommateur
 *  passe cet array au `viewConfig.dayCountPresets` (le "5 jours" demandé
 *  au prompt ; le "3 jours" est conservé, jamais un preset inventé à
 *  côté des 2 existants). */
export const MOBILE_EVENT_CALENDAR_DAY_COUNT_PRESETS: readonly number[] = [3, 5];

/** Les i18n FROZEN en français (05 §2.5, AD-17) : le "today", le
 *  "more", le "allDay", le "noEvents", les "viewNames". Le preset
 *  mobile est le point de vérité i18n du DS — jamais un libellé
 *  anglais par défaut dans une vue. */
export const MOBILE_EVENT_CALENDAR_I18N: EventCalendarI18nOverrides = {
  labels: {
    today: "Aujourd'hui",
    allDay: "Journée",
    noEvents: "Aucun événement",
    more: (count) => `+${count} autres`,
  },
  viewNames: {
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    days: (count) => `${count} jours`,
    agenda: "Agenda",
    resource: "Grille",
  },
};

/** Le preset mobile complet (le SSoT du style, à passer en `classNames` /
 *  `viewSettings` / `i18n` au consommateur — le pattern `EventCalendar`
 *  d'Aurora, par-dessus le moteur reui). */
export interface EventCalendarMobileStyle {
  /** Les classNames (la densité 44px + le touch target) — passer au
   *  `viewConfig.classNames`. */
  classNames: EventCalendarClassNames;
  /** Les variables CSS de densité (`--ec-*`) — passer au `style` du
   *  conteneur du calendrier (le `--ec-hour-height` pilote la
   *  time-grid, le `--ec-gutter-width` le "gutter" des heures). */
  style: CSSProperties;
  /** Les viewSettings (le "N days" = 3/5 jours) — passer au
   *  `viewConfig.dayCountPresets` (si `days` view activée). */
  viewSettings: EventCalendarViewSettings;
  /** Les i18n FROZEN français — passer au `i18n` (le preset DS). */
  i18n: EventCalendarI18nOverrides;
}

/** Le preset mobile SSoT — le consommateur (la page `/calendar`) le
 *  spreade : `classNames` + `style` + `viewSettings` + `i18n` au
 *  `<EventCalendar />` (le moteur reui, `@aurora/ui`). */

export const EVENT_CALENDAR_MOBILE_STYLE: EventCalendarMobileStyle = {
  classNames: MOBILE_TOUCH_CLASS_NAMES,
  style: MOBILE_EVENT_CALENDAR_STYLE,
  viewSettings: MOBILE_EVENT_CALENDAR_VIEW_SETTINGS,
  i18n: MOBILE_EVENT_CALENDAR_I18N,
};
