import { Headphones, Send } from "lucide-react";
import {
  createPlatformSupportTicket,
  replyPlatformSupportTicket,
  startStripeCustomerPayments,
  updatePaymentProvider,
} from "@/app/app/[organizationSlug]/actions";
import { CollaborationHub } from "@/components/collaboration-hub";

type Value = Record<string, unknown>;
type Data = { records?: Value[]; calendar?: Value[]; transactions?: Value[] };

function Collaboration({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const slackUrl = (data.records ?? [])
    .flatMap((r) => [r.customerWorkspaceUrl, r.videoUrl])
    .find((u) => typeof u === "string" && (u as string).includes("slack.com")) as
    | string
    | undefined;
  const integration = (data as { integration?: { connected?: boolean; settings?: Record<string, unknown> } }).integration;
  const configuredSlackUrl = [integration?.settings?.workspaceUrl, integration?.settings?.teamUrl]
    .find((value) => typeof value === "string" && value.startsWith("https://")) as string | undefined;
  return (
    <CollaborationHub
      channels={(data.records ?? []) as never[]}
      organizationSlug={organizationSlug}
      slackConnected={Boolean(integration?.connected)}
      slackUrl={configuredSlackUrl ?? slackUrl}
    />
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
  if (module === "slack")
    return <Collaboration data={data} organizationSlug={organizationSlug} />;
  if (module === "collaboration")
    return <Collaboration data={data} organizationSlug={organizationSlug} />;
  if (module === "support")
    return <Support data={data} organizationSlug={organizationSlug} />;
  if (module === "payment-settings")
    return <PaymentSettings data={data} organizationSlug={organizationSlug} />;
  return null;
}
