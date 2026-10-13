import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox";

/**
 * Meta du composant Checkbox (Radix).
 *
 * Sélection multiple (état binaire par item) — pour les listes de choix.
 * Pour un choix unique, utiliser un `RadioGroup`.
 */
const meta = {
  title: "Aurora/UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : case à cocher désélectionnée (état initial `unchecked`).
 *
 * @summary case désélectionnée
 */
export const Defaut: Story = {};

/**
 * Case cochée (`checked`) — l'état de sélection persistant d'un item.
 *
 * @summary case sélectionnée
 */
export const Cochee: Story = { args: { defaultChecked: true } };

/**
 * État indéterminé (`"indeterminate"`) — utilisé pour les cases
 * « tout sélectionner » quand une partie (ni zéro ni tout) des
 * items est cochée.
 *
 * @summary état partiel
 */
export const Indeterminee: Story = { args: { checked: "indeterminate" } };

/**
 * Case désactivée (`disabled`) — l'item ne peut pas être modifié
 * (ex. dépendance non respectée, ou lecture seule).
 *
 * @summary case inactif
 */
export const Desactivee: Story = { args: { disabled: true } };
