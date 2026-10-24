import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { AgGridTable } from "./AgGridTable";
import type { AgGridColumnDef } from "../../renderers/contracts";

interface Task {
  id: number;
  titre: string;
  statut: string;
  progression: number;
}

const columns: AgGridColumnDef<Task>[] = [
  { field: "titre", headerName: "Tâche" },
  { field: "statut", headerName: "Statut" },
  { field: "progression", headerName: "Avancement", cellRenderer: "progress" },
];

const rows: Task[] = [
  { id: 1, titre: "Relire le rapport Q3", statut: "En cours", progression: 60 },
  { id: 2, titre: "Préparer la démo", statut: "À faire", progression: 0 },
  { id: 3, titre: "Synchro design system", statut: "Terminé", progression: 100 },
];

/**
 * Meta du composant AgGridTable (AG Grid Community, contrat AD-10 §3.6.1).
 *
 * Pour les tables **lourdes** (> 100 lignes, virtualisation 60fps).
 * Pour moins de ~20 lignes, utiliser le `DataTable` (table sémantique
 * HTML, plus légère). La colonne `progress` est le seul renderer
 * non-trivial (barre + pourcentage en `tabular-nums`).
 *
 * Le composant importe les CSS AG Grid (`ag-grid.css` +
 * `ag-theme-alpine.css`) — dans une story, ils sont injectés par le
 * module Vite (pas par Storybook, car ce sont des imports de
 * dépendance, pas des feuilles globales).
 */
const meta = {
  title: "Aurora/UI/AgGridTable",
  component: AgGridTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<never>;

export default meta;
type Story = StoryObj;

/**
 * Défaut : 3 lignes, 3 colonnes (dont une `progress`). La virtualisation
 * est active par défaut (`rowBuffer=10`, `maxVisibleRows=30` sur mobile).
 *
 * @summary table de données lourde
 */
export const Defaut: Story = {
  args: { rows, columns },
};

/**
 * État vide : le callout « Aucun résultat » s'affiche (pas de grille
 * factice). L'en-tête reste visible.
 *
 * @summary état vide
 */
export const Vide: Story = {
  args: { rows: [], columns },
};

/**
 * État erreur : les lignes last-synced restent affichées (pas de flash
 * vide) ; le callout `danger` + bouton retry apparaissent au-dessus.
 *
 * @summary état erreur
 */
export const Erreur: Story = {
  args: {
    rows,
    columns,
    errorMessage: "Synchronisation impossible",
    onRetry: () => {},
  },
};

/**
 * Test de comportement : le clic sur l'en-tête d'une colonne trie
 * les lignes (ascendant puis descendant). AG Grid expose la colonne
 * triée via `data-ag-sort-direction` sur l'en-tête.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée en CI.
 */
export const Tri: Story = {
  tags: ["!dev", "!autodocs"],
  name: "clic sur l'en-tête → tri ascendant puis descendant",
  args: { rows, columns },
  play: async ({ canvasElement, userEvent, step }) => {
    const header = canvasElement.querySelector(".ag-header-cell[col-id='titre'] .ag-header-cell-text")!;
    await step("Premier clic → tri ascendant", async () => {
      await userEvent.click(header);
      await new Promise((r) => setTimeout(r, 300));
      const dir = canvasElement.querySelector(".ag-header-cell[col-id='titre']")?.getAttribute("data-ag-sort-direction");
      expect(dir).toBe("asc");
    });
    await step("Deuxième clic → tri descendant", async () => {
      await userEvent.click(header);
      await new Promise((r) => setTimeout(r, 300));
      const dir = canvasElement.querySelector(".ag-header-cell[col-id='titre']")?.getAttribute("data-ag-sort-direction");
      expect(dir).toBe("desc");
    });
  },
};
