import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";
import { MoreHorizontal } from "lucide-react";

/**
 * Meta du composant DropdownMenu (Radix Portal).
 *
 * Le menu est monté sur `document.body` (portail) — les tests de
 * comportement ciblent `body`, pas le canvas. `layout: "fullscreen"`
 * (overlays fixed).
 */
const meta = {
  title: "Aurora/UI/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : menu d'actions (label + items + séparateur).
 * Le trigger est un bouton d'icône (`MoreHorizontal`).
 *
 * @summary menu d'actions
 */
export const Defaut: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profil</DropdownMenuItem>
        <DropdownMenuItem>Facturation</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Déconnexion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/**
 * Test de comportement : le trigger ouvre le menu (`role="menu"` dans
 * `document.body`), un item le referme.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée par le panel
 * Interactions et en CI.
 */
export const OuvreReferme: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le trigger est cliqué, le menu s'ouvre puis un item le referme",
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Profil</DropdownMenuItem>
        <DropdownMenuItem>Déconnexion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvasElement, step }) => {
    const body = canvasElement.ownerDocument.body;
    await step("Le trigger ouvre le menu", async () => {
      await userEvent.click(canvasElement.querySelector("button")!);
      const menu = await new Promise<HTMLElement>((resolve) => {
        const obs = new MutationObserver(() => {
          const m = body.querySelector('[role="menu"]');
          if (m) {
          obs.disconnect();
          resolve(m as HTMLElement);
        }
        });
        obs.observe(body, { childList: true, subtree: true });
      });
      expect(menu).toBeInTheDocument();
    });
    await step("Un item referme le menu", async () => {
      await userEvent.click(body.querySelector('[role="menuitem"]')!);
      await new Promise((r) => setTimeout(r, 300));
      expect(body.querySelector('[role="menu"]')).not.toBeInTheDocument();
    });
  },
};
