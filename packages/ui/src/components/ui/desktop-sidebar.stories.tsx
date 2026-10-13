/**
 * desktop-sidebar.stories.tsx — le SHELL desktop de la Phase 2
 * (@21st wensity Sidebar, ré-adapté Radix, 05 §4.5.2 Notes responsive) :
 * les 5 variantes (default / collapsible / icon-rail / floating /
 * resizable) en frame desktop 1280px (pas 390px mobile). Le mouvement
 * (le pill active spring, le collapse 240ms, les labels fade) est
 * gated par `useReducedMotion` (05 §2.6 règle 2).
 */
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  DesktopSidebar,
  DesktopSidebarFooter,
  DesktopSidebarHeader,
  DesktopSidebarItem,
  DesktopSidebarNav,
  DesktopSidebarSection,
  DesktopSidebarToggle,
  useDesktopSidebar,
} from "src/index"
import {
  Calendar,
  House,
  Settings,
  ListChecks,
  Users,
} from "lucide-react"
import * as React from "react"

function DesktopFrame({
  children,
  height = 480,
}: {
  children: React.ReactNode
  height?: number
}) {
  return (
    <div
      style={{ height }}
      className="mx-auto flex w-full max-w-[1280px] overflow-hidden rounded-lg border border-border bg-background"
    >
      {children}
      <div className="flex min-w-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Contenu de la vue (le dashboard, l'analytics, le kanban…)
      </div>
    </div>
  )
}

function WorkspaceMark() {
  const { collapsed } = useDesktopSidebar()
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-primary text-[12px] font-bold text-primary-foreground">
        A
      </div>
      {!collapsed && (
        <span className="truncate text-[13.5px] font-semibold leading-none">
          Aurora
        </span>
      )}
    </div>
  )
}

function UserFooter() {
  const { collapsed } = useDesktopSidebar()
  return (
    <>
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
        JS
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium leading-tight">
            J. Smith
          </div>
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            j.smith@example.com
          </div>
        </div>
      )}
    </>
  )
}

function NavItems({ active }: { active: string }) {
  const items = [
    { id: "home", label: "Accueil", icon: <House className="size-[18px]" strokeWidth={1.75} /> },
    { id: "calendar", label: "Calendrier", icon: <Calendar className="size-[18px]" strokeWidth={1.75} /> },
    { id: "tasks", label: "Tâches", icon: <ListChecks className="size-[18px]" strokeWidth={1.75} />, badge: "12" },
    { id: "projects", label: "Projets", icon: <Users className="size-[18px]" strokeWidth={1.75} /> },
  ]
  return (
    <DesktopSidebarNav>
      <DesktopSidebarSection label="Navigation">
        {items.map((item) => (
          <DesktopSidebarItem
            key={item.id}
            icon={item.icon}
            active={active === item.id}
            badge={item.badge ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium leading-none text-muted-foreground tabular-nums">
                {item.badge}
              </span>
            ) : undefined}
          >
            {item.label}
          </DesktopSidebarItem>
        ))}
      </DesktopSidebarSection>
      <DesktopSidebarSection label="Système">
        <DesktopSidebarItem
          icon={<Settings className="size-[18px]" strokeWidth={1.75} />}
          active={active === "settings"}
        >
          Paramètres
        </DesktopSidebarItem>
      </DesktopSidebarSection>
    </DesktopSidebarNav>
  )
}

const meta: Meta<typeof DesktopSidebar> = {
  title: "Aurora/UI/Desktop Shell (Phase 2)",
  component: DesktopSidebar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
}
export default meta

type Story = StoryObj<typeof DesktopSidebar>

export const Default: Story = {
  render: () => (
    <DesktopFrame>
      <DesktopSidebar aria-label="Navigation principale">
        <DesktopSidebarHeader>
          <WorkspaceMark />
        </DesktopSidebarHeader>
        <NavItems active="home" />
        <DesktopSidebarFooter>
          <UserFooter />
        </DesktopSidebarFooter>
      </DesktopSidebar>
    </DesktopFrame>
  ),
}

export const Collapsible: Story = {
  render: () => {
    const [active, setActive] = React.useState("calendar")
    return (
      <DesktopFrame>
        <DesktopSidebar variant="collapsible" width={228} aria-label="Navigation principale">
          <DesktopSidebarHeader>
            <WorkspaceMark />
            <DesktopSidebarToggle className="ml-auto" />
          </DesktopSidebarHeader>
          <DesktopSidebarNav>
            <DesktopSidebarSection label="Navigation">
              {[
                { id: "home", label: "Accueil", icon: <House className="size-[18px]" strokeWidth={1.75} /> },
                { id: "calendar", label: "Calendrier", icon: <Calendar className="size-[18px]" strokeWidth={1.75} /> },
                { id: "tasks", label: "Tâches", icon: <ListChecks className="size-[18px]" strokeWidth={1.75} /> },
              ].map((item) => (
                <DesktopSidebarItem
                  key={item.id}
                  icon={item.icon}
                  active={active === item.id}
                  onClick={() => setActive(item.id)}
                >
                  {item.label}
                </DesktopSidebarItem>
              ))}
            </DesktopSidebarSection>
          </DesktopSidebarNav>
          <DesktopSidebarFooter>
            <UserFooter />
          </DesktopSidebarFooter>
        </DesktopSidebar>
      </DesktopFrame>
    )
  },
}

export const IconRail: Story = {
  render: () => (
    <DesktopFrame>
      <DesktopSidebar variant="icon-rail" width={228} aria-label="Navigation principale">
        <DesktopSidebarHeader>
          <WorkspaceMark />
        </DesktopSidebarHeader>
        <NavItems active="tasks" />
        <DesktopSidebarFooter>
          <UserFooter />
        </DesktopSidebarFooter>
      </DesktopSidebar>
    </DesktopFrame>
  ),
}

export const Floating: Story = {
  render: () => (
    <DesktopFrame>
      <DesktopSidebar variant="floating" width={240} aria-label="Navigation principale">
        <DesktopSidebarHeader>
          <WorkspaceMark />
        </DesktopSidebarHeader>
        <NavItems active="home" />
        <DesktopSidebarFooter>
          <UserFooter />
        </DesktopSidebarFooter>
      </DesktopSidebar>
    </DesktopFrame>
  ),
}

export const Resizable: Story = {
  render: () => (
    <DesktopFrame>
      <DesktopSidebar variant="resizable" width={280} aria-label="Navigation principale">
        <DesktopSidebarHeader>
          <WorkspaceMark />
        </DesktopSidebarHeader>
        <NavItems active="projects" />
        <DesktopSidebarFooter>
          <UserFooter />
        </DesktopSidebarFooter>
      </DesktopSidebar>
    </DesktopFrame>
  ),
}
