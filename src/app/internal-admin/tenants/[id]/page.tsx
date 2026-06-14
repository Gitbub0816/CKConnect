import { notFound } from "next/navigation";
import { updateTenantProfile } from "@/app/internal-admin/actions";
import { requirePlatformAdmin } from "@/lib/admin-authorization";
import { getDb } from "@/lib/db";

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin("tenants.read");
  const { id } = await params;
  const tenant = await getDb().organization.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true } },
      theme: true,
      moduleConfiguration: true,
      tenantSettings: true,
      websites: { include: { pages: true } },
      domains: { include: { dnsRecords: true } },
      paymentProviderConnections: true,
      integrations: true,
      supportTickets: { include: { messages: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 100 },
      adminActions: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!tenant) notFound();
  return (
    <div className="p-6 lg:p-8">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="text-xs font-bold uppercase text-slate-500">
          Tenant detail
        </div>
        <h2 className="mt-2 text-3xl font-semibold">{tenant.name}</h2>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-5">
          {[
            ["Tenant ID", tenant.id],
            ["Public ID", tenant.publicId],
            ["Slug", tenant.slug],
            ["Org code", tenant.orgCode],
            ["Status", tenant.operationalStatus],
            ["Billing", `${tenant.billingTier} / ${tenant.billingStatus}`],
            ["Created", tenant.createdAt.toLocaleString()],
            ["Websites", tenant.websites.length],
            ["Domains", tenant.domains.length],
            ["Audit events", tenant.auditLogs.length],
          ].map(([label, value]) => (
            <div className="rounded-lg bg-slate-50 p-3" key={label}>
              <div className="text-[10px] font-bold uppercase text-slate-500">
                {label}
              </div>
              <div className="mt-1 break-all font-mono text-xs">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Edit tenant profile</h3>
        <p className="mt-1 text-xs text-slate-500">
          Identifier changes are validated and recorded with before/after values
          in the administrator log.
        </p>
        <form
          action={updateTenantProfile}
          className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <input name="organizationId" type="hidden" value={tenant.id} />
          <input
            className="rounded border px-3 py-2 text-sm"
            defaultValue={tenant.name}
            name="name"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            defaultValue={tenant.legalName ?? ""}
            name="legalName"
            placeholder="Legal name"
          />
          <input
            className="rounded border px-3 py-2 font-mono text-sm"
            defaultValue={tenant.slug}
            name="slug"
            required
          />
          <input
            className="rounded border px-3 py-2 font-mono text-sm uppercase"
            defaultValue={tenant.orgCode}
            name="orgCode"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm"
            defaultValue={tenant.timezone}
            name="timezone"
            required
          />
          <input
            className="rounded border px-3 py-2 text-sm uppercase"
            defaultValue={tenant.defaultCurrency}
            name="defaultCurrency"
            required
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            defaultValue={tenant.billingTier}
            name="billingTier"
          >
            <option>STARTER</option>
              <option>GROWTH</option>
              <option>ENTERPRISE</option>
          </select>
          <input
            className="rounded border px-3 py-2 text-sm"
            name="reason"
            placeholder="Required change reason"
            required
          />
          <button className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white xl:col-start-4">
            Save tenant
          </button>
        </form>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold">Users and access</h3>
          <div className="mt-4 divide-y">
            {tenant.memberships.map((membership) => (
              <div className="py-3 text-sm" key={membership.id}>
                <strong>{membership.user.email}</strong>
                <p className="text-xs text-slate-500">
                  {membership.role} · {membership.permissions.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold">Provider health</h3>
          <div className="mt-4 divide-y">
            {[...tenant.paymentProviderConnections, ...tenant.integrations].map(
              (provider) => (
                <div
                  className="flex justify-between py-3 text-sm"
                  key={provider.id}
                >
                  <strong>
                    {"provider" in provider ? provider.provider : "Unknown"}
                  </strong>
                  <span>{"status" in provider ? provider.status : ""}</span>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
