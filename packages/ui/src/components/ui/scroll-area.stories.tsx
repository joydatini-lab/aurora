import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ScrollArea,
} from "./scroll-area";

/**
 * Meta du composant ScrollArea (Radix ScrollArea).
 *
 * Zone de défilement avec scrollbar stylisée. Pour une zone de défilement
 * standard (sans scrollbar custom), utiliser un `overflow-auto` natif —
 * le ScrollArea est réservé au besoin d'une scrollbar fine/thématisée.
 */
const meta = {
  title: "Aurora/UI/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : zone de défilement verticale (contenu plus haut que la
 * viewport). La scrollbar stylisée apparaît à droite.
 *
 * @summary défilement vertical
 */
export const Defaut: Story = {
  render: () => (
    <div className="w-64">
      <ScrollArea className="h-48 w-full rounded-md border p-4">
        <div className="space-y-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="rounded bg-muted p-2 text-sm">
              Ligne {i + 1} de contenu défilant.
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};

/**
 * Défilement horizontal : les lignes s'étalent au-delà de la largeur
 * du conteneur (tableau élargi, timeline).
 *
 * @summary défilement horizontal
 */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="h-32 w-full rounded-md border p-4">
      <div className="flex gap-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-16 shrink-0 rounded bg-muted p-1 text-xs"
          >
            Colonne {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
