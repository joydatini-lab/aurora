import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ALERT_VARIANTS,
  Alert,
  AlertDescription,
  AlertTitle,
} from "./alert";

/**
 * Meta du composant Alert.
 *
 * L'alert est le conteneur de message statut (info, succès, erreur) ;
 * il porte `role="alert"` pour les lecteurs d'écran. Les options CVA
 * sont dérivées de `ALERT_VARIANTS` (source unique).
 */
const meta = {
  title: "Aurora/UI/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ALERT_VARIANTS },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : alerte informationnelle. L'alert ne remplace pas la
 * confirmation de formulaire (pour l'erreur de validation, utiliser
 * `FormMessage`).
 *
 * @summary message statut
 */
export const Defaut: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>Votre modification a été enregistrée.</AlertDescription>
    </Alert>
  ),
};

/**
 * Le variante destructive est l'alerte critique (danger, erreur bloquante).
 *
 * @summary message critique
 */
export const Destructif: Story = {
  args: { variant: "destructive" },
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>L'opération n'a pas pu être terminée.</AlertDescription>
    </Alert>
  ),
};
