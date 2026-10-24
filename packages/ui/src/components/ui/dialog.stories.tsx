import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";

/**
 * Meta du composant Dialog (Radix Portal).
 *
 * Le contenu est monté sur `document.body` (portail) — jamais dans le
 * canvas de la story. Les tests de comportement (play functions) ciblent
 * `document.body` (via `screen` / `within(body)`), pas le canvas.
 *
 * `layout: "fullscreen"` : les overlays fixed sont visuellement coupées
 * sous `centered` (box de padding du canvas).
 */
const meta = {
  title: "Aurora/UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un dialogue simple (titre + description + contenu + CTA).
 * Le trigger (bouton) ouvre le portail ; l'overlay ferme au clic hors.
 *
 * @summary fenêtre modale
 */
export const Defaut: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Modifier le profil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez vos informations, puis enregistrez.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Contenu du dialogue (form, liste, texte).
        </p>
        <DialogFooter>
          <Button>Enregistrer</Button>
          <DialogClose asChild>
            <Button variant="ghost">Annuler</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * Un dialogue contrôlé (`open`/`onOpenChange`) pour les flows
 * programmatisés (après une action, pas un clic utilisateur).
 *
 * @summary ouvert programmatically
 */
export const Controle: Story = {
  render: function ControleRender() {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button onClick={() => setOpen(true)}>Ouvrir (programmatique)</Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialogue contrôlé</DialogTitle>
            <DialogDescription>
              Ouvert par l'état `open`, fermé par `onOpenChange`.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Fermer</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

/**
 * Test de comportement : le trigger ouvre le dialogue (`role="dialog"`
 * apparaît dans `document.body`), le CTA de fermeture le referme.
 *
 * Tags `!dev`/`!autodocs` : story test-only (absente de la page de docs),
 * exécutée par le panel Interactions et en CI (addon-vitest).
 */
export const OuvertFerme: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le trigger est cliqué, le dialogue s'ouvre puis se ferme",
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Modifier le profil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>Test d'ouverture/fermeture.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Terminé</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement, step }) => {
    const body = canvasElement.ownerDocument.body;
    await step("Le trigger ouvre le dialogue", async () => {
      await userEvent.click(canvasElement.querySelector("button")!);
      const dialog = await new Promise<HTMLElement>((resolve) => {
        const obs = new MutationObserver(() => {
          const d = body.querySelector('[role="dialog"]');
          if (d) {
          obs.disconnect();
          resolve(d as HTMLElement);
        }
        });
        obs.observe(body, { childList: true, subtree: true });
      });
      expect(dialog).toBeInTheDocument();
    });
    await step("Le CTA referme le dialogue", async () => {
      await userEvent.click(body.querySelector('[role="dialog"] button')!);
      await new Promise((r) => setTimeout(r, 300));
      expect(body.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  },
};
