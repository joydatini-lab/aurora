/**
 * DataGrid.stories.tsx — Moteur @reui pour les vues Liste / Rapports / Reviews.
 * TanStack Table v9 : `useTable` + `dataGridFeatures` (bundle), pagination, tri.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DataGrid,
  DataGridContainer,
  DataGridPagination,
  DataGridScrollArea,
  dataGridFeatures,
  type DataGridFeatures,
} from "src/index";
import { useTable, type ColumnDef } from "@tanstack/react-table";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/DataGrid (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

interface Tache {
  id: string;
  titre: string;
  statut: "a_faire" | "en_cours" | "termine";
  priorite: "haute" | "moyenne" | "basse";
  echeance: string;
}

const DATA: Tache[] = [
  { id: "1", titre: "Créer l'objectif principal", statut: "termine", priorite: "haute", echeance: "2026-10-01" },
  { id: "2", titre: "Câbler Supabase RLS", statut: "en_cours", priorite: "haute", echeance: "2026-10-15" },
  { id: "3", titre: "Sprint 2 — Frontend", statut: "a_faire", priorite: "moyenne", echeance: "2026-10-26" },
  { id: "4", titre: "Tests E2E Playwright", statut: "a_faire", priorite: "moyenne", echeance: "2026-11-09" },
  { id: "5", titre: "Mise en production", statut: "a_faire", priorite: "haute", echeance: "2026-11-16" },
];

const COLUMNS: ColumnDef<DataGridFeatures, Tache>[] = [
  { accessorKey: "titre", header: "Tâche" },
  { accessorKey: "statut", header: "Statut" },
  { accessorKey: "priorite", header: "Priorité" },
  { accessorKey: "echeance", header: "Échéance" },
];

export const ListeTaches: Story = {
  render: function DataGridListe() {
    const table = useTable({
      features: dataGridFeatures,
      columns: COLUMNS,
      data: DATA,
      getRowId: (row: Tache) => row.id,
    });

    return (
      <DataGrid table={table} recordCount={DATA.length}>
        <div className="w-full space-y-2.5">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridPagination />
            </DataGridScrollArea>
          </DataGridContainer>
        </div>
      </DataGrid>
    );
  },
};
