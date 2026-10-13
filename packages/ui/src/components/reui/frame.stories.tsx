/**
 * Frame.stories.tsx — Panneaux « tool-like » @reui pour les cartes de données.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Frame,
  FramePanel,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameFooter,
} from "src/index";
import { Button, ReuiBadge } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Frame (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

export const KpiCard: Story = {
  render: function FrameKpi() {
    return (
      <div className="mx-auto max-w-sm">
        <Frame variant="default" spacing="sm">
          <FramePanel>
            <FrameHeader>
              <FrameTitle>Focus aujourd'hui</FrameTitle>
              <FrameDescription>Temps de concentration</FrameDescription>
            </FrameHeader>
            <div className="text-3xl font-medium tabular-nums">2h 45min</div>
            <FrameFooter>
              <ReuiBadge variant="success-light" size="sm">+12%</ReuiBadge>
            </FrameFooter>
          </FramePanel>
        </Frame>
      </div>
    );
  },
};

export const Stacked: Story = {
  render: function FrameStacked() {
    return (
      <div className="mx-auto max-w-md">
        <Frame variant="ghost" spacing="sm" stacked>
          <FramePanel>
            <FrameHeader>
              <FrameTitle>Chemin critique</FrameTitle>
            </FrameHeader>
            <div className="text-sm text-muted-foreground">
              Les tâches en danger sont en rouge.
            </div>
            <FrameFooter>
              <Button variant="outline" size="sm">Voir le Gantt</Button>
            </FrameFooter>
          </FramePanel>
          <FramePanel>
            <FrameHeader>
              <FrameTitle>Jalons</FrameTitle>
            </FrameHeader>
            <div className="text-sm text-muted-foreground">
              3 jalons sur 7 atteints.
            </div>
            <FrameFooter>
              <Button variant="ghost" size="sm">Modifier</Button>
            </FrameFooter>
          </FramePanel>
        </Frame>
      </div>
    );
  },
};

export const Dense: Story = {
  render: function FrameDense() {
    return (
      <div className="mx-auto max-w-sm">
        <Frame variant="ghost" spacing="sm" dense>
          <FramePanel fit>
            <div className="flex items-center justify-between text-sm">
              <span>Habitude — Sport</span>
              <ReuiBadge variant="info-light" size="xs">3/7</ReuiBadge>
            </div>
          </FramePanel>
        </Frame>
      </div>
    );
  },
};
