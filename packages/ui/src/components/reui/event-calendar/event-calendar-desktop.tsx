/**
 * event-calendar-desktop.tsx — le preset de style DESKTOP (Phase 2) du moteur
 * EventCalendar @reui (miroir de `event-calendar-mobile.tsx`,
 * docs/ui-libraries.md §1 + 05 §4.5.2 Notes responsive).
 *
 * Le moteur reui est le "desktop" de la ref (souris : hover tooltips,
 * drag/resize au pointeur, scrollbars custom). Le preset MOBILE l'a
 * re-habillé (touch targets 44px, scroll natif, densité compacte). Ce preset
 * DESKTOP est l'enveloppe SSoT du DS (AD-10) pour le desktop (>= lg) :
 *
 *   · la time-grid = 64px/h (le mobile est 48px/h — le desktop a la place,
 *     le pointeur est fin, pas de thumb : on ouvre) ;
 *   · le "gutter" des heures = 4rem (3rem sur mobile, le label horaire
 *     `md`/`sm` en français avec la colonne plus large) ;
 *   · la "3/5 jours" disparaît (le desktop affiche la "Semaine" 7 jours
 *     entière, et le "5 jours" n'est plus un scroll horizontal 1 jour
 *     plein écran : les colonnes jours = 150px min, le 5 jours tient
 *     dans la largeur) ;
 *   · le scroll est le ScrollArea reui (la vue défile dans son
 *     conteneur, la barre de défilement custom du moteur, pas le
 *     scroll natif du navigateur — le desktop a les 2 barres) ;
 *   · les i18n = le même FROZEN français (05 §2.5, AD-17) — jamais
 *     un libellé anglais par défaut ; le "today", le "+N autres", les
 *     "viewNames" sont identiques (le contenu est le SSoT, l'enveloppe
 *     est pilotable par `classNames`/`viewConfig`, la i18n est
 *     partagée mobile/desktop).
 *
 * Ce preset n'est PAS un 2e moteur (même règle que le mobile) : il est la
 * couche de style + configuration SSoT du DS par-dessus le composant
 * générique reui. La logique (drag/drop, l'overlap, la récurrence, le
 * time-zone) reste dans le moteur.
 */
import type {
  EventCalendarViewSettings,
} from "./event-calendar-types";
import type { EventCalendarI18nOverrides } from "./event-calendar-i18n";
import type { CSSProperties } from "react";

// `EventCalendarClassNames` est un type d'implémentation (non exporté par
// le SSoT public) → on le retype ici par sa forme structurelle (une map
// optionnelle de champs string), comme le preset mobile : le preset reste
// 100 % assignable au `viewConfig.classNames` du moteur, sans re-exposer un
// type interne.
type EventCalendarClassNames = {
  [key: string]: string | undefined;
};

/** Les touch targets desktop : le pointeur est fin, le thumb n'existe
 *  pas → on ouvre les cellules (la "Semaine" 7 jours tient dans la
 *  largeur, pas de scroll horizontal 1 jour plein écran ; le "5 jours"
 *  si activé = 5 colonnes visibles). Le bouton de nav = 40px (pas
 *  44px : le desktop n'a pas la contrainte du thumb ; 44px resterait
 *  lisible mais le 40px est plus aéré pour le 7 jours).
 *
 *  Les cellules mois = 96px min (le mobile est 56px — le desktop a
 *  la place pour 4 lignes : le numéro + 3 pastilles/textes).
 */
const DESKTOP_CLASS_NAMES: EventCalendarClassNames = {
  navButton: "h-10 w-10", // 40px (desktop, pointeur fin)
  toolbar: "h-10 items-center gap-2 px-3",
  viewSwitcherContent: "rounded-lg p-1",
  viewSwitcherLabel: "h-8 min-w-8 rounded-md px-2.5 text-xs",
  title: "text-base", // le "Mois 2026" plus lisible à distance
  nav: "px-1.5 py-1.5",
  content: "text-sm",
  monthCell: "min-h-[6rem]", // ~96px (4 lignes : le numéro + 3 pastilles)
  monthCellContent: "px-2 py-2",
  monthDayNumber: "text-sm",
  timeGrid: "text-sm",
  timeGutter: "text-xs", // le label horaire "08:00" `md`/`sm`
  timedChip: "min-h-8 text-xs", // le chip horaire (le desktop a la place)
  event: "min-h-8",
  moreIndicator: "text-xs",
  morePopover: "text-sm",
  morePopoverHeader: "text-xs",
  // L'agenda (la vue "Liste") : le "dayHeader" + le "item" en 40px
  // (le desktop n'a pas la contrainte du thumb).
  agendaDayHeader: "h-9",
  agendaItem: "min-h-10",
  agendaItemSurface: "min-h-10",
  // La vue "resource" (le planning type hôtel, la vue "Time-grid"
  // multi-ressources) : le "header" + la "cell" en 40px.
  resourceHeader: "h-9 min-w-28 text-xs",
  timeGridHeader: "h-9 text-xs",
  // La colonne jour (le "5 jours" / la "Semaine") : 150px min (le
  // mobile est 96px — le desktop a la place pour 7 colonnes sans
  // scroll horizontal).
  dayColumn: "min-w-[150px]",
};

