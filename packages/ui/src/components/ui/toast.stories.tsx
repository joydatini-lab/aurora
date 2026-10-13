import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { Button } from "./button";

/**
 * Meta du composant Toast (Radix Toast).
 *
 * Notification éphémère (confirmation d'action, alerte courte).
 * **Ne remplace pas** un `Alert` (persistant, pour un message statut
 * important) ni un `Dialog` (interaction bloquante).
 *
 * Le `ToastProvider` gère la file (plusieurs toasts s'empilent) ; le
 * `ToastViewport` positionne le conteneur (bas-droite par défaut,
 * `sm:`). Chaque `Toast` a une durée `duration` (par défaut ~5s) et
 * une variante (`default` / `destructive`).
 */
const meta = {
  title: "Aurora/UI/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un toast de succès déclenché par un bouton. Le provider
 * est requis globalement (le monter dans un story qui veut émettre
 * des toasts — ou le brancher dans `preview.tsx` pour l'ensemble du
 * canvas).
 *
 * @summary notification éphémère
 */
export const Defaut: Story = {
  render: function DefautRender() {
    const [toasts, setToasts] = useState<{
      id: number;
      title: string;
      description: string;
    }[]>([]);
    let counter = 0;

    const addToast = () => {
      counter += 1;
      setToasts((prev) => [
        ...prev,
        {
          id: counter,
          title: "Modifications enregistrées",
          description: "Vos réglages sont à jour.",
        },
      ]);
    };
    const removeToast = (id: number) =>
      setToasts((prev) => prev.filter((t) => t.id !== id));

    return (
      <div className="p-4">
        <Button onClick={addToast}>Enregistrer</Button>
        <ToastProvider>
          {toasts.map((t) => (
            <Toast key={t.id} onOpenChange={(o) => !o && removeToast(t.id)}>
              <ToastTitle>{t.title}</ToastTitle>
              <ToastDescription>{t.description}</ToastDescription>
            </Toast>
          ))}
          <ToastViewport />
        </ToastProvider>
      </div>
    );
  },
};

/**
 * Toast destructif (erreur) : la variante `destructive` change la
 * bordure (rouge) et le style du bouton d'action.
 *
 * @summary notification d'erreur
 */
export const Destructif: Story = {
  render: function DestructifRender() {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-4">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Échouer l'envoi
        </Button>
        <ToastProvider>
          <Toast open={open} onOpenChange={setOpen} variant="destructive">
            <ToastTitle>Échec</ToastTitle>
            <ToastDescription>
              L'envoi n'a pas abouti. Réessayez.
            </ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      </div>
    );
  },
};
