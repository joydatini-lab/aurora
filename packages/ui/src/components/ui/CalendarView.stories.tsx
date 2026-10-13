import type { Meta, StoryObj } from "@storybook/react-vite";

import { CalendarView } from "./CalendarView";
import type { RenderCalendarEvent } from "../../renderers/contracts";

const events: RenderCalendarEvent[] = [
  { id: "1", title: "Étude — Physique", start: "2026-10-12T09:00:00", end: "2026-10-12T11:30:00", blockType: "etude" },
  { id: "2", title: "Session focus", start: "2026-10-12T14:00:00", end: "2026-10-12T16:00:00", blockType: "focus", focusSession: true },
  { id: "3", title: "Projet — Sprint", start: "2026-10-13T10:00:00", end: "2026-10-13T12:00:00", blockType: "projet" },
  // Conflit volontaire sur le 12/10 (chevauche la session focus) :
  // double bordure rouge (conflict rule, agent-prompts Phase 2.3).
  { id: "4", title: "Réunion d'équipe", start: "2026-10-12T15:00:00", end: "2026-10-12T16:30:00", blockType: "projet", conflicting: true },
];

/**
 * Meta du composant CalendarView (FullCalendar v6, contrat AD-10 §1/§5).
 *
 * Time-blocking : les événements sont des **blocs de planning** colorés
 * par type (`etude` / `focus` / `projet`), PAS des états sémantiques
 * (blocking rule 05 §5.1 : success/warning/danger/info restent dans la
 * couche neutre). Les sessions focus portent l'icône blocklist
 * (`focusSession`). Un conflit (chevauchement) est signalé par une
 * **double bordure rouge** — pas par une couleur de fond.
 *
 * Le composant est le **rendu** : le sélecteur de vue (SegmentedControl)
 * est possédé par la page (AD-7 : le composant ne fait pas d'UI
 * applicative). `mobile=true` restreint à jour/semaine (docs §5).
 *
 * Les 5 états AD-13 : loading (skeleton) / error (callout + retry,
 * last-known reste) / empty (grille vide, jamais un message factice) /
 * offline (last-known + badge).
 */
const meta = {
  title: "Aurora/UI/CalendarView",
  component: CalendarView,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof CalendarView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : vue semaine (timeGridWeek) avec 3 blocs + 1 conflit. Le
 * bloc `focus` porte l'icône blocklist ; le bloc en conflit a une
 * double bordure rouge.
 *
 * @summary time-blocking semaine
 */
export const Defaut: Story = {
  args: { events, initialView: "timeGridWeek" },
};

/**
 * Vue jour (timeGridDay) : la densité horaire est plus lisible sur
 * une seule journée (mobile-first).
 *
 * @summary time-blocking jour
 */
export const Jour: Story = {
  args: { events, initialView: "timeGridDay" },
};

/**
 * Vue liste (listWeek) : l'agenda chronologique (pas la grille) —
 * utile pour le récap de la semaine.
 *
 * @summary agenda liste
 */
export const Liste: Story = {
  args: { events, initialView: "listWeek" },
};

/**
 * Mode mobile (`mobile: true`) : seules les vues jour/semaine sont
 * disponibles (docs §5 : pas de vue mois sur petit écran), cibles de
 * tap 44px.
 *
 * @summary mode mobile
 */
export const Mobile: Story = {
  args: { events, initialView: "timeGridDay", mobile: true },
};

/**
 * État erreur : le callout `danger` + retry s'affiche ; le dataset
 * last-known (les 4 blocs) reste visible en arrière-plan (pas de
 * flash vide qui ferait perdre le contexte de planning).
 *
 * @summary état erreur
 */
export const Erreur: Story = {
  args: {
    events,
    initialView: "timeGridWeek",
    errorMessage: "Synchronisation impossible",
    onRetry: () => {},
  },
};
