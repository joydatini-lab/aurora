import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./avatar";

/**
 * Meta du composant Avatar (Radix Avatar).
 *
 * Représentation visuelle d'une personne (photo ou fallback). Le
 * fallback (initiales) s'affiche automatiquement si l'image ne charge
 * pas (état `fallbackTrigger` de Radix). La taille se pilote par les
 * classes de hauteur/largeur (h-… / w-…) du conteneur `Avatar`.
 */
const meta = {
  title: "Aurora/UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : photo chargée (l'image distante). Le fallback n'apparaît
 * que si l'échoue.
 *
 * @summary photo de profil
 */
export const Defaut: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/96?img=12" alt="Portrait" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Fallback (initiales) : utilisé quand il n'y a pas de photo (profil
 * anonyme, placeholder). Le fond `muted` + le texte `muted-foreground`
 * restent lisibles sur les deux styles neutres.
 *
 * @summary initiales sans photo
 */
export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
};

/**
 * Tailles : le composant n'expose pas de prop de taille ; on pilote
 * par les classes du conteneur `Avatar` (h/w) et le fallback
 * s'adapte (h-full/w-full).
 *
 * @summary tailles par classes
 */
export const Tailles: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">XS</AvatarFallback>
      </Avatar>
      <Avatar className="h-12 w-12">
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar className="h-16 w-16">
        <AvatarFallback className="text-base">LG</AvatarFallback>
      </Avatar>
    </div>
  ),
};
