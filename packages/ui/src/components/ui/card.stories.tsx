import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

/**
 * Meta du composant Card.
 *
 * La Card est un **patron de composition** (en-tête / contenu / pied),
 * pas un composant atomique : la story de référence montre l'assemblage
 * standard des sous-blocs.
 */
const meta = {
  title: "Aurora/UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * La carte de référence : un bloc autonome (fond `card`, bordure, ombre)
 * avec en-tête (titre + description), contenu et pied. À utiliser pour
 * les entités (profil, événement, fiche) — pas pour de la mise en page
 * générale.
 *
 * @summary bloc autonome d'entité
 */
export const Defaut: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Session focus</CardTitle>
        <CardDescription>25 min · pomodoro n°3</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        L'objectif de cette session est de terminer le bloc du rapport.
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">Terminé 14:32</span>
      </CardFooter>
    </Card>
  ),
};

/**
 * Une carte peut rester un simple conteneur (sans en-tête ni pied) —
 * les sous-blocs sont optionnels, seul `Card` est requis.
 *
 * @summary conteneur minimal
 */
export const Conteneur: Story = {
  render: () => (
    <Card className="max-w-sm p-6">
      Contenu nu, sans blocs nommés.
    </Card>
  ),
};
