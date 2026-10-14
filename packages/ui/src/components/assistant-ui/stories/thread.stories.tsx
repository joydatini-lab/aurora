import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Thread,
  type ThreadComponents,
  type ThreadProps,
} from "../elements/thread.aui";
import { DemoAuiProvider } from "../demo/demo-aui-provider";

const mobileThreadComponents: Partial<ThreadComponents> = {
  Message: () => null,
} as Partial<ThreadComponents>;

const meta = {
  title: "Assistant-UI/Thread",
  component: Thread,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Fil de conversation complet (messages + composer + suggestions + outils). " +
          "Story mobile = largeur restreinte (375px) ; story desktop = vue pleine largeur.",
      },
    },
  },
} satisfies Meta<typeof Thread>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: (args) => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <Thread {...args} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <Thread  />
      </div>
    </DemoAuiProvider>
  ),
};
