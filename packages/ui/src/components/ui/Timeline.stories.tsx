import type { Meta, StoryObj } from "@storybook/react-vite";

import { Timeline } from "./Timeline";
import type { TimelineEvent } from "../../renderers/contracts";

const events: TimelineEvent[] = [
  { id: "1", label: "Session focus terminée", at: "09:30", kind: "success" },
  { id: "2", label: "Rapport d'avancement partagé", at: "11:15", kind: "warning" },
  { id: "3", label: "Décision : repousser la démo", at: "14:00", kind: "primary" },
];

/**
 * Meta du composant Timeline (contrat AD-10 §3.6.3).
 *
 * Historique d'événements (récit narratif) avec points sémantiques :
 * `success` (complétion) / `warning` (rapport) / `primary` (décision).
 * Les 5 états AD-13 sont pilotés par les props `loading` /
 * `errorMessage` / `emptyMessage`.
 *
 * Le mode `taskList` (05 §4.4.2) rend chaque événement comme une
 * ligne de tâche compacte (point + titre + heure) au lieu du récit
 * avec points colorés — utilisé sous le calendrier en permanence.
 */
const meta = {
  title: "Aurora/UI/Timeline",
  component: Timeline,
  tags: ["autodocs"],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : récit de 3 événements (1 complétion, 1 rapport, 1
 * décision). Chaque point est coloré selon le `kind`.
 *
 * @summary historique d'événements
 */
export const Defaut: Story = {
  args: { events },
};

/**
 * Le mode liste de tâches (`taskList`) rend chaque événement comme une
 * ligne compacte (point + titre + heure) — utilisé sous le calendrier
 * pour la liste permanente des tâches. Les complétions sont barrées.
 *
 * @summary liste de tâches
 */
export const ListeDeTaches: Story = {
  args: { events, taskList: true },
};

/**
 * État vide : le callout info affiche le message (pas d'historique
 * factice). Le point du récit n'apparaît pas.
 *
 * @summary état vide
 */
export const Vide: Story = {
  args: {
    events: [],
    emptyMessage: "Aucun événement pour cette période.",
  },
};

/**
 * État chargement : les squelettes (pulse) remplacent l'historique
 * pendant la fetch.
 *
 * @summary état chargement
 */
export const Chargement: Story = {
  args: { events: [], loading: true },
};
