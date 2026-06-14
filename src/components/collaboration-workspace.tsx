"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  createCollaborationChannel,
  sendCollaborationMessage,
} from "@/app/app/[organizationSlug]/actions";

type Value = Record<string, unknown>;

export function CollaborationWorkspace({
  channels,
  calendar,
  organizationSlug,
}: {
  channels: Value[];
  calendar: Value[];
  organizationSlug: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(
    channels[0] ? String(channels[0].id) : null,
  );
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailTab, setDetailTab] = useState<"about" | "meetings">("about");
  const filtered = useMemo(
    () =>
      channels.filter((channel) =>
        `${String(channel.name)} ${String(channel.description ?? "")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [channels, query],
  );
  const active =
    channels.find((channel) => String(channel.id) === activeId) ??
    filtered[0] ??
    null;
  const messages = (active?.messages as Value[] | undefined) ?? [];

  return (
    <section className="ck-card min-h-[720px] overflow-hidden">
      <div className="grid min-h-[720px] lg:grid-cols-[270px_1fr] 2xl:grid-cols-[270px_1fr_310px]">
        <aside className="border-r bg-[#f8f5ef]">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Collaboration
                </div>
                <h2 className="mt-1 font-semibold">Spaces</h2>
              </div>
              <button
                aria-label="Create workspace"
                className="grid size-9 place-items-center rounded-lg bg-slate-900 text-white"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                <Plus size={16} />
              </button>
            </div>
            <label className="relative mt-4 block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                className="ck-input !pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search spaces"
                value={query}
              />
            </label>
          </div>
          <nav className="max-h-[630px] overflow-y-auto p-2">
            {filtered.map((channel) => {
              const selected = String(channel.id) === String(active?.id);
              const channelMessages =
                (channel.messages as Value[] | undefined) ?? [];
              const last = channelMessages.at(-1);
              return (
                <button
                  className={`mb-1 w-full rounded-lg p-3 text-left transition ${
                    selected ? "bg-white shadow-sm" : "hover:bg-white/70"
                  }`}
                  key={String(channel.id)}
                  onClick={() => setActiveId(String(channel.id))}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {channel.type === "CUSTOMER" ? (
                        <Users className="shrink-0 text-amber-700" size={15} />
                      ) : (
                        <Hash className="shrink-0 text-slate-400" size={15} />
                      )}
                      <strong className="truncate text-sm">
                        {String(channel.name)}
                      </strong>
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400">
                      {String(channel.type)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[11px] text-slate-500">
                    {last ? String(last.body) : "No messages yet"}
                  </p>
                </button>
              );
            })}
            {!filtered.length && (
              <div className="p-6 text-center text-xs text-slate-500">
                No spaces match your search.
              </div>
            )}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-col">
          {active ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-amber-700" size={17} />
                    <h3 className="font-semibold">{String(active.name)}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500">
                      {String(active.visibility)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {String(active.description ?? "Shared working space")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {Boolean(active.customerWorkspaceUrl) && (
                    <a
                      className="ck-button ck-button-secondary"
                      href={String(active.customerWorkspaceUrl)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={14} />
                      Customer portal
                    </a>
                  )}
                  {Boolean(active.videoUrl) && (
                    <a
                      className="ck-button"
                      href={String(active.videoUrl)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Video size={14} />
                      Start meeting
                    </a>
                  )}
                </div>
              </header>
              <div className="flex-1 space-y-5 overflow-y-auto bg-[#fbfaf7] p-5">
                <div className="mx-auto max-w-3xl rounded-lg border border-dashed bg-white p-5 text-center">
                  <strong className="text-sm">
                    This is the beginning of {String(active.name)}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    Messages, meeting links, customer participation, and shared
                    work remain attached to this space.
                  </p>
                </div>
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const grouped =
                    previous &&
                    String(previous.author) === String(message.author);
                  return (
                    <article
                      className={`mx-auto flex max-w-3xl gap-3 ${grouped ? "-mt-3" : ""}`}
                      key={String(message.id)}
                    >
                      <div
                        className={`grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                          grouped
                            ? "invisible"
                            : message.authorType === "CUSTOMER"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-900 text-white"
                        }`}
                      >
                        {String(message.author).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!grouped && (
                          <div className="flex items-baseline gap-2">
                            <strong className="text-sm">
                              {String(message.author)}
                            </strong>
                            <time className="text-[10px] text-slate-400">
                              {new Date(
                                String(message.createdAt),
                              ).toLocaleString()}
                            </time>
                          </div>
                        )}
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {String(message.body)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
              <form
                action={sendCollaborationMessage}
                className="border-t bg-white p-4"
              >
                <input
                  name="organizationSlug"
                  type="hidden"
                  value={organizationSlug}
                />
                <input
                  name="channelId"
                  type="hidden"
                  value={String(active.id)}
                />
                <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border bg-white p-2 shadow-sm focus-within:border-amber-500">
                  <textarea
                    className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
                    name="body"
                    placeholder={`Message ${String(active.name)}`}
                    required
                  />
                  <button
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white"
                    type="submit"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-10 text-center">
              <div>
                <MessageSquare className="mx-auto text-amber-700" size={28} />
                <h3 className="mt-4 font-semibold">Create your first space</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Use internal channels for teams and customer spaces for shared
                  work.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="hidden border-l 2xl:block">
          <div className="flex border-b p-2">
            {(["about", "meetings"] as const).map((tab) => (
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize ${
                  detailTab === tab ? "bg-slate-100" : "text-slate-500"
                }`}
                key={tab}
                onClick={() => setDetailTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          {detailTab === "about" ? (
            <div className="p-5">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-900">
                {active?.type === "CUSTOMER" ? (
                  <Users size={20} />
                ) : (
                  <Hash size={20} />
                )}
              </div>
              <h3 className="mt-4 font-semibold">
                {String(active?.name ?? "Space details")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {String(
                  active?.description ?? "No description has been added.",
                )}
              </p>
              <dl className="mt-6 space-y-4 text-xs">
                <div>
                  <dt className="font-bold uppercase text-slate-400">Type</dt>
                  <dd className="mt-1">{String(active?.type ?? "")}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase text-slate-400">
                    Messages
                  </dt>
                  <dd className="mt-1">{messages.length}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase text-slate-400">
                    Public reference
                  </dt>
                  <dd className="mt-1 break-all font-mono">
                    {String(active?.publicId ?? "")}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div>
              <div className="border-b p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <CalendarDays className="text-amber-700" size={17} />
                  Upcoming
                </div>
              </div>
              <div className="divide-y">
                {calendar.map((event) => (
                  <div className="p-4" key={String(event.id)}>
                    <strong className="text-sm">{String(event.title)}</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(String(event.startsAt)).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {String(event.location ?? "No location")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreate(false);
          }}
        >
          <form
            action={createCollaborationChannel}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onSubmit={() => setShowCreate(false)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  New collaboration space
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  Bring the right people together
                </h2>
              </div>
              <button
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg border"
                onClick={() => setShowCreate(false)}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            <input
              name="organizationSlug"
              type="hidden"
              value={organizationSlug}
            />
            <div className="mt-6 grid gap-4">
              <label className="text-xs font-semibold">
                Space name
                <input
                  autoFocus
                  className="ck-input mt-2"
                  name="name"
                  placeholder="Customer onboarding"
                  required
                />
              </label>
              <label className="text-xs font-semibold">
                Purpose
                <textarea
                  className="ck-input mt-2 min-h-24 py-3"
                  name="description"
                  placeholder="What work belongs here?"
                />
              </label>
              <label className="text-xs font-semibold">
                Access model
                <select className="ck-input mt-2" name="channelType">
                  <option value="INTERNAL">Internal team channel</option>
                  <option value="PROJECT">Cross-functional project</option>
                  <option value="CUSTOMER">Customer shared workspace</option>
                </select>
              </label>
            </div>
            <button className="ck-button mt-6 w-full" type="submit">
              Create space
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
