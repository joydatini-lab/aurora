import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

/**
 * Meta du composant Table.
 *
 * Table de données lues (pas d'édition en ligne : pour ça, utiliser
 * `DataTable` / `AgGridTable`). Les colonnes sont des `TableHead`
 * dans le `TableHeader`, les lignes des `TableRow` dans le
 * `TableBody`. Le conteneur gère le défilement horizontal
 * (`overflow-auto`).
 */
const meta = {
  title: "Aurora/UI/Table",
  component: Table,
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : une table de données simple (3 colonnes, 3 lignes).
 *
 * @summary table de données lue
 */
export const Defaut: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tâche</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Échéance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Relire le rapport Q3</TableCell>
          <TableCell>En cours</TableCell>
          <TableCell className="text-right">12 oct.</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Préparer la démo</TableCell>
          <TableCell>À faire</TableCell>
          <TableCell className="text-right">15 oct.</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Synchro design system</TableCell>
          <TableCell>Terminé</TableCell>
          <TableCell className="text-right">10 oct.</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
