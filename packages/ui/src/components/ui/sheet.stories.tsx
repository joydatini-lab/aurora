import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Button } from "./button";

/**
 * Meta du composant Sheet (Radix Dialog, variante « panneau glissant »).
 *
 * Contenu monté sur `document.body` (portail). `layout: "fullscreen"`.
 * La variante `side` (cva) détermine le côté d'où le panneau glisse :
 * `right` par défaut (panneau latéral), `top`/`bottom`/`left` pour les
 * autres bords.
 */
const meta = {
  title: "Aurora/UI/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : panneau latéral droit (la variante la plus courante pour
 * une configuration ou un sommaire).
 *
 * @summary panneau latéral droit
 */
export const Droit: Story = {
  render: function DroitRender() {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Ouvrir le panneau</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Réglages</SheetTitle>
            <SheetDescription>
              Les modifications sont appliquées immédiatement.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Contenu du panneau.
            </p>
          </div>
          <SheetFooter>
            <Button onClick={() => setOpen(false)}>Terminé</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};

/**
 * Panneau du bas : utilisé pour une barre d'actions contextuelle
 * (mobile : drawer inférieur, desktop : bandeau).
 *
 * @summary panneau inférieur
 */
export const Bas: Story = {
  render: function BasRender() {
    const [open, setOpen] = useState(false);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Ouvrir le bandeau</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Actions</SheetTitle>
            <SheetDescription>
              Sélection rapide.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button variant="secondary">Annuler</Button>
            <Button>Valider</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};
