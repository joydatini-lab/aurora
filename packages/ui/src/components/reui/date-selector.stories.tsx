/**
 * DateSelector.stories.tsx — lot 2026-10-12
 * Picker de date @reui : pour les formulaires de création de projet / tâche.
 * Viewport = mobile (frame 390px).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DateSelector,
  type DateSelectorValue,
} from "src/index";
import { useState } from "react";

type Story = StoryObj<typeof DateSelector>;

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[390px] max-w-full rounded-lg border border-border p-4">
      {children}
    </div>
  );
}

function InlinePicker() {
  const [value, setValue] = useState<DateSelectorValue | undefined>();
  return (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">
        Date de départ du projet
      </div>
      <DateSelector value={value} onChange={setValue} />
      {value && (
        <pre className="mt-3 rounded bg-muted p-2 text-xs text-muted-foreground">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </MobileFrame>
  );
}

const meta: Meta<typeof DateSelector> = {
  title: "Aurora/UI/DateSelector (@reui)",
  component: DateSelector,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Inline: Story = {
  render: () => <InlinePicker />,
};

export const PresetModeIs: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Date (fixe)</div>
      <DateSelector presetMode="is" showTwoMonths={false} />
    </MobileFrame>
  ),
};

export const PresetModeBetween: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Plage de dates</div>
      <DateSelector presetMode="between" allowRange showTwoMonths={false} />
    </MobileFrame>
  ),
};

export const PeriodDayOnly: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Jour seul</div>
      <DateSelector
        presetMode="is"
        allowRange={false}
        periodTypes={["day"]}
        showTwoMonths={false}
      />
    </MobileFrame>
  ),
};

export const PeriodMonth: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Mois</div>
      <DateSelector
        presetMode="is"
        allowRange={false}
        periodTypes={["month"]}
        showTwoMonths={false}
      />
    </MobileFrame>
  ),
};
