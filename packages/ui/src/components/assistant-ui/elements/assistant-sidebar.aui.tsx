import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "src/components/ui/resizable";
import type { FC, PropsWithChildren } from "react";

import { Thread } from "src/components/assistant-ui/elements/thread.aui";

export const AssistantSidebar: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel>{children}</ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Thread />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
