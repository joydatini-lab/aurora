import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "./textarea";

/**
 * Meta du composant Textarea.
 *
 * Saisie de texte **multi-lignes** (commentaire, description, note).
 * Pour une saisie de ligne unique, utiliser `Input`. La hauteur se
 * pilote par `rows` ou les classes (`min-h-*` / `h-*`).
 */
const meta = {
  title: "Aurora/UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : zone de texte avec placeholder et 4 lignes par défaut.
 *
 * @summary saisie multi-lignes
 */
export const Defaut: Story = {
  args: {
    placeholder: "Écrivez votre note…",
    rows: 4,
  },
};

/**
 * Zone désactivée (`disabled`) — lecture seule (ex. champ imposé par
 * l'admin, ou note en cours de validation).
 *
 * @summary saisie verrouillée
 */
export const Desactive: Story = {
  args: {
    placeholder: "Note en lecture seule",
    disabled: true,
  },
};

/**
 * Zone élargie (8 lignes) pour du contenu long (description,
 * commentaire de session).
 *
 * @summary contenu long
 */
export const Long: Story = {
  args: {
    placeholder: "Décrivez l'objectif de la session…",
    rows: 8,
  },
};
