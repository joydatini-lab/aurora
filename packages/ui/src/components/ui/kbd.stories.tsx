import type { Meta, StoryObj } from "@storybook/react-vite";

import { Kbd, KbdGroup } from "./kbd";

/**
 * Meta du composant Kbd.
 *
 * Affiche un raccourci clavier (touches à composer, pas une frappe
 * libre). `Kbd` = une touche, `KbdGroup` = une séquence (ex. `⌘ + K`).
 * Le style est calé sur le contexte du tooltip/`kbd` (fond `muted`,
 * texte `muted-foreground`).
 */
const meta = {
  title: "Aurora/UI/Kbd",
  component: Kbd,
  tags: ["autodocs"],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : une touche seule.
 *
 * @summary touche unique
 */
export const Defaut: Story = {
  render: () => <Kbd>K</Kbd>,
};

/**
 * Séquence de touches : `KbdGroup` assemble les touches d'un
 * raccourci (modifier + touch principal).
 *
 * @summary raccourci clavier
 */
export const Raccourci: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};
