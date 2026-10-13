import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

/**
 * Meta du composant Breadcrumb.
 *
 * Fil d'Ariane de navigation (chemin courant). Le `BreadcrumbPage`
 * (page actuelle) n'est PAS un lien — c'est la position où l'on est,
 * pas une destination. Le `aria-label="breadcrumb"` est porté par le
 * `Breadcrumb` (nav).
 */
const meta = {
  title: "Aurora/UI/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un chemin de navigation (2 niveaux de liens + la page
 * actuelle en `BreadcrumbPage`).
 *
 * @summary fil d'Ariane
 */
export const Defaut: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Accueil</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Bibliothèque</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Démos</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
