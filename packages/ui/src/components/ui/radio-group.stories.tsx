import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  RadioGroup,
  RadioGroupItem,
} from "./radio-group";
import { Label } from "./label";

/**
 * Meta du composant RadioGroup (Radix).
 *
 * Choix **unique** parmi plusieurs options (pas de multi-sélection).
 * Pour la multi-sélection, utiliser `Checkbox`. Pour un choix binaire
 * on/off (pas une valeur), utiliser `Switch`.
 */
const meta = {
  title: "Aurora/UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un groupe de choix unique (3 options, la première cochée par
 * défaut).
 *
 * @summary choix unique
 */
export const Defaut: Story = {
  render: function DefautRender() {
    const [value, setValue] = useState("focus");
    return (
      <RadioGroup value={value} onValueChange={setValue} className="grid gap-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="focus" id="focus" />
          <Label htmlFor="focus">Focus</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="plan" id="plan" />
          <Label htmlFor="plan">Planification</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="veille" id="veille" />
          <Label htmlFor="veille">Veille</Label>
        </div>
      </RadioGroup>
    );
  },
};

/**
 * Groupe désactivé (`disabled`) — aucune option ne peut être
 * sélectionnée (état de lecture seule ou prérequis non rempli).
 *
 * @summary choix inactif
 */
export const Desactive: Story = {
  render: () => (
    <RadioGroup defaultValue="focus" disabled className="grid gap-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="focus" id="focus2" />
        <Label htmlFor="focus2">Focus</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="plan" id="plan2" />
        <Label htmlFor="plan2">Planification</Label>
      </div>
    </RadioGroup>
  ),
};
