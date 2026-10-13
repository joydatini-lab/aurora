import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./label";

/**
 * Meta du composant Label (Radix Label).
 *
 * Libellé d'un champ de formulaire. **Doit toujours** être associé à
 * son input via `htmlFor` (accessibilité : le clic sur le libellé
 * doit activer le champ, et le lecteur d'écran doit le lier).
 *
 * L'état `peer-disabled` grise automatiquement le libellé quand le
 * champ associé est désactivé (via `peer-disabled:opacity-70`).
 */
const meta = {
  title: "Aurora/UI/Label",
  component: Label,
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : libellé simple. En usage réel, brancher `htmlFor` sur
 * l'`id` du champ.
 *
 * @summary libellé de champ
 */
export const Defaut: Story = {
  render: () => (
    <div className="flex w-48 flex-col gap-1.5">
      <Label htmlFor="name-example">Nom</Label>
      <input
        id="name-example"
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        placeholder="Votre nom"
      />
    </div>
  ),
};

/**
 * Libellé associé à un champ désactivé : l'état grisé est hérité via
 * `peer-disabled` (le libellé baisse en opacité, l'utilisateur comprend
 * que le champ est verrouillé).
 *
 * @summary libellé de champ verrouillé
 */
export const Verrouille: Story = {
  render: () => (
    <div className="flex w-48 flex-col gap-1.5">
      <Label htmlFor="locked-example">Champ verrouillé</Label>
      <input
        id="locked-example"
        disabled
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50 peer"
      />
    </div>
  ),
};
