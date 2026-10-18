import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "./empty";
import { Button } from "./button";
import { Search, Plus, XCircle } from "lucide-react";

/**
 * Meta du composant Empty (état vide).
 *
 * Fournit un espace visuel pour les données vides avec
 * titre, description et action potentielle.
 */
const meta = {
  title: "Aurora/UI/Empty",
  component: Empty,
  tags: ["autodocs"],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : état vide simple avec titre et description.
 *
 * @summary état vide par défaut
 */
export const Defaut: Story = {
  render: () => (
    <Empty className="max-w-sm">
      <EmptyTitle>Aucun résultat</EmptyTitle>
      <EmptyDescription>
        Essayez de modifier votre recherche ou utilisez des filtres différents.
      </EmptyDescription>
    </Empty>
  ),
};

/**
 * Avec icône et bouton d'action.
 *
 * @summary état vide avec action
 */
export const AvecAction: Story = {
  render: () => (
    <Empty className="max-w-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search className="h-8 w-8" />
        </EmptyMedia>
        <EmptyTitle>Rien à afficher</EmptyTitle>
        <EmptyDescription>
          Commencez par ajouter votre première tâche ou modifiez les filtres.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => alert("Créer une nouvelle entrée")}>
          <Plus className="h-4 w-4" />
          Créer une entrée
        </Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * Avec SVG comme media par défaut.
 *
 * @summary état vide avec SVG
 */
export const AvecSvg: Story = {
  render: () => (
    <Empty className="max-w-sm">
      <EmptyHeader>
        <EmptyMedia variant="default">
          <XCircle className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>Espace vide</EmptyTitle>
        <EmptyDescription>
          Cochez une case pour commencer ou cliquez sur le bouton ci-dessous.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

/**
 * État vide dans un contexte de liste (ex. liste vide).
 *
 * @summary état vide dans une liste
 */
export const DansListe: Story = {
  render: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search className="h-10 w-10" />
          </EmptyMedia>
          <EmptyTitle>Aucun élément trouvé</EmptyTitle>
          <EmptyDescription>
            Vérifiez que le filtre est correct ou ajoutez de nouvelles données.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">Afficher tout</Button>
          <Button className="ml-2">Ajouter un élément</Button>
        </EmptyContent>
      </Empty>
    </div>
  ),
};

/**
 * Test d'accessibilité : vérifie l'arbre sémantique.
 *
 * @summary accessible aux lecteurs d'écran
 */
export const Accessible: Story = {
  tags: ["!dev", "!autodocs"],
  name: "arbre sémantique accessible",
  render: () => (
    <Empty aria-label="Panneau d'état vide">
      <EmptyTitle>Erreur 404</EmptyTitle>
      <EmptyDescription>
        La page que vous recherchez n'existe pas.
      </EmptyDescription>
    </Empty>
  ),
  play: async ({ canvas }) => {
    const empty = canvas.getByLabelText("Panneau d'état vide");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveClass("flex", "min-w-0", "flex-1");
  },
};