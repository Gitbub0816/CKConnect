import {
  CalendarDays,
  Headphones,
  MessageSquare,
  Plus,
  Send,
  Video,
} from "lucide-react";
import {
  createCollaborationChannel,
  createPlatformSupportTicket,
  replyPlatformSupportTicket,
  sendCollaborationMessage,
  startStripeCustomerPayments,
  updatePaymentProvider,
} from "@/app/app/[organizationSlug]/actions";

type Value = Record<string, unknown>;
type Data = {
  integration?: Value | null;
  records?: Value[];
  calendar?: Value[];
  transactions?: Value[];
};

function SlackLogo({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden="true" className={className} height={size} viewBox="0 0 24 24" width={size}>
      <path d="M9.3 2.5a2.1 2.1 0 0 0 0 4.2h2.1V4.6a2.1 2.1 0 0 0-2.1-2.1Z" fill="#36C5F0" />
      <path d="M12.6 2.5a2.1 2.1 0 0 1 2.1 2.1v5.3a2.1 2.1 0 1 1-4.2 0V4.6a2.1 2.1 0 0 1 2.1-2.1Z" fill="#2EB67D" />
      <path d="M21.5 9.3a2.1 2.1 0 0 0-4.2 0v2.1h2.1a2.1 2.1 0 0 0 2.1-2.1Z" fill="#2EB67D" />
      <path d="M21.5 12.6a2.1 2.1 0 0 1-2.1 2.1h-5.3a2.1 2.1 0 1 1 0-4.2h5.3a2.1 2.1 0 0 1 2.1 2.1Z" fill="#ECB22E" />
      <path d="M14.7 21.5a2.1 2.1 0 0 0 0-4.2h-2.1v2.1a2.1 2.1 0 0 0 2.1 2.1Z" fill="#ECB22E" />
      <path d="M11.4 21.5a2.1 2.1 0 0 1-2.1-2.1v-5.3a2.1 2.1 0 1 1 4.2 0v5.3a2.1 2.1 0 0 1-2.1 2.1Z" fill="#E01E5A" />
      <path d="M2.5 14.7a2.1 2.1 0 0 0 4.2 0v-2.1H4.6a2.1 2.1 0 0 0-2.1 2.1Z" fill="#E01E5A" />
      <path d="M2.5 11.4a2.1 2.1 0 0 1 2.1-2.1h5.3a2.1 2.1 0 1 1 0 4.2H4.6a2.1 2.1 0 0 1-2.1-2.1Z" fill="#36C5F0" />
    </svg>
  );
}

