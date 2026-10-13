import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Calendar,
  CheckSquare,
  Settings,
  Timer,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

/**
 * Meta du composant Sidebar (provider contextuel + cookie state).
 *
 * La sidebar est **contextuelle** : elle exige `SidebarProvider`
 * (qui gère l'état `expanded`/`collapsed` + la persistance cookie
 * `sidebar_state` sur 7 jours). Sur mobile (< 768px), elle devient
 * un `Sheet` (panneau coulissant) — géré par le provider, pas par le
 * composant.
 *
 * Les sous-composants (`SidebarMenu`, `SidebarMenuButton`, etc.)
 * héritent tous du contexte ; les appeler hors provider lève une
 * erreur (par conception, pour éviter un état fantôme).
 */
const meta = {
  title: "Aurora/UI/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : une sidebar de navigation (sections + items + footer).
 * Le bouton `SidebarTrigger` (dans la page, pas ici) bascule
 * `expanded`/`collapsed` ; le raccourci clavier `⌘B` est géré par
 * le provider.
 *
 * @summary navigation latérale
 */
export const Defaut: Story = {
  render: function DefautRender() {
    const [open, setOpen] = useState(true);
    return (
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <div className="flex h-[400px] border">
          <Sidebar side="left" variant="inset">
            <SidebarHeader>
              <div className="text-sm font-medium">Aurora</div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <Calendar />
                          <span>Calendrier</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <Timer />
                          <span>Focus</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <CheckSquare />
                          <span>Tâches</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Réglages</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <Settings />
                          <span>Général</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="text-xs text-muted-foreground">v0.0.0</div>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 p-4">
            <SidebarTrigger />
            <p className="mt-2 text-sm text-muted-foreground">
              Le contenu principal occupe l'espace restant ; la sidebar
              s'insère (`variant="inset"`) ou se superpose
              (`variant="overlay"`).
            </p>
          </div>
        </div>
      </SidebarProvider>
    );
  },
};

/**
 * Sidebar repliée (`collapsed`) : les icônes seules (largeur 3rem),
 * les libellés masqués. Le `SidebarTrigger` restaure l'expansion.
 *
 * @summary sidebar icon-only
 */
export const Replee: Story = {
  render: function RepleeRender() {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-[400px] border">
          <Sidebar side="left" variant="inset">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <Calendar />
                          <span>Calendrier</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#">
                          <Timer />
                          <span>Focus</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <div className="flex-1 p-4">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarProvider>
    );
  },
};