/** Les variables CSS qui pilotent la densité (le `--ec-*`) : le preset
 *  desktop est le plus lisible (64px/h, le mobile est 48px/h — le
 *  pointeur est fin, pas de thumb : on ouvre). */
export const DESKTOP_EVENT_CALENDAR_STYLE: CSSProperties = {
  "--ec-hour-height": "64px", // 64px/h (le mobile est 48px/h)
  "--ec-gutter-width": "4rem", // le "gutter" des heures = 4rem (3rem sur mobile)
  "--ec-day-min-width": "150px", // le "N jours" : 150px min / jour (96px sur mobile)
} as CSSProperties;

/** Le viewSettings desktop : le 7 jours (la "Semaine") est la vue
 *  par défaut (le desktop a la largeur, pas de scroll horizontal 1
 *  jour plein écran), le `weekdaysOnly` OFF (les week-ends restent,
 *  le "Semaine" inclut les 7 jours, AD-7 honest — jamais masquer un
 *  jour existant sans demande expresse). Le "3/5 jours" du mobile
 *  disparaît (le `dayCountPresets` est [7] sur desktop, jamais un
 *  preset inventé à côté de l'existing mobile [3, 5]). */
export const DESKTOP_EVENT_CALENDAR_VIEW_SETTINGS: EventCalendarViewSettings = {
  weekends: true,
  weekNumbers: true, // le "Semaine" 7 jours = le numéro de semaine
}; // (le mobile l'affiche non, le desktop le lit à distance)

/** Les presets "N jours" du bouton de bascule (la vue "days" du moteur) :
 *  le desktop = [7] (la "Semaine" entière, jamais un 5 jours inventé à
 *  côté du mobile [3, 5] — le contenu est le SSoT, l'enveloppe est
 *  pilotable). */
export const DESKTOP_EVENT_CALENDAR_DAY_COUNT_PRESETS: readonly number[] = [7];

/** Les i18n FROZEN en français (05 §2.5, AD-17) : le "today", le "more",
 *  le "allDay", les "viewNames". Le preset desktop partage la i18n du
 *  mobile (le contenu est le SSoT, l'enveloppe est pilotable par
 *  `classNames`/`viewConfig` — la i18n est partagée, jamais un
 *  libellé anglais par défaut dans une vue).
 *
 *  Le mobile et le desktop partagent la même i18n : le "today"
 *  (Aujourd'hui), le "more" (+N autres), le "allDay" (Journée), les
 *  "viewNames" (Mois/Semaine/Jour/N jours/Agenda/Grille). Le preset
 *  desktop n'invente PAS de i18n (la i18n du DS est le point de
 *  vérité partagé). */
export const DESKTOP_EVENT_CALENDAR_I18N: EventCalendarI18nOverrides = {
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

/** Le preset desktop complet (le SSoT du style Phase 2, à passer en
 *  `classNames` / `viewSettings` / `i18n` au consommateur — le pattern
 *  `EventCalendar` d'Aurora, par-dessus le moteur reui).
 *
 *  Le consommateur (la page `/calendar` desktop, 05 §4.4.1 +
 *  §4.5.2 Notes responsive) le spreade : `classNames` + `style` +
 *  `viewSettings` + `i18n` au `<EventCalendar />` (le moteur reui,
 *  `@aurora/ui`). La switch mobile/desktop est pilotée par
 *  `useIsMobile` (le hook du DS, breakpoint 768px) — le preset
 *  desktop est servi quand `isMobile === false`. */
export interface EventCalendarDesktopStyle {
  /** Les classNames (la densité 40px + le touch target desktop) —
   *  passer au `viewConfig.classNames`. */
  classNames: EventCalendarClassNames;
  /** Les variables CSS de densité (`--ec-*`) — passer au `style` du
   *  conteneur du calendrier (le `--ec-hour-height` pilote la
   *  time-grid, le `--ec-gutter-width` le "gutter" des heures). */
  style: CSSProperties;
  /** Les viewSettings (le "N days" = 7 jours) — passer au
   *  `viewConfig.dayCountPresets` (si `days` view activée). */
  viewSettings: EventCalendarViewSettings;
  /** Les i18n FROZEN français (partagé avec le mobile) — passer au
   *  `i18n` (le preset DS). */
  i18n: EventCalendarI18nOverrides;
}

/** Le preset desktop SSoT (Phase 2) — le miroir de
 *  `EVENT_CALENDAR_MOBILE_STYLE` (le preset mobile) pour le desktop
 *  (>= 768px, `useIsMobile === false`). */
export const EVENT_CALENDAR_DESKTOP_STYLE: EventCalendarDesktopStyle = {
  classNames: DESKTOP_CLASS_NAMES,
  style: DESKTOP_EVENT_CALENDAR_STYLE,
  viewSettings: DESKTOP_EVENT_CALENDAR_VIEW_SETTINGS,
  i18n: DESKTOP_EVENT_CALENDAR_I18N,
};
