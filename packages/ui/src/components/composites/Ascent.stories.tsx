/**
 * Composites — Ascent stories (cat. 2.5).
 * Un story par composant principal + variantes.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  AscentCard,
  AscentFeed,
  type AscentCardData,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Ascent",
  tags: ["autodocs"],
};

export default meta;

const card: AscentCardData = {
  id: "c1",
  type: "insight",
  title: "L'évitance de la révision espacée",
  content:
    "Répéter sans espacer crée une illusion de maîtrise. Le rappel à intervalles croissants force la récupération, ce qui est le mécanisme central de la consolidation à long terme.",
  depth: "intermediate",
  estimatedMinutes: 8,
  progress: 40,
  source: { type: "book", name: "Making Memories", url: "#" },
};

export const Carte: Story = {
  render: () => (
    <div className="w-[380px]">
      <AscentCard
        data={card}
        onAction={(a) => console.log("action", a)}
        onOpen={(id) => console.log("open", id)}
      />
    </div>
  ),
};

export const Reflet: Story = {
  render: () => {
    const [val, setVal] = React.useState("");
    return (
      <div className="w-[380px]">
        <AscentCard
          data={{ ...card, type: "reflection", content: "Que retiens-tu de ce que tu viens de voir ?" }}
          reflectionValue={val}
          onReflectionChange={setVal}
        />
      </div>
    );
  },
};

export const Enregistrée: Story = {
  render: () => (
    <div className="w-[380px]">
      <AscentCard
        data={{ ...card, isSaved: true, progress: 100 }}
        onAction={() => {}}
      />
    </div>
  ),
};

export const Flux: Story = {
  render: () => {
    const cards: AscentCardData[] = [
      card,
      { ...card, id: "c2", type: "mental-model", title: "Le modèle du double boucle", content: "Penser en boucles : boucle interne (réaction) et boucle externe (réflexion).", progress: 10, estimatedMinutes: 12 },
      { ...card, id: "c3", type: "checklist", title: "Checklist avant commit", content: "1. Tests verts · 2. Revue de la diff · 3. Message conventionnel · 4. Lien ticket.", depth: "beginner", estimatedMinutes: 4 },
      { ...card, id: "c4", type: "case-study", title: "Étude de cas — refonte du moteur de rendu", content: "Comment la migration de WebComponents à React a réduit le TTI de 38%.", source: { type: "article", name: "Engineering blog" } },
    ];
    return (
      <div className="mx-auto max-w-md">
        <AscentFeed cards={cards} />
      </div>
    );
  },
};

export const FluxVide: Story = {
  render: () => (
    <div className="mx-auto max-w-md">
      <AscentFeed cards={[]} />
    </div>
  ),
};
