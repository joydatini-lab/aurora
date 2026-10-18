import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Spinner } from "./spinner";

/**
 * Meta du composant Spinner.
 *
 * `Spinner` est un indicateur de chargement (`role="status"` +
 * `aria-label "Loading"`). Pas de variantes CVA : la taille se pilote par
 * `className` (`size-*`).
 */
const meta = {
  title: "Aurora/UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : taille `size-4`, annonce « Loading » aux lecteurs d'écran.
 *
 * @summary indicateur de chargement standard
 */
export const Defaut: Story = {};

/**
 * Taille personnalisée via `className` (ex. `size-8` pour un état de page).
 *
 * @summary taille agrandie
 */
export const Grande: Story = {
  args: { className: "size-8" },
};

/**
 * Usage en contexte : spinner + libellé dans une ligne de chargement.
 *
 * @summary dans un état de chargement
 */
export const AvecLibelle: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      <span>Chargement des données…</span>
    </div>
  ),
};

/**
 * Test d'accessibilité : le spinner annonce le chargement
 * (`role="status"` + libellé « Loading »).
 *
 * @summary accessible aux lecteurs d'écran
 */
export const Accessible: Story = {
  tags: ["!dev", "!autodocs"],
  name: "annonce le chargement (role status + aria-label)",
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("status", { name: "Loading" }),
    ).toBeInTheDocument();
  },
};
