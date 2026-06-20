"use client";

import { useState } from "react";
import { Check, Eye, ExternalLink, Hash, Heart, MessageCircle, MessageSquare, Plus, Search, Send, ThumbsUp, Users, Video, X } from "lucide-react";
import { createCollaborationChannel, sendCollaborationMessage, toggleCollaborationReaction } from "@/app/app/[organizationSlug]/actions";

type Reaction = { id: string; emoji: string; userId: string };
type Message = {
  id: string;
  body: string;
  author: string;
  authorType: string;
  createdAt: string;
  reactions?: Reaction[];
  replies?: Message[];
};
type Channel = {
  id: string;
  publicId: string;
  name: string;
  description?: string | null;
  type: string;
  visibility: string;
  videoUrl?: string | null;
  customerWorkspaceUrl?: string | null;
  messages: Message[];
};

export function CollaborationHub({
  channels = [],
  organizationSlug,
  slackConnected = false,
  slackUrl,
}: {
  channels?: Channel[];
  organizationSlug: string;
  slackConnected?: boolean;
  slackUrl?: string;
}) {
  const [mode, setMode] = useState<"connect" | "slack">("connect");
  const [selectedId, setSelectedId] = useState(channels[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [threadId, setThreadId] = useState("");
  const selected = channels.find((channel) => channel.id === selectedId) ?? channels[0];
  const thread = selected?.messages.find((message) => message.id === threadId);
  const filtered = channels.filter((channel) =>
    `${channel.name} ${channel.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  if (mode === "slack") {
    return (
      <div className="grid min-h-[620px] place-items-center border bg-white p-8 text-center lg:h-[calc(100vh-12rem)]">
        <div>
          <MessageSquare className="mx-auto text-[#4A154B]" size={42} />
          <h2 className="mt-4 text-2xl font-semibold">Slack workspace</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Slack remains an optional tenant integration. Open the connected workspace, or return to Connect Collaboration for tenant-native channels and customer spaces.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button className="ck-button ck-button-secondary" onClick={() => setMode("connect")} type="button">Back to Collaboration</button>
            {slackConnected && slackUrl ? <a className="ck-button" href={slackUrl} rel="noreferrer" target="_blank">Open Slack <ExternalLink size={14} /></a> : <a className="ck-button" href={`/app/${organizationSlug}/integrations`}>Configure Slack</a>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[680px] overflow-hidden border bg-white lg:h-[calc(100vh-12rem)] lg:grid-cols-[280px_minmax(0,1fr)_300px]">
      <aside className="flex min-h-0 flex-col border-r bg-slate-950 text-white">
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center justify-between">
            <strong>Collaboration</strong>
            <button aria-label="Create channel" className="grid size-8 place-items-center hover:bg-white/10" onClick={() => setCreating((value) => !value)} type="button"><Plus size={17} /></button>
          </div>
          <label className="mt-3 flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/60"><Search size={14} /><input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/40" onChange={(event) => setQuery(event.target.value)} placeholder="Find a channel" value={query} /></label>
        </div>
        {creating && (
          <form action={createCollaborationChannel} className="space-y-2 border-b border-white/10 p-3" onSubmit={() => setCreating(false)}>
            <input name="organizationSlug" type="hidden" value={organizationSlug} />
            <input className="w-full border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none" name="name" placeholder="Channel name" required />
            <input className="w-full border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none" name="description" placeholder="Purpose" />
            <select className="w-full border border-white/15 bg-slate-900 px-3 py-2 text-sm" name="channelType"><option value="INTERNAL">Internal team</option><option value="PROJECT">Project</option><option value="CUSTOMER">Customer space</option></select>
            <button className="w-full bg-white px-3 py-2 text-sm font-semibold text-slate-950" type="submit">Create channel</button>
          </form>
        )}
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          {filtered.map((channel) => (
            <button className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/10 ${selected?.id === channel.id ? "bg-white/10" : ""}`} key={channel.id} onClick={() => { setSelectedId(channel.id); setThreadId(""); }} type="button">
              {channel.type === "CUSTOMER" ? <Users className="mt-0.5 shrink-0" size={15} /> : <Hash className="mt-0.5 shrink-0" size={15} />}
              <span className="min-w-0"><strong className="block truncate text-sm">{channel.name}</strong><span className="block truncate text-xs text-white/50">{channel.description ?? channel.type.replaceAll("_", " ")}</span></span>
            </button>
          ))}
        </nav>
        {slackConnected && <button className="border-t border-white/10 px-4 py-3 text-left text-sm hover:bg-white/10" onClick={() => setMode("slack")} type="button">Open Slack workspace</button>}
      </aside>

      <main className="flex min-h-0 flex-col">
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b px-5 py-3">
              <div className="min-w-0"><h2 className="truncate font-semibold">{selected.name}</h2><p className="truncate text-xs text-slate-500">{selected.description ?? selected.visibility}</p></div>
              <div className="ml-auto flex gap-2">
                {selected.videoUrl && <a aria-label="Open video room" className="ck-icon-button" href={selected.videoUrl} rel="noreferrer" target="_blank"><Video size={16} /></a>}
                {selected.customerWorkspaceUrl && <a aria-label="Open customer workspace" className="ck-icon-button" href={selected.customerWorkspaceUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} /></a>}
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50 px-5 py-5">
              {selected.messages.map((message) => (
                <div className="grid grid-cols-[36px_1fr] gap-3" key={message.id}>
                  <div className="grid size-9 place-items-center bg-slate-900 text-xs font-semibold text-white">{message.author.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="flex items-baseline gap-2"><strong className="text-sm">{message.author}</strong><span className="text-[11px] text-slate-400">{new Date(message.createdAt).toLocaleString()}</span></div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <button className="flex h-7 items-center gap-1 border px-2 text-xs hover:bg-white" onClick={() => setThreadId(message.id)} type="button"><MessageCircle size={13} /> {message.replies?.length ?? 0}</button>
                      {(["thumbs-up", "heart", "check", "eyes"] as const).map((emoji) => {
                        const count = message.reactions?.filter((reaction) => reaction.emoji === emoji).length ?? 0;
                        const Icon = emoji === "thumbs-up" ? ThumbsUp : emoji === "heart" ? Heart : emoji === "check" ? Check : Eye;
                        return (
                          <form action={toggleCollaborationReaction} key={emoji}>
                            <input name="organizationSlug" type="hidden" value={organizationSlug} />
                            <input name="messageId" type="hidden" value={message.id} />
                            <button aria-label={`React ${emoji}`} className="flex h-7 items-center gap-1 border px-2 text-xs hover:bg-white" name="emoji" type="submit" value={emoji}><Icon size={13} />{count > 0 ? count : null}</button>
                          </form>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {!selected.messages.length && <div className="grid h-full place-items-center text-sm text-slate-500">Start the conversation in {selected.name}.</div>}
            </div>
            <form action={sendCollaborationMessage} className="flex items-end gap-2 border-t p-3">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="channelId" type="hidden" value={selected.id} />
              <textarea className="ck-input min-h-12 flex-1 resize-none" name="body" placeholder={`Message ${selected.name}`} required />
              <button aria-label="Send message" className="ck-button h-12" type="submit"><Send size={16} /></button>
            </form>
          </>
        ) : <div className="grid h-full place-items-center text-sm text-slate-500">Create a channel to begin collaborating.</div>}
      </main>

      <aside className="flex min-h-0 flex-col overflow-hidden border-l">
        {thread && selected ? (
          <>
            <header className="flex items-center border-b px-4 py-3"><strong className="text-sm">Thread</strong><button aria-label="Close thread" className="ml-auto p-1 hover:bg-slate-100" onClick={() => setThreadId("")} type="button"><X size={16} /></button></header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {[thread, ...(thread.replies ?? [])].map((message, index) => (
                <div className={index === 0 ? "border-b pb-4" : ""} key={message.id}>
                  <div className="flex items-baseline gap-2"><strong className="text-sm">{message.author}</strong><span className="text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString()}</span></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                </div>
              ))}
            </div>
            <form action={sendCollaborationMessage} className="border-t p-3">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="channelId" type="hidden" value={selected.id} />
              <input name="parentMessageId" type="hidden" value={thread.id} />
              <textarea className="ck-input min-h-20 resize-none" name="body" placeholder="Reply in thread" required />
              <button className="ck-button mt-2 w-full" type="submit"><Send size={14} /> Reply</button>
            </form>
          </>
        ) : selected ? (
          <div className="overflow-y-auto p-5"><div className="text-xs font-semibold uppercase text-slate-500">Channel details</div><h3 className="mt-2 text-lg font-semibold">{selected.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selected.description ?? "No channel description has been added."}</p><dl className="mt-5 divide-y border-y text-sm"><div className="flex justify-between py-3"><dt className="text-slate-500">Type</dt><dd>{selected.type}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-500">Visibility</dt><dd>{selected.visibility}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-500">Messages</dt><dd>{selected.messages.length}</dd></div></dl></div>
        ) : null}
      </aside>
    </div>
  );
}
