import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

import {
  Progress,
} from "./progress";

/**
 * Meta du composant Progress (Radix Progress).
 *
 * Barre de progression déterministe (`value` 0–100). Pour une
 * progression indéterminée (chargement sans pourcentage connu),
 * utiliser `Skeleton` (pulse) — pas un Progress à 0.
 */
const meta = {
  title: "Aurora/UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  args: { value: 40 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : progression à 40% (état de référence).
 *
 * @summary progression déterministe
 */
export const Defaut: Story = {};

/**
 * Progression complète (100%) — l'état final (succès implicite).
 *
 * @summary progression terminée
 */
export const Complete: Story = { args: { value: 100 } };

/**
 * Progression partielle (25%) — à utiliser quand l'avancement est
 * connu mais incomplet (upload, génération, traitement en file).
 *
 * @summary progression partielle
 */
export const Partiel: Story = { args: { value: 25 } };

/**
 * Progression pilotée par un bouton (incrément de 10% à chaque clic,
 * plafonné à 100) — démontre le branchement `value` contrôlé.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée en CI.
 */
export const Interactive: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le bouton est cliqué, la progression augmente de 10%",
  render: function InteractiveRender() {
    const [value, setValue] = useState(10);
    return (
      <div className="flex w-96 flex-col gap-3">
        <Progress value={value} />
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setValue((v) => Math.min(100, v + 10))}
        >
          +10%
        </button>
      </div>
    );
  },
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const btn = canvas.getByRole("button", { name: /\+10%?/i });
    await step("Le clic augmente la progression", async () => {
      await userEvent.click(btn);
      await new Promise((r) => setTimeout(r, 200));
      const indicator = canvasElement.ownerDocument.querySelector(
        "[role='progressbar']",
      )?.querySelector("div");
      expect(indicator?.style.transform).toContain("-90%");
    });
  },
};
