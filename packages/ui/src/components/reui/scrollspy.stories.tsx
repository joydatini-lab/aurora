/**
 * Scrollspy.stories.tsx — Navigation @reui pour le mode miroir / doc.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Scrollspy } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Scrollspy (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Navigation: Story = {
  render: function ScrollspyNav() {
    return (
      <div className="flex gap-4 p-4">
        <nav className="w-48 space-y-1 rounded-lg border border-border p-3">
          <Scrollspy>
            <a href="#section-1" data-scrollspy-anchor="section-1" className="block rounded px-2 py-1 text-sm data-[active=true]:bg-muted data-[active=true]:font-medium">Section 1</a>
            <a href="#section-2" data-scrollspy-anchor="section-2" className="block rounded px-2 py-1 text-sm data-[active=true]:bg-muted data-[active=true]:font-medium">Section 2</a>
            <a href="#section-3" data-scrollspy-anchor="section-3" className="block rounded px-2 py-1 text-sm data-[active=true]:bg-muted data-[active=true]:font-medium">Section 3</a>
          </Scrollspy>
        </nav>
        <div className="flex-1 space-y-8 py-4">
          <section id="section-1" data-scrollspy className="rounded-lg border border-border p-4 text-sm">Contenu section 1 — fait défiler.</section>
          <section id="section-2" data-scrollspy className="h-96 rounded-lg border border-border p-4 text-sm">Contenu section 2.</section>
          <section id="section-3" data-scrollspy className="h-96 rounded-lg border border-border p-4 text-sm">Contenu section 3.</section>
        </div>
      </div>
    );
  },
};
