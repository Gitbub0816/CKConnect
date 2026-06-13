import Link from "next/link";
import {
  createTenant,
  manageTenantLifecycle,
  replyAsClearKey,
} from "@/app/internal-admin/actions";
import { requirePlatformAdmin } from "@/lib/admin-authorization";
import { getDb } from "@/lib/db";

export default async function AdminOverviewPage() {
  const admin = await requirePlatformAdmin();
  const db = getDb();
  const [tenants, tickets, logs, webhookFailures] = await Promise.all([
    db.organization.findMany({
      include: {
        usage: true,
        memberships: { include: { user: true } },
        websites: true,
        domains: true,
        paymentProviderConnections: true,
        _count: { select: { contacts: true, invoices: true, auditLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.platformSupportTicket.findMany({
      include: {
        organization: true,
        messages: {
          where: { internalOnly: false },
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.adminActionLog.findMany({
      include: { actor: true, organization: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.webhookEvent.count({ where: { status: "FAILED" } }),
  ]);
  const cards = [
    ["Total tenants", tenants.length],
    [
      "Active",
      tenants.filter((tenant) => tenant.operationalStatus === "ACTIVE").length,
    ],
    [
      "Restricted",
      tenants.filter((tenant) => tenant.operationalStatus !== "ACTIVE").length,
    ],
    [
      "Open support",
      tickets.filter(
        (ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status),
      ).length,
    ],
    ["Webhook failures", webhookFailures],
  ];
  return (
    <div className="p-6 lg:p-8">
      <div>
        <div className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">
          Platform operations
        </div>
        <h2 className="mt-2 text-3xl font-semibold">ClearKey administration</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tenant lifecycle, support, payment-provider health, and administrator
          actions. No provider secrets are exposed.
        </p>
      </div>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div
            className="rounded-xl border bg-white p-5 shadow-sm"
            key={String(label)}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Add tenant</h3>
        <p className="mt-1 text-xs text-slate-500">
          Creates unique workspace identifiers, baseline settings, usage
          controls, and a manual payment fallback.
        </p>
        <form
          action={createTenant}
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            className="rounded border px-3 py-2 text-sm"
            name="name"
            placeholder="Display name"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            name="legalName"
            placeholder="Legal name"
          />
          <input
            className="rounded border px-3 py-2 font-mono text-sm"
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="unique-tenant-slug"
            required
          />
          <input
            className="rounded border px-3 py-2 font-mono text-sm uppercase"
            name="orgCode"
            placeholder="ORGCODE"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            defaultValue="America/Chicago"
            name="timezone"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm uppercase"
            defaultValue="USD"
            name="defaultCurrency"
            maxLength={3}
            required
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            defaultValue="STARTER"
            name="billingTier"
          >
            <option>STARTER</option>
              <option>GROWTH</option>
              <option>ENTERPRISE</option>
          </select>
          <button className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Create tenant
          </button>
        </form>
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h3 className="font-semibold">Tenants</h3>
          <p className="mt-1 text-xs text-slate-500">
            Unique internal and public identifiers are shown for support-safe
            lookup.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                {[
                  "Tenant",
                  "Identifiers",
                  "Status",
                  "Billing",
                  "Users",
                  "Site",
                  "Payments",
                  "Records",
                  "Actions",
                ].map((heading) => (
                  <th className="px-4 py-3" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr className="border-t align-top" key={tenant.id}>
                  <td className="px-4 py-4">
                    <Link
                      className="font-semibold text-amber-800"
                      href={`/internal-admin/tenants/${tenant.id}`}
                    >
                      {tenant.name}
                    </Link>
                    <div className="mt-1 text-slate-400">
                      {tenant.legalName}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono">
                    {tenant.publicId}
                    <br />
                    {tenant.slug}
                    <br />
                    {tenant.orgCode}
                  </td>
                  <td className="px-4 py-4">{tenant.operationalStatus}</td>
                  <td className="px-4 py-4">
                    {tenant.billingTier}
                    <br />
                    {tenant.billingStatus}
                  </td>
                  <td className="px-4 py-4">
                    {tenant.usage?.licensedUsers ?? tenant.memberships.length}
                  </td>
                  <td className="px-4 py-4">
                    {tenant.websites[0]?.status ?? "NONE"}
                    <br />
                    {
                      tenant.domains.filter(
                        (domain) => domain.status === "VERIFIED",
                      ).length
                    }{" "}
                    verified
                  </td>
                  <td className="px-4 py-4">
                    {tenant.paymentProviderConnections
                      .filter((provider) => provider.status === "ACTIVE")
                      .map((provider) => provider.provider)
                      .join(", ") || "None"}
                  </td>
                  <td className="px-4 py-4">
                    {tenant._count.contacts} contacts
                    <br />
                    {tenant._count.invoices} invoices
                    <br />
                    {tenant._count.auditLogs} audits
                  </td>
                  <td className="px-4 py-4">
                    <form action={manageTenantLifecycle} className="space-y-2">
                      <input
                        name="organizationId"
                        type="hidden"
                        value={tenant.id}
                      />
                      <input
                        className="w-48 rounded border px-2 py-1"
                        name="reason"
                        placeholder="Required reason"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900"
                          name="command"
                          value={
                            tenant.operationalStatus === "ACTIVE"
                              ? "SUSPEND"
                              : "REACTIVATE"
                          }
                        >
                          {tenant.operationalStatus === "ACTIVE"
                            ? "Suspend"
                            : "Reactivate"}
                        </button>
                        <button
                          className="rounded bg-slate-200 px-2 py-1 font-semibold"
                          name="command"
                          value="RESTRICT"
                        >
                          Review
                        </button>
                        {admin.adminRole === "super_admin" && (
                          <button
                            className="rounded bg-red-100 px-2 py-1 font-semibold text-red-800"
                            name="command"
                            value="REMOVE"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-6 grid gap-6 2xl:grid-cols-2">
        <div className="rounded-xl border bg-white shadow-sm" id="support">
          <div className="border-b p-5">
            <h3 className="font-semibold">Tenant support conversations</h3>
          </div>
          <div className="divide-y">
            {tickets.map((ticket) => (
              <article className="p-5" key={ticket.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>
                      {ticket.organization.name} · {ticket.subject}
                    </strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.publicId} · {ticket.priority} · {ticket.status}
                    </p>
                  </div>
                </div>
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
                  {ticket.messages.map((message) => (
                    <div className="text-xs" key={message.id}>
                      <strong>{message.authorType}</strong>: {message.body}
                    </div>
                  ))}
                </div>
                <form
                  action={replyAsClearKey}
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px_auto]"
                >
                  <input name="ticketId" type="hidden" value={ticket.id} />
                  <input
                    className="rounded border px-3 py-2 text-sm"
                    name="body"
                    placeholder="ClearKey response"
                    required
                  />
                  <select className="rounded border px-2 text-sm" name="status">
                    <option>WAITING_TENANT</option>
                    <option>OPEN</option>
                    <option>RESOLVED</option>
                    <option>CLOSED</option>
                  </select>
                  <button className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    Reply
                  </button>
                </form>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white shadow-sm" id="audit">
          <div className="border-b p-5">
            <h3 className="font-semibold">Detailed administrator log</h3>
            <p className="mt-1 text-xs text-slate-500">
              Append-only actor, tenant, reason, resource, and before/after
              context.
            </p>
          </div>
          <div className="max-h-[720px] divide-y overflow-y-auto">
            {logs.map((log) => (
              <div className="p-4 text-xs" key={log.id}>
                <div className="flex justify-between gap-3">
                  <strong>{log.action}</strong>
                  <span className="text-slate-400">
                    {log.createdAt.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">
                  {log.actor.email} · {log.organization?.name ?? "Platform"} ·{" "}
                  {log.resourceType} {log.resourceId}
                </p>
                {log.reason && (
                  <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900">
                    Reason: {log.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
