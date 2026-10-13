import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

/**
 * Meta du composant Command (cmdk + Radix Dialog).
 *
 * Le `CommandDialog` monte le contenu dans un `DialogContent` (portail
 * sur `document.body`) — les tests de comportement ciblent `body`, pas
 * le canvas. `layout: "fullscreen"` (overlays fixed).
 *
 * Deux modes d'usage : palette inline (commande dans le flux) et palette
 * en dialog (raccourci clavier global, ex. `Cmd+K`).
 */
const meta = {
  title: "Aurora/UI/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : palette de commandes en dialog (raccourci clavier global).
 * La saisie filtre les items en temps réel.
 *
 * @summary palette globale de commandes
 */
export const Palette: Story = {
  render: function PaletteRender() {
    const [open, setOpen] = useState(false);
    return (
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une commande…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => setOpen(false)}>
              Nouveau document
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              Réglages
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              Déconnexion
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    );
  },
};

/**
 * Palette en flux (non-dialog) : utilisée dans une barre d'outils ou un
 * menu contextuel, pas en overlay global.
 *
 * @summary palette inline
 */
export const Inline: Story = {
  render: () => (
    <div className="w-96 rounded-md border">
      <Command>
        <CommandInput placeholder="Rechercher…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem>Calendrier</CommandItem>
            <CommandItem>Focus</CommandItem>
            <CommandItem>Agent</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};
