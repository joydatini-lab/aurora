import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Button } from "./button";

/**
 * Meta du composant Popover (Radix Portal).
 *
 * Contenu monté sur `document.body`. `layout: "fullscreen"` (overlays).
 */
const meta = {
  title: "Aurora/UI/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un popover simple (trigger bouton, contenu texte).
 * À utiliser pour du contenu contextuel court (tooltip élargi,
 * configuration rapide) — pas pour un formulaire complet.
 *
 * @summary contenu contextuel
 */
export const Defaut: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Ouvrir le popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">
          Contenu du popover — court et contextuel.
        </p>
      </PopoverContent>
    </Popover>
  ),
};

/**
 * Test de comportement : le trigger ouvre le popover, le clic hors
 * (sur `body`) le referme.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée en CI.
 */
export const OuvreReferme: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le trigger est cliqué, le popover s'ouvre puis un clic hors le referme",
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Ouvrir le popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">Contenu du popover.</p>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement, step }) => {
    const body = canvasElement.ownerDocument.body;
    await step("Le trigger ouvre le popover", async () => {
      await userEvent.click(canvasElement.querySelector("button")!);
      const popover = await new Promise<HTMLElement>((resolve) => {
        const obs = new MutationObserver(() => {
          const p = body.querySelector('[data-state="open"]');
          if (p) {
          obs.disconnect();
          resolve(p as HTMLElement);
        }
        });
        obs.observe(body, { childList: true, subtree: true, attributes: true });
      });
      expect(popover).toBeInTheDocument();
    });
    await step("Le clic hors referme le popover", async () => {
      await userEvent.click(body);
      await new Promise((r) => setTimeout(r, 300));
      expect(
        body.querySelector('[data-state="open"]'),
      ).not.toBeInTheDocument();
    });
  },
};
