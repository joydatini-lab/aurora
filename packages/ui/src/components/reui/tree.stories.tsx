/**
 * Tree.stories.tsx — Arbre @reui pour WBS / connaissances / WBS.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tree, TreeItem } from "src/index";
import { Button } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Tree (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Wbs: Story = {
  render: function TreeWbs() {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["ph1"]));
    const toggle = (id: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    };

    const nodes = [
      { id: "ph1", label: "Phase 1 — Analyse", children: [
        { id: "ph1-t1", label: "Cadrage", progress: 100 },
        { id: "ph1-t2", label: "Recettes", progress: 100 },
      ]},
      { id: "ph2", label: "Phase 2 — Conception", children: [
        { id: "ph2-t1", label: "Architecture", progress: 80 },
        { id: "ph2-t2", label: "Maquettes UI", progress: 45 },
      ]},
    ];

    return (
      <div className="w-96 rounded-lg border border-border p-4">
        <div className="mb-2 text-sm font-medium">Arborescence du projet</div>
        <Tree>
          {nodes.map((node) => (
            <div key={node.id} className="flex flex-col">
              <div className="flex items-center gap-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0"
                  onClick={() => toggle(node.id)}
                >
                  {expanded.has(node.id) ? "▾" : "▸"}
                </Button>
                <span className="text-sm font-medium">{node.label}</span>
              </div>
              {expanded.has(node.id) && (
                <div className="ml-6">
                  {node.children?.map((child: { id: string; label: string; progress: number }) => (
                    <div key={child.id} className="flex items-center justify-between py-1 text-sm">
                      <span>{child.label}</span>
                      <span className="text-xs text-muted-foreground">{child.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Tree>
      </div>
    );
  },
};
