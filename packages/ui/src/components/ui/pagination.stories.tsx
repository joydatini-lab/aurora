import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

/**
 * Meta du composant Pagination.
 *
 * Navigation entre pages d'une liste paginée. Le `Pagination` est le
 * conteneur `nav[role="navigation"][aria-label="pagination"]` ; les
 * liens sont des `PaginationLink` (variante `isActive` marque la page
 * courante, rendue en `outline`). `Previous`/`Next` portent les
 * flèches `lucide`.
 *
 * Pour une liste infinie (pas de pagination), ne pas utiliser
 * ce composant — utiliser un `ScrollArea` + chargement à la volée.
 */
const meta = {
  title: "Aurora/UI/Pagination",
  component: Pagination,
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : pagination complète (Précédent · 1 2 3 … 8 · Suivant).
 * La page courante (2) est en `isActive` (variant `outline`).
 *
 * @summary navigation entre pages
 */
export const Defaut: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Page précédente</span>
          </PaginationPrevious>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">8</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext>
            <span className="sr-only">Page suivante</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * Pagination compacte (1 … 8 + Suivant) : pour les écrans étroits où
 * les pages intermédiaires ne tiennent pas.
 *
 * @summary navigation compacte
 */
export const Compact: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">8</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext>
            <span className="sr-only">Page suivante</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
