import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { Button } from "./button";

/**
 * Meta du composant Drawer (vaul).
 *
 * Le Drawer est un **panneau glissant depuis un bord** (souvent le
 * bas sur mobile, le haut/sous une barre sur desktop). Contrairement
 * à un `Dialog` (centré, modal classique), un Drawer est utilisé pour
 * une **action rapide, non bloquante** (filtre, tri, détail court).
 *
 * Pour un panneau latéral persistant (configuration, sommaire),
 * utiliser `Sheet` — pas un Drawer.
 *
 * Le composant `vaul` gère la détection du tactile (swipe-down pour
 * fermer) ; le `handle` est le poignée de tirage.
 */
const meta = {
  title: "Aurora/UI/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : drawer de bas d'écran (filtre rapide). Le `handle` est la
 * poignée ; le contenu est un formulaire court.
 *
 * @summary action rapide non bloquante
 */
export const Defaut: Story = {
  render: function DefautRender() {
    const [open, setOpen] = useState(false);
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline">Filtrer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtres</DrawerTitle>
            <DrawerDescription>
              Affinez la liste, puis appliquez.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-4 p-4">
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder="Rechercher"
            />
          </div>
          <DrawerFooter>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Appliquer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  },
};

/**
 * Drawer avec direction personnalisée (`direction="top"` pour un
 * bandeau qui descend de la barre d'actions).
 *
 * @summary bandeau supérieur
 */
export const DirectionHaut: Story = {
  render: function DirectionHautRender() {
    const [open, setOpen] = useState(false);
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="top">
        <DrawerTrigger asChild>
          <Button>Ouvrir le bandeau</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Bandeau d'info</DrawerTitle>
            <DrawerDescription>
              Contenu éphémère, non bloquant.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  },
};
