/**
 * EventCalendar.desktop.stories.tsx — moteur @reui, le preset DESKTOP
 * (Phase 2, 05 §4.5.2 Notes responsive) : le miroir des stories mobile,
 * mais en frame desktop 1280px + le `EVENT_CALENDAR_DESKTOP_STYLE`
 * (64px/h time-grid, le "Semaine" 7 jours par défaut, le ScrollArea
 * reui, la i18n FR partagée). La vue "3/5 Jours" disparaît (le preset
 * desktop est [7]), la "Semaine" reste (le desktop a la largeur).
 *
 * Viewport testée = desktop (frame 1280px) — le target Phase 2
 * (`useIsMobile === false`, breakpoint 768px).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  EventCalendar,
  EventCalendarContent,
  EventCalendarNav,
  EventCalendarToolbar,
  EVENT_CALENDAR_DESKTOP_STYLE,
  DESKTOP_EVENT_CALENDAR_DAY_COUNT_PRESETS,
  type CalendarEvent,
} from "../../../index";
import { fr } from "date-fns/locale";
import { addDays, startOfDay, startOfWeek } from "date-fns";

const week = startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 });
const at = (dayOffset: number, hour: number, minute = 0) => {
  const d = addDays(week, dayOffset);
  return new Date(d.setHours(hour, minute, 0, 0));
};

const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Réunion équipe", start: at(0, 9), end: at(0, 10), color: "hsl(var(--aurora-accent-primary-h))" },
  { id: "e2", title: "Focus deep work", start: at(1, 14), end: at(1, 16), color: "hsl(var(--aurora-accent-secondary-h))" },
  { id: "e3", title: "Révision", start: at(2, 8, 30), end: at(2, 9, 30), color: "hsl(var(--aurora-success-h))" },
  { id: "e4", title: "Jalon projet", start: at(3, 0), end: at(4, 0), allDay: true, color: "hsl(var(--aurora-warning-h))" },
  { id: "e5", title: "Sprint review", start: at(4, 15), end: at(4, 16), color: "hsl(var(--aurora-accent-primary-h))" },
];

type Story = StoryObj<typeof EventCalendar>;

const desktopStyle = {
  classNames: EVENT_CALENDAR_DESKTOP_STYLE.classNames,
  i18n: EVENT_CALENDAR_DESKTOP_STYLE.i18n,
  dayCountPresets: [...DESKTOP_EVENT_CALENDAR_DAY_COUNT_PRESETS],
};

function DesktopFrame({
  children,
  height = 640,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div
      style={{ ...EVENT_CALENDAR_DESKTOP_STYLE.style, width: "100%" }}
      className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-lg border border-border bg-background"
    >
      <div style={{ height }} className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/** Le chrome de navigation (la barre prev/today/next + le switcher de
 *  vue) + le content moteur — le même sur toutes les stories. */
function CalChrome() {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border p-3">
        <EventCalendarNav className="min-w-0 flex-1" />
        <EventCalendarToolbar />
      </div>
      <EventCalendarContent />
    </>
  );
}

const meta: Meta<typeof EventCalendar> = {
  title: "Aurora/UI/EventCalendar Desktop (Phase 2)",
  component: EventCalendar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const MoisDesktop: Story = {
  render: () => (
    <DesktopFrame>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="month" locale={fr} weekStartsOn={1} {...desktopStyle}>
        <CalChrome />
      </EventCalendar>
    </DesktopFrame>
  ),
};

export const SemaineDesktop: Story = {
  render: () => (
    <DesktopFrame height={700}>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="week" locale={fr} weekStartsOn={1} {...desktopStyle}>
        <CalChrome />
      </EventCalendar>
    </DesktopFrame>
  ),
};

export const TimeGridDesktop: Story = {
  render: () => (
    <DesktopFrame height={700}>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="week" locale={fr} weekStartsOn={1} dayStartHour={7} dayEndHour={20} {...desktopStyle}>
        <CalChrome />
      </EventCalendar>
    </DesktopFrame>
  ),
};

export const AgendaDesktop: Story = {
  render: () => (
    <DesktopFrame>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="agenda" locale={fr} weekStartsOn={1} {...desktopStyle}>
        <CalChrome />
      </EventCalendar>
    </DesktopFrame>
  ),
};
