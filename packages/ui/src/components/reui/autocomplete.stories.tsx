/**
 * Autocomplete.stories.tsx — Champ @reui pour capture / inbox / recherche.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteContent,
  AutocompleteList,
  AutocompleteItem,
} from "src/index";
import { Search } from "lucide-react";

type Story = StoryObj;

const OPTIONS = [
  "Créer un objectif",
  "Nouvelle tâche",
  "Ajouter au calendrier",
  "Démarrer une session de focus",
  "Ouvrir les compétences",
  "Générer un rapport",
];

const meta: Meta = {
  title: "Aurora/UI/Autocomplete (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Recherche: Story = {
  render: function AutocompleteRecherche() {
    const [query, setQuery] = useState("");
    const filtered = OPTIONS.filter((o) =>
      o.toLowerCase().includes(query.toLowerCase())
    );
    return (
      <div className="w-72">
        <Autocomplete value={query} onValueChange={setQuery}>
          <AutocompleteInput
            size="default"
            placeholder="Rechercher une action…"
            showClear
          />
          {filtered.length > 0 && (
            <AutocompleteContent>
              <AutocompleteList>
                {filtered.map((option) => (
                  <AutocompleteItem key={option} value={option}>
                    <Search className="size-4" />
                    {option}
                  </AutocompleteItem>
                ))}
              </AutocompleteList>
            </AutocompleteContent>
          )}
        </Autocomplete>
      </div>
    );
  },
};
