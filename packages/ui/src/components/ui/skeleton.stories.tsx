import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "./skeleton";

/**
 * Meta du composant Skeleton.
 */
const meta = {
  title: "Aurora/UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : le bloc de chargement pulse (`animate-pulse`), fond `primary/10`.
 * S'utilise comme placeholder pendant le chargement d'un contenu inconnu.
 *
 * @summary placeholder de chargement
 */
export const Defaut: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-72">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  ),
};

/**
 * Les dimensions se pilotent par les classes de l'argument `className`
 * (h/w/rounded) — le composant n'expose pas de prop de taille.
 *
 * @summary tailles par classes
 */
export const Tailles: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-16 w-16 rounded-2xl" />
    </div>
  ),
};
