import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Separator,
} from "./separator";

/**
 * Meta du composant Separator (Radix Separator).
 *
 * Séparation visuelle entre blocs de contenu (pas une bordure de
 * section : pour celle-ci, utiliser `border` de la section).
 * Par défaut décoratif (`decorative=true` = ignoré par les lecteurs
 * d'écran, ce qui est le bon comportement pour un simple trait).
 */
const meta = {
  title: "Aurora/UI/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : séparateur horizontal entre deux paragraphes.
 *
 * @summary séparation visuelle
 */
export const Defaut: Story = {
  render: () => (
    <div className="space-y-4 p-4">
      <p className="text-sm">Premier bloc de contenu.</p>
      <Separator />
      <p className="text-sm">Deuxième bloc, séparé visuellement.</p>
      <Separator />
      <p className="text-sm">Troisième bloc.</p>
    </div>
  ),
};

/**
 * Séparateur vertical : utilisé pour isoler des colonnes ou des
 * actions d'un menu (ex. entre un groupe d'items et l'action
 * destructive).
 *
 * @summary séparation verticale
 */
export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4">
      <div className="space-y-1">
        <p className="text-sm">Colonne A</p>
        <p className="text-xs text-muted-foreground">Détail</p>
      </div>
      <Separator orientation="vertical" className="h-12" />
      <div className="space-y-1">
        <p className="text-sm">Colonne B</p>
        <p className="text-xs text-muted-foreground">Détail</p>
      </div>
    </div>
  ),
};
