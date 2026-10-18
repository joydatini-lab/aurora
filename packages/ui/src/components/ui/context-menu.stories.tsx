import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent } from "storybook/test";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuRadioGroup,
  ContextMenuShortcut,
  ContextMenuGroup,
} from "./context-menu";
import { Copy, Trash2, Settings, ExternalLink } from "lucide-react";

/**
 * Meta du composant ContextMenu (Radix Portal).
 *
 * Le menu s'ouvre au **clic droit** sur le trigger (pas au clic gauche
 * comme un `DropdownMenu`). Contenu monté sur `document.body` (portail).
 * `layout: "fullscreen"`.
 *
 * Pour ouvrir au clic gauche (menu d'actions explicite), utiliser
 * `DropdownMenu` — pas le ContextMenu.
 */
const meta = {
  title: "Aurora/UI/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : menu contextuel (clic droit) sur une zone.
 * Affiche une étiquette de contexte + actions + séparateur.
 *
 * @summary menu contextuel (clic droit)
 */
export const Defaut: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-32 w-48 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
            Clic droit ici
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Événement</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem>Réorganiser</ContextMenuItem>
          <ContextMenuItem>Doublonner</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>Supprimer</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};

/**
 * Menu avec raccourcis clavier.
 *
 * @summary menu avec raccourcis
 */
export const AvecRaccourcis: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-32 w-48 cursor-contextual items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
            Clic droit
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem>
            Copier
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Coller
            <ContextMenuShortcut>⌘V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Supprimer
            <ContextMenuShortcut>⌘Delete</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};

/**
 * Menu avec groupes.
 *
 * @summary menu avec groupes
 */
export const AvecGroupes: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-32 w-48 cursor-contextual items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
            Clic droit
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Action</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              Copier
            </ContextMenuItem>
            <ContextMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Ouvrir
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuLabel>Configuration</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem>
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              Paramètres
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuItem>Supprimer</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};

/**
 * Menu avec cases à cocher et options radio.
 *
 * @summary menu avec checkbox et radio
 */
export const AvecCheckboxEtRadio: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-32 w-48 cursor-contextual items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
            Clic droit
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Affichage</ContextMenuLabel>
          <ContextMenuCheckboxItem checked>Grille</ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem>Liste</ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>Thème</ContextMenuLabel>
          <ContextMenuRadioGroup defaultValue="sombre">
            <ContextMenuRadioItem value="clair">Clair</ContextMenuRadioItem>
            <ContextMenuRadioItem value="sombre">Sombre</ContextMenuRadioItem>
            <ContextMenuRadioItem value="systeme">Système</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};

/**
 * Test de comportement : le menu s'ouvre au clic droit.
 *
 * @summary test ouverture menu
 */
export const OuvreMenu: Story = {
  tags: ["!dev", "!autodocs"],
  name: "le menu s'ouvre au clic droit",
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-32 w-48 cursor-contextual items-center justify-center rounded-md border">
            Clic droit
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem>Option 1</ContextMenuItem>
          <ContextMenuItem>Option 2</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const trigger = canvasElement.querySelector('div[cursor="contextual"]') as HTMLElement;

    await step("Le menu s'ouvre au clic droit", async () => {
      fireEvent.contextMenu(trigger!);

      const menu = await new Promise<HTMLElement>((resolve) => {
        const obs = new MutationObserver(() => {
          const m = document.querySelector('[role="menu"], [data-radix-context-menu-content]');
          if (m) obs.disconnect(), resolve(m as HTMLElement);
        });
        obs.observe(document.body, { childList: true, subtree: true });
      });

      await expect(menu).toBeInTheDocument();
    });
  },
};

/**
 * Test d'accessibilité : vérifie l'arbre sémantique.
 *
 * @summary accessible aux lecteurs d'écran
 */
export const Accessible: Story = {
  tags: ["!dev", "!autodocs"],
  name: "arbre sémantique accessible",
  render: () => (
    <div className="flex justify-center p-12">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button className="flex h-32 w-48 items-center justify-center rounded-md border">
            <span>Menu accessible</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56" aria-label="Menu contextuel">
          <ContextMenuItem>
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copier
            <ContextMenuShortcut aria-label="raccourci copier">⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button') as HTMLElement;
    fireEvent.contextMenu(button!);

    const menu = await new Promise<HTMLElement>((resolve) => {
      const obs = new MutationObserver(() => {
        const m = document.querySelector('[role="menu"], [data-radix-context-menu-content]');
        if (m) obs.disconnect(), resolve(m as HTMLElement);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });

    await expect(menu).toHaveAttribute("aria-label", "Menu contextuel");
  },
};