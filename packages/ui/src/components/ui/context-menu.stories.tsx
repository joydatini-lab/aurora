import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";

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
        <ContextMenuTrigger className="flex h-32 w-48 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
          Clic droit ici
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
