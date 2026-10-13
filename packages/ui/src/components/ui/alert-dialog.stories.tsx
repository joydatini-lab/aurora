import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Button } from "./button";

/**
 * Meta du composant AlertDialog (Radix Portal).
 *
 * Le contenu est monté sur `document.body` (portail). `layout:
 * "fullscreen"` (overlays fixed).
 *
 * L'alert dialog est **réservé aux décisions critiques** (suppression
 * irréversible, sortie sans sauvegarde). Pour une confirmation standard
 * (annuler une action), utiliser un `Dialog`. La distinction :
 * l'AlertDialog **bloque** l'interaction (pas de fermeture au clic hors),
 * le Dialog se ferme au clic sur l'overlay.
 */
const meta = {
  title: "Aurora/UI/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : demande de confirmation destructive (suppression d'un
 * élément). L'action confirme, le `Cancel` abandonne.
 *
 * @summary confirmation destructive
 */
export const Defaut: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Supprimer la tâche</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La tâche et son historique
            seront définitivement effacés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
