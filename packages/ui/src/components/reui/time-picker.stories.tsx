/**
 * TimePicker.stories.tsx — lot 2026-10-12
 * Picker d'heure @reui : pour les formulaires de création de tâche / projet.
 * Viewport = mobile (frame 390px).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  TimePicker,
  TimePickerTrigger,
  TimePickerContent,
  TimePickerColumns,
  TimePickerNow,
  TimePickerClear,
  TimePickerConfirm,
} from "src/index";

type Story = StoryObj<typeof TimePicker>;

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[390px] max-w-full rounded-lg border border-border p-4">
      {children}
    </div>
  );
}

const meta: Meta<typeof TimePicker> = {
  title: "Aurora/UI/TimePicker (@reui)",
  component: TimePicker,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

/** Bare root — draws its own trigger and popover. */
export const Popover: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Heure de la tâche</div>
      <TimePicker>
        <TimePickerTrigger className="w-full" />
        <TimePickerContent>
          <TimePickerColumns />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <TimePickerNow />
            <div className="flex gap-2">
              <TimePickerClear />
              <TimePickerConfirm />
            </div>
          </div>
        </TimePickerContent>
      </TimePicker>
    </MobileFrame>
  ),
};

export const TwelveHourCycle: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">12 h (AM/PM)</div>
      <TimePicker hourCycle={12}>
        <TimePickerTrigger className="w-full" />
        <TimePickerContent>
          <TimePickerColumns />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <TimePickerNow />
            <TimePickerConfirm />
          </div>
        </TimePickerContent>
      </TimePicker>
    </MobileFrame>
  ),
};

export const AlwaysOpen: Story = {
  render: () => (
    <MobileFrame>
      <div className="mb-2 text-sm font-medium">Panels toujours ouverts</div>
      <TimePicker open>
        <TimePickerTrigger className="w-full" />
        <TimePickerContent>
          <TimePickerColumns />
          <TimePickerConfirm />
        </TimePickerContent>
      </TimePicker>
    </MobileFrame>
  ),
};
