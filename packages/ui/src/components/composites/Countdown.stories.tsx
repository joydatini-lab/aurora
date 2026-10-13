/**
 * Composites — Countdown stories (cat. 2.4).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  CountdownCard,
  CountdownPageHeader,
  type CountdownData,
  type CountdownTab,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Countdown",
  tags: ["autodocs"],
};
export default meta;

const items: CountdownData[] = [
  {
    id: "cd1",
    title: "Lancement Aurora",
    date: "2026-10-20",
    daysUntil: 7,
    status: "upcoming",
    color: "#6366f1",
    subtitle: "Démo devant le board",
    imageUrl: undefined,
  },
  {
    id: "cd2",
    title: "Échéance facture client",
    date: "2026-10-13",
    daysUntil: 0,
    status: "today",
    color: "#f59e0b",
  },
  {
    id: "cd3",
    title: "Fin de préversion interne",
    date: "2026-09-01",
    daysUntil: -42,
    status: "expired",
    color: "#ef4444",
  },
  {
    id: "cd4",
    title: "Mise en prod v2",
    date: "2026-08-15",
    daysUntil: -59,
    status: "completed",
  },
];

export const Cartes: Story = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((d) => (
        <CountdownCard
          key={d.id}
          data={d}
          onOpen={(id) => console.log("open", id)}
          onCreateEvent={(id) => console.log("create-event", id)}
        />
      ))}
    </div>
  ),
};

export const Compactes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {items.map((d) => (
        <CountdownCard key={d.id} data={d} variant="compact" />
      ))}
    </div>
  ),
};

export const EnTete: Story = {
  render: () => {
    const [tab, setTab] = React.useState<CountdownTab>("all");
    return (
      <div className="flex flex-col gap-4">
        <CountdownPageHeader
          count={items.length}
          activeTab={tab}
          onTabChange={setTab}
          onCreate={() => console.log("create")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {(tab === "all" ? items : items.filter((i) => (tab === "upcoming" ? i.status === "upcoming" : i.status === "expired" || i.status === "completed"))).map((d) => (
            <CountdownCard key={d.id} data={d} />
          ))}
        </div>
      </div>
    );
  },
};
