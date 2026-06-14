"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { updateCalendarCommitment } from "@/app/app/[organizationSlug]/actions";

type CalendarRecord = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  timeRange: string;
  location?: string | null;
  attendees: number;
  status: string;
  description?: string | null;
};

const views = ["month", "week", "agenda"] as const;
type View = (typeof views)[number];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function tone(type: string) {
  if (type === "MEETING") return "bg-violet-100 text-violet-800";
  if (type === "APPOINTMENT") return "bg-emerald-100 text-emerald-800";
  if (type === "BOOKING") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export function CalendarWorkbench({
  records,
  organizationSlug,
}: {
  records: CalendarRecord[];
  organizationSlug: string;
}) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = records.find((event) => event.id === selectedId) ?? null;
  const activeRecords = useMemo(
    () =>
      records
        .filter((event) => event.status !== "CANCELED")
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
    [records],
  );
  const byDay = useMemo(() => {
    const grouped = new Map<string, CalendarRecord[]>();
    for (const event of activeRecords) {
      const key = dayKey(event.startsAt);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [activeRecords]);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );
  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const rangeLabel =
    view === "month"
      ? cursor.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : view === "week"
        ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "Upcoming schedule";

  const move = (amount: number) => {
    setCursor((current) =>
      view === "month"
        ? addMonths(current, amount)
        : addDays(current, amount * 7),
    );
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_340px]">
      <section className="ck-card min-w-0 overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous date range"
              className="grid size-9 place-items-center rounded-lg border hover:bg-slate-50"
              onClick={() => move(-1)}
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              onClick={() => setCursor(startOfMonth(new Date()))}
              type="button"
            >
              Today
            </button>
            <button
              aria-label="Next date range"
              className="grid size-9 place-items-center rounded-lg border hover:bg-slate-50"
              onClick={() => move(1)}
              type="button"
            >
              <ChevronRight size={16} />
            </button>
            <h2 className="ml-2 text-lg font-semibold">{rangeLabel}</h2>
          </div>
          <div className="flex rounded-lg border bg-slate-50 p-1">
            {views.map((item) => (
              <button
                className={`rounded-md px-3 py-2 text-xs font-semibold capitalize ${
                  view === item ? "bg-white shadow-sm" : "text-slate-500"
                }`}
                key={item}
                onClick={() => setView(item)}
                type="button"
              >
                {item === "agenda" && (
                  <List className="mr-1 inline" size={13} />
                )}
                {item}
              </button>
            ))}
          </div>
        </header>

        {view === "month" && (
          <div>
            <div className="grid grid-cols-7 border-b bg-slate-50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                  key={day}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const events = byDay.get(dayKey(day)) ?? [];
                const inMonth = day.getMonth() === cursor.getMonth();
                const today = dayKey(day) === dayKey(new Date());
                return (
                  <div
                    className={`min-h-32 border-b border-r p-2 ${
                      inMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"
                    }`}
                    key={day.toISOString()}
                  >
                    <div
                      className={`mb-2 grid size-7 place-items-center rounded-full text-xs ${
                        today ? "bg-amber-500 font-bold text-slate-950" : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((event) => (
                        <button
                          className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] font-semibold ${tone(event.type)}`}
                          key={event.id}
                          onClick={() => setSelectedId(event.id)}
                          title={event.title}
                          type="button"
                        >
                          {new Date(event.startsAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}{" "}
                          {event.title}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <button
                          className="text-[10px] font-semibold text-amber-800"
                          onClick={() => setView("agenda")}
                          type="button"
                        >
                          +{events.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="grid min-w-[900px] grid-cols-7">
            {weekDays.map((day) => (
              <div
                className="min-h-[620px] border-r last:border-r-0"
                key={dayKey(day)}
              >
                <div className="sticky top-0 border-b bg-white p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-2 p-2">
                  {(byDay.get(dayKey(day)) ?? []).map((event) => (
                    <button
                      className={`w-full rounded-lg p-3 text-left text-xs ${tone(event.type)}`}
                      key={event.id}
                      onClick={() => setSelectedId(event.id)}
                      type="button"
                    >
                      <strong className="block">{event.title}</strong>
                      <span className="mt-1 block opacity-70">
                        {event.timeRange}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "agenda" && (
          <div className="divide-y">
            {activeRecords.map((event) => (
              <button
                className="grid w-full gap-4 p-5 text-left hover:bg-amber-50/40 sm:grid-cols-[110px_1fr_auto]"
                key={event.id}
                onClick={() => setSelectedId(event.id)}
                type="button"
              >
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400">
                    {new Date(event.startsAt).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {new Date(event.startsAt).getDate()}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(event.startsAt).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong>{event.title}</strong>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(event.type)}`}
                    >
                      {event.type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {event.timeRange} · {event.location || "No location"} ·{" "}
                    {event.attendees} attendee(s)
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-800">
                  Open event
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        {selected ? (
          <section className="ck-card overflow-hidden">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone(selected.type)}`}
                >
                  {selected.type}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{selected.title}</h3>
              </div>
              <button
                aria-label="Close event details"
                className="grid size-8 place-items-center rounded-lg border"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4 p-5 text-sm">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 text-slate-400" size={16} />
                <span>
                  {new Date(selected.startsAt).toLocaleDateString()} ·{" "}
                  {selected.timeRange}
                </span>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 text-slate-400" size={16} />
                <span>{selected.location || "No location"}</span>
              </div>
              <div className="flex gap-3">
                <Users className="mt-0.5 text-slate-400" size={16} />
                <span>{selected.attendees} attendee(s)</span>
              </div>
              {selected.description && (
                <p className="rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                  {selected.description}
                </p>
              )}
            </div>
            <form action={updateCalendarCommitment} className="border-t p-5">
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="entityId" type="hidden" value={selected.id} />
              <label className="text-xs font-semibold">
                Follow-up commitment
                <input
                  className="ck-input mt-2"
                  name="followUp"
                  placeholder="Send recap and next steps"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold">
                Due date
                <input className="ck-input mt-2" name="dueAt" type="date" />
              </label>
              <button
                className="ck-button mt-3 w-full"
                name="command"
                type="submit"
                value="CREATE_FOLLOW_UP"
              >
                Create follow-up task
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="ck-button ck-button-secondary"
                  name="command"
                  type="submit"
                  value="COMPLETE"
                >
                  Complete
                </button>
                <button
                  className="ck-button ck-button-secondary"
                  name="command"
                  type="submit"
                  value="CANCEL"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="ck-card p-6 text-center">
            <CalendarDays className="mx-auto text-amber-700" size={24} />
            <h3 className="mt-4 font-semibold">Select an event</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Open an event to view attendance, location, status, and workflow
              controls.
            </p>
          </section>
        )}
        <section className="ck-card p-5">
          <h3 className="font-semibold">Calendar layers</h3>
          <div className="mt-4 space-y-3 text-xs">
            {[
              ["bg-violet-400", "Meetings"],
              ["bg-emerald-400", "Appointments"],
              ["bg-amber-400", "Customer bookings"],
              ["bg-slate-400", "Internal commitments"],
            ].map(([color, label]) => (
              <div className="flex items-center gap-3" key={label}>
                <span className={`size-2.5 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
