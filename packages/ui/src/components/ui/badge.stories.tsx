import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Badge,
  BADGE_VARIANTS,
} from "./badge";

/**
 * Meta du composant Badge.
 *
 * Les options CVA sont dérivées de la constante `BADGE_VARIANTS` exportée
 * par le module — source unique, jamais dupliquées ici.
 */
const meta = {
  title: "Aurora/UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Badge" },
  argTypes: {
    variant: { control: "select", options: BADGE_VARIANTS },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : variante `default`, le badge de référence.
 *
 * @summary état de référence
 */
export const Defaut: Story = {};

/**
 * Le badge secondaire est la mention neutre (catégorie, statut passif).
 *
 * @summary mention neutre
 */
export const Secondaire: Story = { args: { variant: "secondary" } };

/**
 * Le badge destructif marque l'alerte / l'état critique.
 *
 * @summary état critique
 */
export const Destructif: Story = { args: { variant: "destructive" } };

/**
 * Le badge outline est le bord sans fond, pour les listes denses
 * où le fond solide serait trop lourd.
 *
 * @summary mention discrète
 */
export const Contour: Story = { args: { variant: "outline" } };
