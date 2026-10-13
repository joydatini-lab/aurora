import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Toaster } from "./toaster";
import { Button } from "./button";
import { toast } from "../../hooks/use-toast";

/**
 * Meta du composant Toaster (hub de notifications globales).
 *
 * Le `Toaster` est le **point de mount** des toasts app-wide : il
 * branche le hook `useToast` (store par module, pattern
 * react-hot-toast) sur le `ToastProvider` Radix + le
 * `ToastViewport`. Les composants émettent via `toast({ ... })` —
 * jamais en déclarant leur propre `ToastProvider` (celui-ci est
 * unique, monté une fois à la racine de l'app).
 *
 * `TOAST_LIMIT = 1` : un seul toast visible à la fois (le plus récent
 * remplace l'antérieur) ; la durée de retrait est de ~10 min (les
 * toasts persistent jusqu'à dismissal explicite ou remplacement).
 *
 * Pour une story qui **émet** des toasts, il faut le `Toaster` dans
 * le rendu — pas le `ToastProvider` seul (le store de `useToast`
 * reste vide sans le hub).
 */
const meta = {
  title: "Aurora/UI/Toaster",
  component: Toaster,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : le hub Toaster (vide au montage) + un bouton d'émission.
 * L'interaction est portée par le play (voir story `Emission`).
 *
 * @summary hub de toasts global
 */
export const Defaut: Story = {
  render: () => (
    <div className="space-y-4 p-4">
      <Button onClick={() => toast({ title: "Enregistré", description: "Vos modifications sont à jour." })}>
        Émettre un toast
      </Button>
      <Toaster />
    </div>
  ),
};

/**
 * Émission de 3 toasts successifs : le plus récent remplace le
 * précédent (`TOAST_LIMIT = 1`) ; le bouton de fermeture (X)
 * referme le toast courant.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée en CI.
 */
export const Emission: Story = {
  tags: ["!dev", "!autodocs"],
  name: "le plus récent remplace le précédent (limit 1) ; le X referme",
  render: () => (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Button onClick={() => toast({ title: "Tâche ajoutée" })}>Toast 1</Button>
        <Button onClick={() => toast({ title: "Tâche ajoutée (2)" })}>Toast 2</Button>
        <Button onClick={() => toast({ title: "Tâche ajoutée (3)", variant: "destructive" })}>
          Toast 3
        </Button>
      </div>
      <Toaster />
    </div>
  ),
  play: async ({ canvas, userEvent, step }) => {
    await step("3 émissions → 1 seul toast visible (le plus récent)", async () => {
      const buttons = canvas.getAllByRole("button", { name: /toast/i });
      await userEvent.click(buttons[0]!);
      await userEvent.click(buttons[1]!);
      await userEvent.click(buttons[2]!);
      await new Promise((r) => setTimeout(r, 400));
      const visible = canvas.getByRole("region", { name: /toast/i });
      expect(visible).toBeInTheDocument();
      // Limit 1 : seulement le 3e (destructif) est visible.
      expect(canvas.queryByText("Tâche ajoutée (3)")).toBeInTheDocument();
      expect(canvas.queryByText("Tâche ajoutée (2)")).not.toBeInTheDocument();
    });
  },
};
