import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  Slider,
} from "./slider";

/**
 * Meta du composant Slider (Radix Slider).
 *
 * Réglage continu (pas discret) : volume, intensité, seuil. Pour un
 * choix parmi des valeurs discrètes, utiliser un `RadioGroup` ou un
 * `Select` — pas un Slider.
 */
const meta = {
  title: "Aurora/UI/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { defaultValue: [50], max: 100, step: 1 },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : slider simple (0–100, valeur initiale 50).
 *
 * @summary réglage continu
 */
export const Defaut: Story = {};

/**
 * Slider multi-poussoirs (2 poignées) : pour définir une plage
 * (filtre de prix, plage de dates).
 *
 * @summary plage (2 poignées)
 */
export const Plage: Story = {
  args: { defaultValue: [25, 75], max: 100, step: 1 },
  render: (args) => <Slider {...args} />
};

/**
 * Slider contrôlé avec affichage de la valeur (feedback direct).
 *
 * @summary slider contrôlé + feedback
 */
export const Controle: Story = {
  render: function ControleRender() {
    const [value, setValue] = useState([60]);
    return (
      <div className="flex w-80 flex-col gap-2">
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={5}
          className="w-full"
        />
        <span className="text-sm text-muted-foreground">
          {value[0]}%
        </span>
      </div>
    );
  },
};
