import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "./switch";

/**
 * Meta du composant Switch (Radix).
 *
 * Toggle binaire d'un état (pas de valeur intermédiaire) — pour
 * l'option on/off d'un réglage. Pour une valeur multi-choix, utiliser
 * un `Select` ou des `Checkbox`.
 */
const meta = {
  title: "Aurora/UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: { defaultChecked: false },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : switch désactivé (état initial `unchecked`).
 *
 * @summary toggle désactivé
 */
export const Defaut: Story = {};

/**
 * Switch activé (`checked`) — l'état `checked` est l'état persistant
 * (réglage enregistré), pas un état éphémère.
 *
 * @summary toggle activé
 */
export const Active: Story = { args: { defaultChecked: true } };

/**
 * Switch désactivé (`disabled`) — l'utilisateur ne peut pas changer
 * l'état (ex. réglage imposé par l'admin).
 *
 * @summary toggle inactif
 */
export const Desactive: Story = { args: { disabled: true } };
