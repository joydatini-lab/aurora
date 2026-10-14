import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { TaskCard, TaskGroup, isTaskPart, type TaskPart } from "../elements/task-card.aui";

const meta = {
  title: "Assistant-UI/task-card",
  component: TaskCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoPart: TaskPart = { type: "tool-call", toolCallId: "1", toolName: "task", args: {}, argsText: "", status: { type: "running" } };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <TaskCard part={demoPart} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <TaskCard part={demoPart} />
      </div>
    </DemoAuiProvider>
  ),
};
