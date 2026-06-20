"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { CalendarDays, Check, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { updateCalendarCommitment } from "@/app/app/[organizationSlug]/actions";
import { QuickCreate } from "@/components/quick-create";

type CalendarRecord = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  timeRange?: string;
  location?: string | null;
  description?: string | null;
  attendees?: number;
  status: string;
  color?: string | null;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarWorkbench({
  organizationSlug,
  records = [],
}: {
  records?: CalendarRecord[];
  organizationSlug: string;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">(
    "month",
  );
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const selected = records.find((event) => event.id === selectedId) ?? null;
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    });
  }, [cursor]);
  const visibleEvents = records.filter((event) =>
    view === "agenda" || isSameMonth(new Date(event.startsAt), cursor),
  );
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      }),
    [cursor],
  );
  const navigate = (direction: -1 | 1) => {
    if (view === "month" || view === "agenda") {
      setCursor((date) =>
        direction === 1 ? addMonths(date, 1) : subMonths(date, 1),
      );
    } else if (view === "week") {
      setCursor((date) =>
        direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1),
      );
    } else {
      setCursor((date) =>
        direction === 1 ? addDays(date, 1) : subDays(date, 1),
      );
    }
  };
  const periodTitle =
    view === "day"
      ? format(cursor, "EEEE, MMMM d, yyyy")
      : view === "week"
        ? `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`
        : format(cursor, "MMMM yyyy");

  return (
    <div className="flex min-h-[680px] flex-col overflow-hidden border bg-white lg:h-[calc(100vh-12rem)]">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <button aria-label="Previous period" className="ck-icon-button" onClick={() => navigate(-1)} type="button">
          <ChevronLeft size={17} />
        </button>
        <button className="ck-button ck-button-secondary" onClick={() => setCursor(new Date())} type="button">Today</button>
        <button aria-label="Next period" className="ck-icon-button" onClick={() => navigate(1)} type="button">
          <ChevronRight size={17} />
        </button>
        <h2 className="ml-2 min-w-44 text-lg font-semibold">{periodTitle}</h2>
        <div className="ml-auto flex items-center border">
          {(["month", "week", "day", "agenda"] as const).map((mode) => (
            <button
              className={`flex h-9 items-center gap-2 border-l px-3 text-sm first:border-l-0 ${view === mode ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
              key={mode}
              onClick={() => setView(mode)}
              type="button"
            >
              {mode === "agenda" ? <List size={15} /> : mode === "month" ? <CalendarDays size={15} /> : null}
              <span className="capitalize">{mode}</span>
            </button>
          ))}
        </div>
        <QuickCreate label="New event" module="calendar" organizationSlug={organizationSlug} />
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-0 overflow-auto border-r">
          {view === "month" ? (
            <div className="grid min-h-full grid-cols-7 grid-rows-[36px_repeat(6,minmax(96px,1fr))]">
              {weekdayLabels.map((label) => (
                <div className="border-b border-r px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-500" key={label}>{label}</div>
              ))}
              {monthDays.map((day) => {
                const events = records.filter((event) => isSameDay(new Date(event.startsAt), day));
                return (
                  <div className={`min-w-0 border-b border-r p-2 ${isSameMonth(day, cursor) ? "bg-white" : "bg-slate-50 text-slate-400"}`} key={day.toISOString()}>
                    <div className="text-xs font-semibold">{format(day, "d")}</div>
                    <div className="mt-1 space-y-1">
                      {events.slice(0, 4).map((event) => (
                        <button className={`block w-full truncate border-l-2 px-2 py-1 text-left text-xs hover:bg-slate-100 ${selectedId === event.id ? "bg-slate-100 font-semibold" : ""}`} key={event.id} onClick={() => setSelectedId(event.id)} style={{ borderColor: event.color ?? "#5b5fcf" }} type="button">
                          {format(new Date(event.startsAt), "p")} {event.title}
                        </button>
                      ))}
                      {events.length > 4 && <div className="px-2 text-[11px] text-slate-500">+{events.length - 4} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : view === "week" ? (
            <div className="grid min-h-full grid-cols-7">
              {weekDays.map((day) => {
                const events = records.filter((event) =>
                  isSameDay(new Date(event.startsAt), day),
                );
                return (
                  <div className="min-w-0 border-r" key={day.toISOString()}>
                    <div className="border-b px-3 py-3 text-center">
                      <div className="text-[11px] font-semibold uppercase text-slate-500">
                        {format(day, "EEE")}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="divide-y">
                      {events.map((event) => (
                        <button
                          className={`block w-full border-l-4 px-3 py-3 text-left hover:bg-slate-50 ${selectedId === event.id ? "bg-slate-50" : ""}`}
                          key={event.id}
                          onClick={() => setSelectedId(event.id)}
                          style={{ borderColor: event.color ?? "#5b5fcf" }}
                          type="button"
                        >
                          <span className="block text-[11px] text-slate-500">
                            {format(new Date(event.startsAt), "p")}
                          </span>
                          <strong className="mt-1 block text-sm">
                            {event.title}
                          </strong>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {event.location ?? "No location"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : view === "day" ? (
            <div className="divide-y">
              {records
                .filter((event) =>
                  isSameDay(new Date(event.startsAt), cursor),
                )
                .map((event) => (
                  <button
                    className={`grid w-full grid-cols-[120px_1fr_auto] items-center gap-4 border-l-4 px-5 py-5 text-left hover:bg-slate-50 ${selectedId === event.id ? "bg-slate-50" : ""}`}
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                    style={{ borderColor: event.color ?? "#5b5fcf" }}
                    type="button"
                  >
                    <span className="font-semibold">
                      {format(new Date(event.startsAt), "p")}
                    </span>
                    <span>
                      <strong className="block">{event.title}</strong>
                      <span className="text-xs text-slate-500">
                        {event.location ?? "No location"}
                      </span>
                    </span>
                    <span className="text-xs uppercase text-slate-500">
                      {event.status}
                    </span>
                  </button>
                ))}
            </div>
          ) : (
            <div className="divide-y">
              {visibleEvents.map((event) => (
                <button className={`grid w-full grid-cols-[120px_1fr_auto] items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 ${selectedId === event.id ? "bg-slate-50" : ""}`} key={event.id} onClick={() => setSelectedId(event.id)} type="button">
                  <span className="text-sm font-semibold">{format(new Date(event.startsAt), "MMM d, p")}</span>
                  <span><strong className="block">{event.title}</strong><span className="text-xs text-slate-500">{event.location ?? "No location"}</span></span>
                  <span className="text-xs uppercase text-slate-500">{event.status}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto bg-slate-50 p-5">
          {selected ? (
            <>
              <div className="text-xs font-semibold uppercase text-slate-500">{selected.type}</div>
              <h3 className="mt-2 text-xl font-semibold">{selected.title}</h3>
              <dl className="mt-5 divide-y border-y text-sm">
                <div className="grid grid-cols-[90px_1fr] py-3"><dt className="text-slate-500">When</dt><dd>{format(new Date(selected.startsAt), "PPp")}</dd></div>
                <div className="grid grid-cols-[90px_1fr] py-3"><dt className="text-slate-500">Ends</dt><dd>{format(new Date(selected.endsAt), "PPp")}</dd></div>
                <div className="grid grid-cols-[90px_1fr] py-3"><dt className="text-slate-500">Location</dt><dd>{selected.location ?? "Not set"}</dd></div>
                <div className="grid grid-cols-[90px_1fr] py-3"><dt className="text-slate-500">Attendees</dt><dd>{selected.attendees ?? 0}</dd></div>
              </dl>
              {selected.description && <p className="mt-4 text-sm leading-6 text-slate-600">{selected.description}</p>}
              <form action={updateCalendarCommitment} className="mt-6 space-y-3">
                <input name="organizationSlug" type="hidden" value={organizationSlug} />
                <input name="entityId" type="hidden" value={selected.id} />
                <label className="block text-xs font-semibold text-slate-600">Follow-up task<input className="ck-input mt-2" name="followUp" placeholder="Send recap, prepare quote..." /></label>
                <label className="block text-xs font-semibold text-slate-600">Due date<input className="ck-input mt-2" name="dueAt" type="date" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="ck-button" name="command" type="submit" value="CREATE_FOLLOW_UP">Create task</button>
                  <button className="ck-button ck-button-secondary" name="command" type="submit" value="COMPLETE"><Check size={14} /> Complete</button>
                  <button className="ck-button ck-button-secondary col-span-2" name="command" type="submit" value="CANCEL"><X size={14} /> Cancel event</button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-slate-500">Select an event to inspect and act on it.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
