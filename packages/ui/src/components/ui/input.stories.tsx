import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

/**
 * Meta du composant Input.
 */
const meta = {
  title: "Aurora/UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "nom.d@exemple.fr" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : champ texte avec placeholder. L'accessibilité est portée par
 * la lecture d'un `Label` associé (`htmlFor` / `id`).
 *
 * @summary champ texte
 */
export const Defaut: Story = {};

/**
 * Les types de champ dérivent de `type` (email, password, number,…) —
 * le composant ne change pas, c'est l'attribut natif qui pilote
 * l'autocomplétion/clavier du navigateur.
 *
 * @summary types natifs
 */
export const Types: Story = {
  args: { type: "email" },
  render: (args) => (
    <div className="flex flex-col gap-3 w-72">
      <Input {...args} placeholder="Adresse e-mail" type="email" />
      <Input {...args} placeholder="Mot de passe" type="password" />
      <Input {...args} placeholder="24" type="number" />
    </div>
  ),
};

/**
 * Un champ désactivé ne se saisit plus (état grisé natif).
 *
 * @summary état inactif
 */
export const Desactive: Story = { args: { disabled: true } };