function SlackCollaboration({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const channels = data.records ?? [];
  const activeChannel = channels[0];
  return (
    <div className="min-h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex h-full min-h-[calc(100vh-12rem)]">
        <aside className="w-64 shrink-0 bg-[#3f0e40] text-white">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <SlackLogo size={22} />
              Slack
            </div>
            <p className="mt-1 text-xs text-white/60">
              Connected to ClearKey tenant sync
            </p>
          </div>
          <div className="p-3">
            <div className="px-2 py-2 text-xs font-bold uppercase tracking-[.12em] text-white/50">
              Channels
            </div>
            {channels.map((channel) => (
              <a
                className="block rounded-md px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                href={`#slack-${String(channel.id)}`}
                key={String(channel.id)}
              >
                # {String(channel.name)}
              </a>
            ))}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold"># {String(activeChannel?.name ?? "general")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Slack renders full screen when connected; ClearKey channels stay linked to customers, meetings, and records.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {String(data.integration?.status ?? "ACTIVE")}
            </span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            {channels.map((channel) => (
              <article id={`slack-${String(channel.id)}`} key={String(channel.id)}>
                <div className="border-b bg-slate-50 px-5 py-3">
                  <div className="font-semibold"># {String(channel.name)}</div>
                  <div className="text-xs text-slate-500">
                    {String(channel.description ?? "Synchronized Slack channel")}
                  </div>
                </div>
                <div className="divide-y">
                  {((channel.messages as Value[]) ?? []).map((message) => (
                    <div className="grid grid-cols-[42px_1fr] gap-3 px-5 py-4" key={String(message.id)}>
                      <div className="grid size-10 place-items-center rounded-lg bg-[#3f0e40] text-xs font-bold text-white">
                        {String(message.author ?? "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <strong className="text-sm">{String(message.author)}</strong>
                          <span className="text-xs text-slate-400">
                            {new Date(String(message.createdAt)).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                          {String(message.body)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {activeChannel && (
            <form action={sendCollaborationMessage} className="flex gap-3 border-t p-4">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="channelId" type="hidden" value={String(activeChannel.id)} />
              <textarea className="ck-input min-h-12 flex-1 py-3" name="body" placeholder={`Message #${String(activeChannel.name)}...`} required />
              <button className="ck-button self-end" type="submit">
                <Send size={14} />
                Send
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function Collaboration({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  if (data.integration?.provider === "SLACK" && data.integration.connected) {
    return <SlackCollaboration data={data} organizationSlug={organizationSlug} />;
  }
  return (
    <div className="grid gap-4 2xl:grid-cols-[300px_1fr_320px]">
      <aside className="space-y-4">
        <form action={createCollaborationChannel} className="ck-card p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Plus size={17} />
            New workspace
          </div>
          <input
            name="organizationSlug"
            type="hidden"
            value={organizationSlug}
          />
          <input
            className="ck-input mt-4"
            name="name"
            placeholder="Project or team channel"
            required
          />
          <textarea
            className="ck-input mt-3 min-h-20 py-3"
            name="description"
            placeholder="Purpose and working agreement"
          />
          <select className="ck-input mt-3" name="channelType">
            <option value="INTERNAL">Internal team</option>
            <option value="PROJECT">Shared project</option>
            <option value="CUSTOMER">Customer workspace</option>
          </select>
          <button className="ck-button mt-3 w-full" type="submit">
            Create workspace
          </button>
        </form>
        <section className="ck-card overflow-hidden">
          <div className="border-b p-4 text-xs font-bold uppercase text-slate-500">
            Channels
          </div>
          {(data.records ?? []).map((channel) => (
            <a
              className="block border-b p-4 last:border-0 hover:bg-amber-50"
              href={`#channel-${String(channel.id)}`}
              key={String(channel.id)}
            >
              <div className="flex items-center justify-between">
                <strong className="text-sm"># {String(channel.name)}</strong>
                <span className="text-[10px] font-bold text-slate-400">
                  {String(channel.type)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {String(channel.description ?? "Shared workspace")}
              </p>
            </a>
          ))}
        </section>
      </aside>
      <section className="space-y-4">
        {(data.records ?? []).map((channel) => (
          <article
            className="ck-card overflow-hidden"
            id={`channel-${String(channel.id)}`}
            key={String(channel.id)}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-[#9b7420]" size={18} />
                  <h3 className="font-semibold">{String(channel.name)}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {String(channel.visibility)} · ID {String(channel.publicId)}
                </p>
              </div>
              <div className="flex gap-2">
                {Boolean(channel.customerWorkspaceUrl) && (
                  <a
                    className="ck-button ck-button-secondary"
                    href={String(channel.customerWorkspaceUrl)}
                    target="_blank"
                  >
                    Open customer link
                  </a>
                )}
                {Boolean(channel.videoUrl) && (
                  <a
                    className="ck-button ck-button-secondary"
                    href={String(channel.videoUrl)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Video size={15} />
                    Open video room
                  </a>
                )}
              </div>
            </div>
            <div className="max-h-[520px] space-y-3 overflow-y-auto bg-[#f8f5ef] p-5">
              {(channel.messages as Value[]).map((message) => (
                <div
                  className={`max-w-[80%] rounded-xl p-3 text-sm ${message.authorType === "CUSTOMER" ? "bg-white" : "ml-auto bg-[#1c1917] text-white"}`}
                  key={String(message.id)}
                >
                  <div className="text-[10px] font-bold uppercase opacity-60">
                    {String(message.author)}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap leading-6">
                    {String(message.body)}
                  </p>
                  <div className="mt-1 text-[10px] opacity-50">
                    {new Date(String(message.createdAt)).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <form
              action={sendCollaborationMessage}
              className="flex gap-3 border-t p-4"
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input
                name="channelId"
                type="hidden"
                value={String(channel.id)}
              />
              <textarea
                className="ck-input min-h-12 flex-1 py-3"
                name="body"
                placeholder={
                  channel.type === "CUSTOMER"
                    ? "Message the customer workspace..."
                    : "Message the team..."
                }
                required
              />
              <button className="ck-button self-end" type="submit">
                <Send size={14} />
                Send
              </button>
            </form>
          </article>
        ))}
      </section>
      <aside className="ck-card h-fit overflow-hidden">
        <div className="border-b p-5">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="text-[#9b7420]" size={18} />
            Calendar context
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Upcoming meetings across this workspace.
          </p>
        </div>
        <div className="divide-y">
          {(data.calendar ?? []).map((event) => (
            <div className="p-4" key={String(event.id)}>
              <strong className="text-sm">{String(event.title)}</strong>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(String(event.startsAt)).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {String(event.location ?? "No location")}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
function Support({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <form action={createPlatformSupportTicket} className="ck-card h-fit p-5">
        <div className="flex items-center gap-2 font-semibold">
          <Headphones className="text-[#9b7420]" size={18} />
          Contact ClearKey
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Workspace metadata and recent provider health are attached
          automatically. Secrets and customer message contents are excluded.
        </p>
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <input
          className="ck-input mt-4"
          name="subject"
          placeholder="What do you need help with?"
          required
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select className="ck-input" name="category">
            <option>GENERAL</option>
            <option>BILLING</option>
            <option>TECHNICAL</option>
            <option>SECURITY</option>
            <option>MIGRATION</option>
          </select>
          <select className="ck-input" name="priority">
            <option>NORMAL</option>
            <option>LOW</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
        </div>
        <textarea
          className="ck-input mt-3 min-h-36 py-3"
          name="body"
          placeholder="Describe the issue and desired outcome."
          required
        />
        <button className="ck-button mt-3 w-full" type="submit">
          Open support ticket
        </button>
      </form>
      <section className="space-y-4">
        {(data.records ?? []).map((ticket) => (
          <article className="ck-card overflow-hidden" key={String(ticket.id)}>
            <div className="border-b p-5">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{String(ticket.subject)}</strong>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">
                  {String(ticket.status)}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                  {String(ticket.priority)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {String(ticket.publicId)} · {String(ticket.category)} · opened{" "}
                {new Date(String(ticket.createdAt)).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-3 bg-[#f8f5ef] p-5">
              {(ticket.messages as Value[]).map((message) => (
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-sm ${message.authorType === "CLEARKEY" ? "bg-white" : "ml-auto bg-[#1c1917] text-white"}`}
                  key={String(message.id)}
                >
                  <strong className="text-xs">{String(message.author)}</strong>
                  <p className="mt-1 whitespace-pre-wrap leading-6">
                    {String(message.body)}
                  </p>
                </div>
              ))}
            </div>
            <form
              action={replyPlatformSupportTicket}
              className="flex gap-3 border-t p-4"
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="ticketId" type="hidden" value={String(ticket.id)} />
              <input
                className="ck-input flex-1"
                name="body"
                placeholder="Reply to ClearKey Support"
                required
              />
              <button className="ck-button" type="submit">
                <Send size={14} />
                Reply
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}

function PaymentSettings({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data.records ?? []).map((provider) => (
          <article className="ck-card p-5" key={String(provider.provider)}>
            <div className="flex items-center justify-between">
              <strong>{String(provider.provider)}</strong>
              {Boolean(provider.isDefault) && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                  DEFAULT
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {String(provider.status)}
              {provider.merchantId ? ` · ${String(provider.merchantId)}` : ""}
            </p>
            {provider.available === false && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                {String(provider.availabilityNote)}
              </p>
            )}
            <div className="mt-5 space-y-2">
              {provider.provider === "STRIPE" &&
                provider.status !== "ACTIVE" &&
                provider.available !== false && (
                  <form action={startStripeCustomerPayments}>
                    <input
                      name="organizationSlug"
                      type="hidden"
                      value={organizationSlug}
                    />
                    <button className="ck-button w-full" type="submit">
                      Connect Stripe
                    </button>
                  </form>
                )}
              {provider.provider === "MANUAL" &&
                provider.status !== "ACTIVE" && (
                  <form action={updatePaymentProvider}>
                    <input
                      name="organizationSlug"
                      type="hidden"
                      value={organizationSlug}
                    />
                    <input name="provider" type="hidden" value="MANUAL" />
                    <button
                      className="ck-button w-full"
                      name="command"
                      type="submit"
                      value="ENABLE_MANUAL"
                    >
                      Enable manual
                    </button>
                  </form>
                )}
              {provider.provider === "SQUARE" &&
                provider.status !== "ACTIVE" &&
                provider.available !== false && (
                  <a
                    className="ck-button w-full"
                    href={`/api/payments/square/connect?organizationSlug=${organizationSlug}`}
                  >
                    Connect Square
                  </a>
                )}
              {provider.status !== "ACTIVE" && provider.available === false && (
                <div className="rounded-lg border bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500">
                  Connection unavailable
                </div>
              )}
              {provider.status === "ACTIVE" && !provider.isDefault && (
                <form action={updatePaymentProvider}>
                  <input
                    name="organizationSlug"
                    type="hidden"
                    value={organizationSlug}
                  />
                  <input
                    name="provider"
                    type="hidden"
                    value={String(provider.provider)}
                  />
                  <button
                    className="ck-button w-full"
                    name="command"
                    type="submit"
                    value="SET_DEFAULT"
                  >
                    Set default
                  </button>
                </form>
              )}
              {provider.status === "ACTIVE" &&
                provider.provider !== "MANUAL" && (
                  <form action={updatePaymentProvider}>
                    <input
                      name="organizationSlug"
                      type="hidden"
                      value={organizationSlug}
                    />
                    <input
                      name="provider"
                      type="hidden"
                      value={String(provider.provider)}
                    />
                    <button
                      className="ck-button ck-button-secondary w-full"
                      name="command"
                      type="submit"
                      value="DISCONNECT"
                    >
                      Disconnect
                    </button>
                  </form>
                )}
            </div>
          </article>
        ))}
      </section>
      <section className="ck-card overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-semibold">Customer payment orchestration</h3>
          <p className="mt-1 text-xs text-slate-500">
            Customer funds settle directly to the tenant merchant account.
            ClearKey stores integer-cent transaction metadata, never card data.
          </p>
        </div>
        <div className="divide-y">
          {(data.transactions ?? []).map((transaction) => (
            <div
              className="grid gap-2 p-4 text-sm sm:grid-cols-4"
              key={String(transaction.id)}
            >
              <strong>{String(transaction.publicId)}</strong>
              <span>{String(transaction.provider)}</span>
              <span>{String(transaction.status)}</span>
              <span className="text-right">
                {(Number(transaction.amountCents) / 100).toLocaleString(
                  "en-US",
                  { style: "currency", currency: String(transaction.currency) },
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CommunicationsWorkbench({
  module,
  data,
  organizationSlug,
}: {
  module: string;
  data: Data;
  organizationSlug: string;
}) {
  if (module === "collaboration")
    return <Collaboration data={data} organizationSlug={organizationSlug} />;
  if (module === "support")
    return <Support data={data} organizationSlug={organizationSlug} />;
  if (module === "payment-settings")
    return <PaymentSettings data={data} organizationSlug={organizationSlug} />;
  return null;
}
