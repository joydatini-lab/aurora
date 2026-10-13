/**
 * Filters.stories.tsx — Moteur @reui pour les filtres de DataGrid / Gantt.
 * Arbre de requête imbriqué (ET / OU) avec règles par champ.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Filters,
  FiltersRow,
  FiltersBuilder,
  createFilterQuery,
  type FiltersProps,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Filters (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const FiltresGantt: Story = {
  render: function FiltersGantt() {
    const [query, setQuery] = useState(() => createFilterQuery());
    const fields = [
      { id: "statut", name: "Statut", type: "select" as const, options: ["À faire", "En cours", "Terminé"] },
      { id: "priorite", name: "Priorité", type: "select" as const, options: ["Haute", "Moyenne", "Basse"] },
      { id: "echeance", name: "Échéance", type: "date" as const },
    ];
    return (
      <div className="p-4">
        <Filters
          variant="basic"
          fields={fields as never}
          query={query}
          onQueryChange={setQuery}
        >
          <FiltersRow trigger={<span className="text-sm text-muted-foreground">Modifier les filtres</span>} />
        </Filters>
        <pre className="mt-4 rounded bg-muted p-3 text-xs overflow-auto">{JSON.stringify(query, null, 2)}</pre>
      </div>
    );
  },
};

export const FiltresAvances: Story = {
  render: function FiltersAvances() {
    const [query, setQuery] = useState(() => createFilterQuery());
    const fields = [
      { id: "module", name: "Module", type: "text" as const },
      { id: "date_creation", name: "Créé le", type: "date" as const },
      { id: "progres", name: "Progression %", type: "number" as const },
    ];
    return (
      <div className="p-4">
        <Filters
          variant="advanced"
          fields={fields as never}
          query={query}
          onQueryChange={setQuery}
        />
      </div>
    );
  },
};
