import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "./menubar";

/**
 * Meta du composant Menubar (Radix Portal).
 *
 * Contenu monté sur `document.body` (portail). `layout: "fullscreen"`.
 *
 * Le Menubar est réservé aux **bars de menus d'application** (type
 * desktop : Fichier / Édition / Affichage). Pour un menu d'actions
 * contextuel dans le flux d'une page, utiliser `DropdownMenu` ou
 * `ContextMenu`.
 */
const meta = {
  title: "Aurora/UI/Menubar",
  component: Menubar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : une barre de menus d'application (2-3 menus, items +
 * raccourcis clavier).
 *
 * @summary barre de menus d'application
 */
export const Defaut: Story = {
  render: () => (
    <Menubar className="mx-auto mt-4 w-[500px]">
      <MenubarMenu>
        <MenubarTrigger>Fichier</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Nouveau
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Ouvrir…
            <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Fermer
            <MenubarShortcut>⌘W</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Édition</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Annuler
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Rétablir
            <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
