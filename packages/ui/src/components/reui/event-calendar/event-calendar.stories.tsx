/**
 * EventCalendar.stories.tsx — moteur @reui (lot 2026-10-12) :
 * chaque VUE dans son story (Mois / Semaine / 5 Jours / 3 Jours / Jour /
 * Agenda / Time-grid), le preset MOBILE (`EVENT_CALENDAR_MOBILE_STYLE`)
 * passé partout (touch targets 44px + i18n FR FROZEN + `--ec-hour-height`).
 *
 * Viewport testée = mobile (frame 390px) — notre cible (AD-7/AD-13,
 * `apps/mobile` Ionic).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  EventCalendar,
  EventCalendarContent,
  EventCalendarNav,
  EventCalendarToolbar,
  EVENT_CALENDAR_MOBILE_STYLE,
  MOBILE_EVENT_CALENDAR_DAY_COUNT_PRESETS,
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
];

type Story = StoryObj<typeof EventCalendar>;

const mobileStyle = {
  classNames: EVENT_CALENDAR_MOBILE_STYLE.classNames,
  i18n: EVENT_CALENDAR_MOBILE_STYLE.i18n,
  dayCountPresets: [...MOBILE_EVENT_CALENDAR_DAY_COUNT_PRESETS],
};

function MobileFrame({ children, height = "60vh" }: { children: React.ReactNode; height?: string }) {
  return (
    <div
      style={{ ...EVENT_CALENDAR_MOBILE_STYLE.style, width: "100%" }}
      className="mx-auto w-[390px] max-w-full overflow-hidden rounded-lg border border-border"
    >
      <div style={{ height }} className="overflow-hidden">{children}</div>
    </div>
  );
}

/** Le chrome de navigation (la barre prev/today/next + le switcher de vue)
 *  + le content moteur — le même sur toutes les stories. */
function CalChrome() {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border p-2">
        <EventCalendarNav className="min-w-0 flex-1" />
        <EventCalendarToolbar />
      </div>
      <EventCalendarContent />
    </>
  );
}

const meta: Meta<typeof EventCalendar> = {
  title: "Aurora/UI/EventCalendar (moteur @reui)",
  component: EventCalendar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Mois: Story = {
  render: () => (
    <MobileFrame>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="month" locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const Semaine: Story = {
  render: () => (
    <MobileFrame height="70vh">
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="week" locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const CinqJours: Story = {
  render: () => (
    <MobileFrame height="70vh">
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="days" dayCount={5} locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const TroisJours: Story = {
  render: () => (
    <MobileFrame height="70vh">
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="days" dayCount={3} locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const Jour: Story = {
  render: () => (
    <MobileFrame height="70vh">
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="day" locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const Agenda: Story = {
  render: () => (
    <MobileFrame>
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="agenda" locale={fr} weekStartsOn={1} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};

export const TimeGrid: Story = {
  render: () => (
    <MobileFrame height="70vh">
      <EventCalendar defaultEvents={SAMPLE_EVENTS} defaultView="week" locale={fr} weekStartsOn={1} dayStartHour={7} dayEndHour={20} {...mobileStyle}>
        <CalChrome />
      </EventCalendar>
    </MobileFrame>
  ),
};
