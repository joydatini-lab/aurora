/**
 * Sortable.stories.tsx — Réordonnancement @reui (listes, colonnes, grilles).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "src/index";
import { Card, CardContent } from "src/index";

type Story = StoryObj;

interface Item {
  id: string;
  titre: string;
}

const ITEMS: Item[] = [
  { id: "1", titre: "Sprint 1 — Backend" },
  { id: "2", titre: "Sprint 2 — Frontend" },
  { id: "3", titre: "Tests E2E" },
  { id: "4", titre: "Mise en production" },
];

const meta: Meta = {
  title: "Aurora/UI/Sortable (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Liste: Story = {
  render: function SortableListe() {
    const [items, setItems] = useState(ITEMS);
    return (
      <div className="w-80 p-4">
        <Sortable
          value={items}
          onValueChange={setItems}
          getItemValue={(item) => item.id}
          strategy="vertical"
        >
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <SortableItem key={item.id} value={item.id}>
                <Card>
                  <CardContent className="flex items-center gap-2 p-3">
                    <SortableItemHandle>
                      <span className="text-xs text-muted-foreground">☰</span>
                    </SortableItemHandle>
                    <span className="text-sm">{item.titre}</span>
                  </CardContent>
                </Card>
              </SortableItem>
            ))}
          </div>
        </Sortable>
        <p className="mt-4 text-xs text-muted-foreground">Glisse les cartes pour réordonner les sprints.</p>
      </div>
    );
  },
};
