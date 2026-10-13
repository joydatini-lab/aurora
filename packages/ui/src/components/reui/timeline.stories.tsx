/**
 * Timeline.stories.tsx — Frise @reui pour Chrono / projets / rétrospective.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ReuiTimeline,
  ReuiTimelineContent,
  ReuiTimelineDate,
  ReuiTimelineHeader,
  ReuiTimelineIndicator,
  ReuiTimelineItem,
  ReuiTimelineSeparator,
  ReuiTimelineTitle,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Timeline (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

export const Frise: Story = {
  render: function TimelineFrise() {
    return (
      <ReuiTimeline className="max-w-xl mx-auto">
        <ReuiTimelineItem step={1}>
          <ReuiTimelineHeader>
            <ReuiTimelineIndicator />
            <ReuiTimelineTitle>Phase 1 — Analyse</ReuiTimelineTitle>
          </ReuiTimelineHeader>
          <ReuiTimelineDate>Septembre 2026</ReuiTimelineDate>
          <ReuiTimelineContent>
            <p className="text-sm text-muted-foreground">Cadrage, recettes, socle technique.</p>
          </ReuiTimelineContent>
        </ReuiTimelineItem>
        <ReuiTimelineSeparator />
        <ReuiTimelineItem step={2}>
          <ReuiTimelineHeader>
            <ReuiTimelineIndicator />
            <ReuiTimelineTitle>Phase 2 — Conception</ReuiTimelineTitle>
          </ReuiTimelineHeader>
          <ReuiTimelineDate>Octobre 2026</ReuiTimelineDate>
          <ReuiTimelineContent>
            <p className="text-sm text-muted-foreground">Architecture, maquettes UI.</p>
          </ReuiTimelineContent>
        </ReuiTimelineItem>
        <ReuiTimelineSeparator />
        <ReuiTimelineItem step={3}>
          <ReuiTimelineHeader>
            <ReuiTimelineIndicator />
            <ReuiTimelineTitle>Phase 3 — Développement</ReuiTimelineTitle>
          </ReuiTimelineHeader>
          <ReuiTimelineDate>Novembre 2026</ReuiTimelineDate>
          <ReuiTimelineContent>
            <p className="text-sm text-muted-foreground">Sprints backend + frontend.</p>
          </ReuiTimelineContent>
        </ReuiTimelineItem>
      </ReuiTimeline>
    );
  },
};

export const Horizontale: Story = {
  render: function TimelineHorizontale() {
    return (
      <ReuiTimeline orientation="horizontal" className="w-full">
        {[1, 2, 3, 4].map((n) => (
          <ReuiTimelineItem key={n} step={n}>
            <ReuiTimelineHeader>
              <ReuiTimelineIndicator />
              <ReuiTimelineTitle>{`Étape ${n}`}</ReuiTimelineTitle>
            </ReuiTimelineHeader>
          </ReuiTimelineItem>
        ))}
      </ReuiTimeline>
    );
  },
};
