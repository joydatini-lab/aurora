import type { Meta, StoryObj } from "@storybook/react-vite";

import { DataTable } from "./DataTable";
import type { DataTableColumn } from "../../renderers/contracts";

interface Task {
  id: string;
  titre: string;
  statut: string;
  echeance: string;
  poids: number;
}

const columns: DataTableColumn<Task>[] = [
  { key: "titre", label: "Tâche" },
  { key: "statut", label: "Statut" },
  { key: "echeance", label: "Échéance", mono: true },
  { key: "poids", label: "Poids", mono: true },
];

const rows: Task[] = [
  { id: "1", titre: "Relire le rapport Q3", statut: "En cours", echeance: "2026-10-12", poids: 8 },
  { id: "2", titre: "Préparer la démo", statut: "À faire", echeance: "2026-10-15", poids: 5 },
  { id: "3", titre: "Synchro design system", statut: "Terminé", echeance: "2026-10-10", poids: 3 },
];

/**
 * Meta du composant DataTable (contrat AD-10 §3.6.1).
 *
 * Table sémantique HTML (pas un chart G2). Les colonnes `mono`
 * (`JetBrains Mono` `tabular-nums`) s'appliquent automatiquement aux
 * valeurs numériques. Les 5 états AD-13 sont pilotés par les props
 * `loading` / `errorMessage` / `emptyMessage` — pas par du CSS
 * ad-hoc.
 */
const meta = {
  title: "Aurora/UI/DataTable",
  component: DataTable,
  tags: ["autodocs"],
} satisfies Meta<never>;

export default meta;
type Story = StoryObj<any>;

/**
 * Défaut : 3 lignes, 4 colonnes (2 textes + 2 mono). La colonne
 * `Échéance` est en mono (date alignée) ; le `Poids` numérique aussi.
 *
 * @summary table de données lue
 */
export const Defaut: Story = {
  args: { columns, rows },
};

/**
 * État vide : le header reste visible, le corps affiche le message
 * d'info (pas de table factice). `emptyMessage` customisé ici.
 *
 * @summary état vide
 */
export const Vide: Story = {
  args: {
    columns,
    rows: [],
    emptyMessage: "Aucune tâche dans ce projet.",
  },
};

/**
 * État erreur : le dataset last-synced reste affiché (pas de flash
 * vide) ; le callout `danger` porte le message + le bouton de retry.
 *
 * @summary état erreur
 */
export const Erreur: Story = {
  args: {
    columns,
    rows,
    errorMessage: "Synchronisation impossible",
    onRetry: () => {},
  },
};

/**
 * Chargement : les lignes squelette (pulse) remplacent les données
 * pendant la fetch — le header reste stable (pas de reflow).
 *
 * @summary état chargement
 */
export const Chargement: Story = {
  args: {
    columns,
    rows: [],
    loading: true,
  },
};
