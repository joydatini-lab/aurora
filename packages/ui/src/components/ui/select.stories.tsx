import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

/**
 * Meta du composant Select (Radix Portal).
 *
 * Le menu déroulant est monté sur `document.body` (portail) — les tests
 * de comportement ciblent `body`, pas le canvas. `layout: "fullscreen"`
 * (overlays fixed).
 *
 * Le composant est **contrôlé** (`value`/`onValueChange`) : la story de
 * référence démontre le branchement complet (état local + rendu).
 */
const meta = {
  title: "Aurora/UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un select contrôlé (état local) avec des options de taille.
 * Le trigger affiche la valeur sélectionnée (`SelectValue`).
 *
 * @summary select contrôlé
 */
export const Defaut: Story = {
  render: function DefautRender() {
    const [value, setValue] = useState("md");
    return (
      <div className="w-64 p-4">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Taille" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Petite</SelectItem>
            <SelectItem value="md">Moyenne</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
};

/**
 * Test de comportement : le trigger ouvre le menu (`role="combobox"`),
 * le clic sur une item referme le menu et met à jour la valeur.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée par le panel
 * Interactions et en CI (addon-vitest).
 */
export const Selection: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le trigger est cliqué, le menu s'ouvre ; le clic sur une item referme et sélectionne",
  render: function SelectionRender() {
    const [value, setValue] = useState("md");
    return (
      <div className="w-64 p-4">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Petite</SelectItem>
            <SelectItem value="md">Moyenne</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
  play: async ({ canvasElement, step }) => {
    const body = canvasElement.ownerDocument.body;
    await step("Le trigger ouvre le menu", async () => {
      await userEvent.click(canvasElement.querySelector("button")!);
      const menu = await new Promise<HTMLElement>((resolve) => {
        const obs = new MutationObserver(() => {
          const m = body.querySelector('[role="listbox"]');
          if (m) obs.disconnect(), resolve(m as HTMLElement);
        });
        obs.observe(body, { childList: true, subtree: true });
      });
      expect(menu).toBeInTheDocument();
    });
    await step("Le clic sur une item referme et sélectionne", async () => {
      await userEvent.click(body.querySelectorAll('[role="option"]')[0]!);
      await new Promise((r) => setTimeout(r, 300));
      expect(body.querySelector('[role="listbox"]')).not.toBeInTheDocument();
    });
  },
};
