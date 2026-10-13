/**
 * Timer.stories.tsx — Pomodoro / Chronomètre (cat. 2.1 Focus).
 * `useTimer` utilise `Date.now()` pour éviter la dérive en arrière-plan.
 */
import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  TimerDisplay,
  TimerControls,
  useTimer,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Timer",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

function PomodoroStory() {
  const timer = useTimer(25 * 60, "countdown"); // 25 min
  const phases = ["Focus", "Pause courte", "Pause longue"];
  const phaseIndex = timer.isDone ? 0 : Math.floor((25 * 60 - timer.seconds) / 600) % 3;
  const currentPhase = timer.isDone ? "Terminé" : phases[phaseIndex] ?? "Focus";
  return (
    <div className="flex flex-col items-center gap-6">
      <TimerDisplay
        seconds={timer.seconds}
        totalSeconds={25 * 60}
        phaseLabel={currentPhase}
      />
      <TimerControls
        isRunning={timer.isRunning}
        isPaused={timer.isPaused}
        isDone={timer.isDone}
        onPlay={timer.start}
        onPause={timer.pause}
        onReset={timer.reset}
        onFinish={timer.stop}
      />
    </div>
  );
}

function CountUpStory() {
  const timer = useTimer(0, "countup");
  return (
    <div className="flex flex-col items-center gap-6">
      <TimerDisplay seconds={timer.seconds} mode="countup" />
      <TimerControls
        isRunning={timer.isRunning}
        isPaused={timer.isPaused}
        onPlay={timer.start}
        onPause={timer.pause}
        onReset={timer.stop}
      />
    </div>
  );
}

export const Pomodoro: Story = {
  render: PomodoroStory,
};

export const Chronometre: Story = {
  render: CountUpStory,
};
