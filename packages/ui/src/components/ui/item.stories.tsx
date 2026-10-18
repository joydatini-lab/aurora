import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight } from "lucide-react";

import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemSeparator,
  ItemHeader,
  ItemFooter,
} from "./item";

/**
 * Meta du composant Item.
 *
 * `Item` est un composant compound pour afficher des éléments de liste
 * (ex. éléments de liste, actions, fichiers).
 */
const meta = {
  title: "Aurora/UI/Item",
  component: Item,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "muted"],
    },
    size: {
      control: "select",
      options: ["default", "sm"],
    },
  },
  args: {},
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Item par défaut : titre + description.
 * Utilisé pour les éléments de liste simples.
 *
 * @summary élément de liste par défaut
 */
export const Defaut: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Titre de l'élément</ItemTitle>
          <ItemDescription>
            Description brève de l'élément avec quelques détails supplémentaires.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Item avec média (icône).
 * Utilisé pour les éléments avec un icône ou image.
 *
 * @summary élément avec média
 */
export const AvecMedia: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemMedia variant="icon">
          <ChevronRight className="size-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Action rapide</ItemTitle>
          <ItemDescription>Effectuer une action rapide avec icône.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Item avec séparateur.
 * Utilisé pour séparer les éléments dans une liste.
 *
 * @summary élément avec séparateur
 */
export const AvecSeparateur: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Premier élément</ItemTitle>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>Deuxième élément</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Item complet avec header et footer.
 * Utilisé pour les éléments complexes (ex. fichiers, articles).
 *
 * @summary élément complet avec header/footer
 */
export const Complet: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemHeader>
          <ItemMedia variant="icon">
            <ChevronRight className="size-4" />
          </ItemMedia>
          <ItemTitle>Titre de l'élément</ItemTitle>
        </ItemHeader>
        <ItemContent>
          <ItemDescription>
            Une description plus longue qui peut s'étendre sur plusieurs lignes
            pour fournir des détails complets sur l'élément.
          </ItemDescription>
        </ItemContent>
        <ItemFooter>
          <span>1h</span>
          <ChevronRight className="ml-auto size-4" />
        </ItemFooter>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Variantes d'item : outline et muted.
 *
 * @summary variantes d'item
 */
export const Variantes: Story = {
  render: () => (
    <ItemGroup className="space-y-2">
      <Item variant="default">
        <ItemContent>
          <ItemTitle>Défaut</ItemTitle>
          <ItemDescription>Bordure transparente, fond transparent.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Outline</ItemTitle>
          <ItemDescription>Bordure visible, surbrillance au focus.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>Muted</ItemTitle>
          <ItemDescription>Fond gris clair, état secondaire.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

/**
 * Taille small (sm) pour items compacts.
 *
 * @summary taille small
 */
export const TailleSmall: Story = {
  args: { size: "sm" },
  render: ({ size }) => (
    <ItemGroup>
      <Item size={size}>
        <ItemContent>
          <ItemTitle>Item compact</ItemTitle>
          <ItemDescription>Titre et description en petit.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};