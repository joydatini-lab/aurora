import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatTile } from "./StatTile";

/**
 * Meta du composant StatTile (contrat AD-10 §3.3).
 *
 * Tuile KPI : un libellé + une valeur (optionnelle unité) dans une
 * carte. Les états canoniques :
 * - `loading` = valeur en skeleton (pulse),
 * - `empty` (value = "" ou 0 sans unité) = « — » en `muted-foreground`,
 * - normal = valeur en `tabular-nums` (alignement numérique).
 *
 * `chartId` lie la tuile à un `ChartSpec` (05 §3.6.9 focusBilan) —
 * pour l'infographie, pas pour le rendu.
 */
const meta = {
  title: "Aurora/UI/StatTile",
  component: StatTile,
  tags: ["autodocs"],
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : KPI avec valeur + unité (ex. « 4 h 30 »). La valeur est en
 * `tabular-nums`, l'unité en monospace plus petite.
 *
 * @summary KPI avec valeur
 */
export const Defaut: Story = {
  args: {
    label: "Temps de focus",
    value: "4 h 30",
    chartId: "focusBilan",
  },
};

/**
 * KPI numérique avec unité d'appoint (ex. pourcentage). L'unité reste
 * en monospace, plus petite que la valeur.
 *
 * @summary KPI avec pourcentage
 */
export const Pourcentage: Story = {
  args: {
    label: "Taux de complétion",
    value: 72,
    unit: "%",
    chartId: "focusBilan",
  },
};

/**
 * État vide : valeur = "" (ou 0 sans unité) → le « — » en
 * `muted-foreground` (pas de valeur factice).
 *
 * @summary KPI vide
 */
export const Vide: Story = {
  args: {
    label: "Événements cette semaine",
    value: "",
  },
};

/**
 * État chargement : la valeur est remplacée par un skeleton (pulse),
 * le libellé reste lisible (pas de flash).
 *
 * @summary KPI en chargement
 */
export const Chargement: Story = {
  args: {
    label: "Temps de focus",
    value: "—",
    loading: true,
  },
};
