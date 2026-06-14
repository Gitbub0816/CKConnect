"use client";

import {
  BadgeCheck,
  Database,
  Globe2,
  HardDrive,
  LayoutTemplate,
  Link2,
  Play,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  createDataLink,
  saveReportQuery,
  updateMembershipAccess,
  updateStoragePolicy,
  updateTenantSettings,
  updateTenantControls,
  verifyDomainNow,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";
import { WebsiteStudio } from "@/components/website-studio";

type Value = Record<string, unknown>;
type Data = {
  records?: Value[];
  queryReports?: Value[];
  websites?: Value[];
  theme?: Value | null;
  modules?: Value | null;
  tenantSettings?: Value | null;
  organization?: Value | null;
  permissionCatalog?: string[];
  assets?: Value[];
  automations?: Value[];
  entities?: Value[];
  catalog?: Value[];
  links?: Value[];
  storagePolicies?: Value[];
};

function ReportsWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <form action={saveReportQuery} className="ck-card h-fit p-5">
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <div className="flex items-center gap-2 font-semibold">
          <LayoutTemplate className="text-[#9b7420]" size={18} />
          Query builder
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Build tenant-scoped reports from approved business datasets. Raw SQL
          is intentionally unavailable.
        </p>
        <div className="mt-5 grid gap-4">
          <label className="text-xs font-semibold text-slate-600">
            Report name
            <input
              className="ck-input mt-2"
              name="name"
              placeholder="Monthly receivables by status"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Dataset
            <select className="ck-input mt-2" name="dataset">
              <option value="invoices">Invoices</option>
              <option value="deals">Deals</option>
              <option value="expenses">Expenses</option>
              <option value="customers">Customers</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Calculation
              <select className="ck-input mt-2" name="metric">
                <option value="count">Count</option>
                <option value="sum">Sum</option>
                <option value="average">Average</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Value field
              <select className="ck-input mt-2" name="valueField">
                <option value="balanceDue">Balance due</option>
                <option value="total">Invoice total</option>
                <option value="amount">Amount</option>
                <option value="annualRevenue">Annual revenue</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Group by
            <select className="ck-input mt-2" name="groupBy">
              <option value="month">Month</option>
              <option value="status">Status</option>
              <option value="stage">Deal stage</option>
              <option value="source">Source</option>
              <option value="industry">Industry</option>
              <option value="none">No grouping</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Filter field
              <select className="ck-input mt-2" name="filterField">
                <option value="none">None</option>
                <option value="status">Status</option>
                <option value="stage">Stage</option>
                <option value="source">Source</option>
                <option value="industry">Industry</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Equals
              <input className="ck-input mt-2" name="filterValue" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input name="shared" type="checkbox" />
            Share with the organization
          </label>
          <button className="ck-button" type="submit">
            <Plus size={14} />
            Save and run report
          </button>
        </div>
      </form>
      <section className="space-y-4">
        {(data.queryReports ?? []).map((report) => (
          <article className="ck-card overflow-hidden" key={String(report.id)}>
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="font-semibold">{String(report.name)}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {String((report.definition as Value).dataset)} ·{" "}
                  {String((report.definition as Value).metric)} · grouped by{" "}
                  {String((report.definition as Value).groupBy)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                {report.shared ? "Shared" : "Private"}
              </span>
            </div>
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {(report.rows as Value[]).map((row) => (
                <div className="bg-white p-5" key={String(row.group)}>
                  <div className="text-xs font-semibold text-slate-500">
                    {String(row.group)}
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {["invoices", "deals", "expenses", "customers"].includes(
                      String((report.definition as Value).dataset),
                    ) && (report.definition as Value).metric !== "count"
                      ? formatCurrency(Number(row.value))
                      : Number(row.value).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {Number(row.records)} source records
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {!(data.queryReports ?? []).length && (
          <div className="ck-card p-10 text-center text-sm text-slate-500">
            Create the first reusable report from the query builder.
          </div>
        )}
      </section>
    </div>
  );
}

function TeamWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const permissions = data.permissionCatalog ?? [];
  return (
    <div className="space-y-4">
      {(data.records ?? []).map((member) => (
        <form
          action={updateMembershipAccess}
          className="ck-card grid gap-5 p-5 xl:grid-cols-[260px_180px_1fr_auto]"
          key={String(member.id)}
        >
          <input
            name="organizationSlug"
            type="hidden"
            value={organizationSlug}
          />
          <input name="membershipId" type="hidden" value={String(member.id)} />
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#9b7420]" size={17} />
              <strong>{String(member.name)}</strong>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {String(member.email)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Licensed since{" "}
              {new Date(String(member.joinedAt)).toLocaleDateString()}
            </div>
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Role
            <select
              className="ck-input mt-2"
              defaultValue={String(member.role)}
              name="role"
            >
              {[
                "OWNER",
                "ADMIN",
                "MANAGER",
                "SALES",
                "ACCOUNTING",
                "SUPPORT",
                "READ_ONLY",
                "PORTAL_USER",
              ].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-600">
              Granular permissions
            </legend>
            <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border bg-slate-50 p-3 lg:grid-cols-3">
              {permissions.map((permission) => (
                <label
                  className="flex items-center gap-2 text-[11px]"
                  key={permission}
                >
                  <input
                    defaultChecked={
                      (member.permissions as string[]).includes(permission) ||
                      (member.permissions as string[]).includes("*")
                    }
                    name="permissions"
                    type="checkbox"
                    value={permission}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="ck-button self-end" type="submit">
            <BadgeCheck size={14} />
            Save access
          </button>
        </form>
      ))}
    </div>
  );
}

const moduleOptions = [
  "crm",
  "cases",
  "campaigns",
  "accounting",
  "banking",
  "payroll",
  "websites",
  "domains",
  "automations",
  "reports",
  "marketing",
  "managedEmail",
];

function SettingsWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const theme = data.theme ?? {};
  const modules = data.modules ?? {};
  const tenantSettings = data.tenantSettings ?? {};
  const profile = (tenantSettings.profileJson as Value | undefined) ?? {};
  const security = (tenantSettings.securityJson as Value | undefined) ?? {};
  const booking = (tenantSettings.bookingJson as Value | undefined) ?? {};
  const portal = (tenantSettings.portalJson as Value | undefined) ?? {};
  return (
    <div className="space-y-4">
      <section className="ck-card p-5">
        <div className="ck-eyebrow">Workspace identifiers</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Public tenant ID", data.organization?.publicId],
            ["Organization code", data.organization?.orgCode],
            ["Tenant slug", data.organization?.slug],
            [
              "Currency / timezone",
              `${String(data.organization?.currency)} / ${String(data.organization?.timezone)}`,
            ],
          ].map(([label, value]) => (
            <div className="rounded-lg bg-slate-50 p-3" key={String(label)}>
              <div className="text-[10px] font-bold uppercase text-slate-500">
                {String(label)}
              </div>
              <div className="mt-1 break-all font-mono text-xs">
                {String(value ?? "")}
              </div>
            </div>
          ))}
        </div>
      </section>
      <form action={updateTenantSettings} className="grid gap-4 xl:grid-cols-2">
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <section className="ck-card p-5">
          <div className="ck-eyebrow">Business profile</div>
          <h3 className="mt-2 text-xl font-semibold">Shared public defaults</h3>
          <div className="mt-5 grid gap-4">
            <label className="text-xs font-semibold">
              Support email
              <input
                className="ck-input mt-2"
                defaultValue={String(profile.supportEmail ?? "")}
                name="supportEmail"
                type="email"
              />
            </label>
            <label className="text-xs font-semibold">
              Billing email
              <input
                className="ck-input mt-2"
                defaultValue={String(profile.billingEmail ?? "")}
                name="billingEmail"
                type="email"
              />
            </label>
            <label className="text-xs font-semibold">
              Main phone
              <input
                className="ck-input mt-2"
                defaultValue={String(profile.mainPhone ?? "")}
                name="mainPhone"
              />
            </label>
          </div>
        </section>
        <section className="ck-card p-5">
          <div className="ck-eyebrow">Security policy</div>
          <h3 className="mt-2 text-xl font-semibold">
            Workspace access controls
          </h3>
          <div className="mt-5 grid gap-4">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                defaultChecked={Boolean(security.requireMfa)}
                name="requireMfa"
                type="checkbox"
              />
              Require MFA
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                defaultChecked={Boolean(security.requirePasskeys)}
                name="requirePasskeys"
                type="checkbox"
              />
              Require passkeys
            </label>
            <label className="text-xs font-semibold">
              Session timeout (minutes)
              <input
                className="ck-input mt-2"
                defaultValue={Number(security.sessionTimeoutMinutes ?? 480)}
                max="1440"
                min="15"
                name="sessionTimeoutMinutes"
                type="number"
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                defaultChecked={Boolean(booking.enabled)}
                name="bookingEnabled"
                type="checkbox"
              />
              Public booking enabled
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                defaultChecked={Boolean(portal.enabled)}
                name="portalEnabled"
                type="checkbox"
              />
              Customer portal enabled
            </label>
          </div>
          <button className="ck-button mt-5" type="submit">
            Save profile and security
          </button>
        </section>
      </form>
      <form action={updateTenantControls} className="grid gap-4 xl:grid-cols-2">
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <section className="ck-card p-5">
          <div className="ck-eyebrow">Console identity</div>
          <h3 className="mt-2 text-xl font-semibold">Employee workspace</h3>
          <div className="mt-5 grid gap-4">
            <label className="text-xs font-semibold text-slate-600">
              Header/title
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.consoleTitle ?? "")}
                name="consoleTitle"
                placeholder="Northstar Operations"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Console logo URL
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.consoleLogoUrl ?? "")}
                name="consoleLogoUrl"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Background image URL
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.consoleBackgroundImageUrl ?? "")}
                name="consoleBackgroundImageUrl"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Primary color
                <input
                  className="mt-2 h-10 w-full rounded border p-1"
                  defaultValue={String(theme.consolePrimaryColor ?? "#c9a033")}
                  name="consolePrimaryColor"
                  type="color"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Sidebar color
                <input
                  className="mt-2 h-10 w-full rounded border p-1"
                  defaultValue={String(theme.consoleSidebarColor ?? "#1c1917")}
                  name="consoleSidebarColor"
                  type="color"
                />
              </label>
            </div>
          </div>
        </section>
        <section className="ck-card p-5">
          <div className="ck-eyebrow">Payment identity</div>
          <h3 className="mt-2 text-xl font-semibold">Customer payment page</h3>
          <div className="mt-5 grid gap-4">
            <label className="text-xs font-semibold text-slate-600">
              Payment header/title
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.paymentTitle ?? "")}
                name="paymentTitle"
                placeholder="Secure payment center"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Payment logo URL
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.paymentLogoUrl ?? "")}
                name="paymentLogoUrl"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Background image URL
              <input
                className="ck-input mt-2"
                defaultValue={String(theme.paymentBackgroundImageUrl ?? "")}
                name="paymentBackgroundImageUrl"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Action color
                <input
                  className="mt-2 h-10 w-full rounded border p-1"
                  defaultValue={String(theme.paymentPrimaryColor ?? "#c9a033")}
                  name="paymentPrimaryColor"
                  type="color"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Header color
                <input
                  className="mt-2 h-10 w-full rounded border p-1"
                  defaultValue={String(theme.paymentHeaderColor ?? "#1c1917")}
                  name="paymentHeaderColor"
                  type="color"
                />
              </label>
            </div>
          </div>
        </section>
        <section className="ck-card p-5 xl:col-span-2">
          <div className="ck-eyebrow">Feature policy</div>
          <h3 className="mt-2 text-xl font-semibold">
            Enabled workspace modules
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Disabled modules disappear from navigation and cannot be opened by
            standard licensees.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {moduleOptions.map((module) => (
              <label
                className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm font-semibold capitalize"
                key={module}
              >
                <input
                  defaultChecked={modules[module] !== false}
                  name="enabledModules"
                  type="checkbox"
                  value={module}
                />
                {module.replaceAll(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
          <button className="ck-button mt-5" type="submit">
            Save tenant controls
          </button>
        </section>
      </form>
    </div>
  );
}

function WebsiteWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const website = data.websites?.[0];
  const page = (website?.pages as Value[] | undefined)?.[0];
  if (!website || !page)
    return (
      <div className="ck-card p-10 text-center text-sm text-slate-500">
        Create a website to open the visual page builder.
      </div>
    );
  return (
    <WebsiteStudio
      assets={(data.assets ?? []) as never[]}
      automations={(data.automations ?? []) as never[]}
      organizationSlug={organizationSlug}
      page={page}
      website={website}
    />
  );
}

function DataStudioWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(data.entities ?? []).map((entity) => (
          <article className="ck-card p-5" key={String(entity.type)}>
            <div className="flex items-center gap-2">
              <Database className="text-amber-700" size={17} />
              <strong>{String(entity.label)}</strong>
            </div>
            <div className="mt-3 text-3xl font-semibold">
              {Number(entity.count).toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {String(entity.description)}
            </p>
          </article>
        ))}
      </section>
      <section className="ck-card overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-semibold">Linkable entity browser</h3>
          <p className="mt-1 text-xs text-slate-500">
            Recent tenant records available to the relationship graph. Copy a
            record UUID, then use it as a source or target below.
          </p>
        </div>
        <div className="grid max-h-80 gap-px overflow-y-auto bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {(data.catalog ?? []).map((record) => (
            <article className="bg-white p-4" key={String(record.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    {String(record.type)}
                  </span>
                  <p className="truncate text-sm font-semibold">
                    {String(record.label)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {String(record.detail)}
                  </p>
                </div>
                <button
                  className="rounded-md border px-2 py-1 text-[10px] font-bold hover:bg-slate-50"
                  onClick={() =>
                    navigator.clipboard.writeText(String(record.id))
                  }
                  title={`Copy ${String(record.type)} UUID`}
                  type="button"
                >
                  Copy ID
                </button>
              </div>
              <p className="mt-3 truncate font-mono text-[10px] text-slate-400">
                {String(record.id)}
              </p>
            </article>
          ))}
          {!(data.catalog ?? []).length && (
            <div className="col-span-full bg-white p-10 text-center text-sm text-slate-500">
              Create tenant records to make them available for explicit linking.
            </div>
          )}
        </div>
      </section>
      <div className="grid gap-4 2xl:grid-cols-[420px_1fr]">
        <form action={createDataLink} className="ck-card h-fit p-5">
          <input
            name="organizationSlug"
            type="hidden"
            value={organizationSlug}
          />
          <div className="flex items-center gap-2 font-semibold">
            <Link2 className="text-amber-700" size={17} />
            Create entity linkage
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Link tenant records and define what downstream features may do with
            the relationship.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold">
              Source type
              <select className="ck-input mt-2" name="sourceType">
                {[
                  "Contact",
                  "CrmAccount",
                  "Invoice",
                  "Website",
                  "WebsitePage",
                  "StoredFile",
                  "AutomationRule",
                  "Product",
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Source ID
              <input
                className="ck-input mt-2"
                name="sourceId"
                placeholder="Record UUID"
                required
              />
            </label>
            <label className="text-xs font-semibold">
              Target type
              <select className="ck-input mt-2" name="targetType">
                {[
                  "Website",
                  "WebsitePage",
                  "Contact",
                  "CrmAccount",
                  "Invoice",
                  "StoredFile",
                  "AutomationRule",
                  "Product",
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Target ID
              <input
                className="ck-input mt-2"
                name="targetId"
                placeholder="Record UUID"
                required
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold">
            Relationship
            <input
              className="ck-input mt-2"
              name="relationship"
              placeholder="owns, publishes_to, visible_in"
              required
            />
          </label>
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold">
              Allowed operations
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {["read", "write", "sync", "publish"].map((permission) => (
                <label
                  className="flex items-center gap-2 text-xs capitalize"
                  key={permission}
                >
                  <input
                    name="permissions"
                    type="checkbox"
                    value={permission}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="ck-button mt-5 w-full" type="submit">
            Create audited link
          </button>
        </form>
        <section className="ck-card overflow-hidden">
          <div className="border-b p-5">
            <h3 className="font-semibold">Relationship graph</h3>
            <p className="mt-1 text-xs text-slate-500">
              Explicit tenant-scoped links used by sites, workflows, reports,
              and integrations.
            </p>
          </div>
          <div className="divide-y">
            {(data.links ?? []).map((link) => (
              <div
                className="grid gap-2 p-4 text-sm lg:grid-cols-[1fr_auto_1fr_auto]"
                key={String(link.id)}
              >
                <div>
                  <strong>{String(link.sourceType)}</strong>
                  <p className="font-mono text-[10px] text-slate-400">
                    {String(link.sourceId)}
                  </p>
                </div>
                <span className="self-center text-xs font-semibold text-amber-800">
                  {String(link.relationship)} →
                </span>
                <div>
                  <strong>{String(link.targetType)}</strong>
                  <p className="font-mono text-[10px] text-slate-400">
                    {String(link.targetId)}
                  </p>
                </div>
                <span className="self-center rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">
                  {(link.permissions as string[]).join(" · ") || "REFERENCE"}
                </span>
              </div>
            ))}
            {!(data.links ?? []).length && (
              <div className="p-10 text-center text-sm text-slate-500">
                No explicit data links have been created.
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(
          [
            "WEBSITE_ASSETS",
            "DOCUMENTS",
            "CUSTOMER_UPLOADS",
            "GENERATED_EXPORTS",
          ] as const
        ).map((scope) => {
          const policy = (data.storagePolicies ?? []).find(
            (item) => item.scope === scope,
          );
          return (
            <form
              action={updateStoragePolicy}
              className="ck-card p-5"
              key={scope}
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="scope" type="hidden" value={scope} />
              <div className="flex items-center gap-2 font-semibold">
                <HardDrive className="text-amber-700" size={17} />
                {scope.replaceAll("_", " ")}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Retention
                  <select
                    className="ck-input mt-2"
                    defaultValue={String(policy?.retentionClass ?? "STANDARD")}
                    name="retentionClass"
                  >
                    {[
                      "EPHEMERAL",
                      "STANDARD",
                      "FINANCIAL_7Y",
                      "SECURITY_7Y",
                      "PERMANENT",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Maximum MB
                  <input
                    className="ck-input mt-2"
                    defaultValue={Number(policy?.maxFileSizeMb ?? 25)}
                    max="250"
                    min="1"
                    name="maxFileSizeMb"
                    type="number"
                  />
                </label>
              </div>
              <label className="mt-3 block text-xs font-semibold">
                Allowed MIME types
                <input
                  className="ck-input mt-2"
                  defaultValue={String(policy?.allowedTypes ?? "")}
                  name="allowedTypes"
                  placeholder="image/png, image/webp, application/pdf"
                />
              </label>
              <div className="mt-4 flex gap-5">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    defaultChecked={Boolean(policy?.publicAssets)}
                    name="publicAssets"
                    type="checkbox"
                  />
                  Public delivery
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    defaultChecked={policy?.versioning !== false}
                    name="versioning"
                    type="checkbox"
                  />
                  Versioning
                </label>
              </div>
              <button
                className="ck-button ck-button-secondary mt-4"
                type="submit"
              >
                Save storage policy
              </button>
            </form>
          );
        })}
      </div>
      <section className="ck-card overflow-hidden">
        <div className="border-b p-5">
          <div className="flex items-center gap-2 font-semibold">
            <HardDrive className="text-amber-700" size={17} />
            Object inventory
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tenant-scoped objects, malware scan state, retention class, and
            record linkage.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  "Object",
                  "Content type",
                  "Size",
                  "State",
                  "Scan",
                  "Retention",
                  "Linked record",
                ].map((label) => (
                  <th className="p-4" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.records ?? []).map((file) => (
                <tr className="border-t" key={String(file.id)}>
                  <td className="p-4 font-semibold">{String(file.name)}</td>
                  <td className="p-4 text-slate-500">{String(file.type)}</td>
                  <td className="p-4">
                    {Math.ceil(Number(file.size) / 1024).toLocaleString()} KB
                  </td>
                  <td className="p-4">{String(file.status)}</td>
                  <td className="p-4">{String(file.scanStatus)}</td>
                  <td className="p-4">{String(file.retentionClass)}</td>
                  <td className="p-4">
                    <span className="font-semibold">
                      {String(file.relatedType ?? "Unlinked")}
                    </span>
                    <div className="mt-1 max-w-48 truncate font-mono text-[10px] text-slate-400">
                      {String(file.relatedId ?? "")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(data.records ?? []).length && (
            <div className="p-10 text-center text-sm text-slate-500">
              No stored objects are available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DomainsWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-4">
      {(data.records ?? []).map((domain) => (
        <article className="ck-card overflow-hidden" key={String(domain.id)}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div>
              <div className="flex items-center gap-2">
                <Globe2 className="text-[#9b7420]" size={18} />
                <h3 className="font-semibold">{String(domain.hostname)}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">
                  {String(domain.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Ownership TXT: <code>{String(domain.verificationName)}</code> ={" "}
                <code>{String(domain.verificationToken)}</code>
              </p>
            </div>
            <form action={verifyDomainNow}>
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="entityId" type="hidden" value={String(domain.id)} />
              <button className="ck-button" type="submit">
                <Play size={14} />
                Validate live DNS
              </button>
            </form>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {(domain.checks as Value[]).map((check) => (
              <div className="bg-white p-4" key={String(check.key)}>
                <div className="flex items-center justify-between">
                  <strong className="text-sm uppercase">
                    {String(check.key)}
                  </strong>
                  <span
                    className={`size-2.5 rounded-full ${check.status === "HEALTHY" ? "bg-emerald-500" : check.status === "INVALID" ? "bg-red-500" : "bg-amber-500"}`}
                  />
                </div>
                <div className="mt-3 break-all text-xs text-slate-500">
                  {String(check.value)}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase text-slate-400">
                  {String(check.status)}
                </div>
              </div>
            ))}
            {!(domain.checks as Value[]).length && (
              <div className="bg-white p-5 text-sm text-slate-500 sm:col-span-2 lg:col-span-4">
                Run live validation to inspect ownership, web, MX, SPF, DKIM,
                DMARC, and SSL.
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PlatformWorkbench({
  module,
  data,
  organizationSlug,
}: {
  module: string;
  data: Data;
  organizationSlug: string;
}) {
  if (module === "reports")
    return <ReportsWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "team")
    return <TeamWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "settings")
    return (
      <SettingsWorkbench data={data} organizationSlug={organizationSlug} />
    );
  if (module === "websites")
    return <WebsiteWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "data-studio")
    return (
      <DataStudioWorkbench data={data} organizationSlug={organizationSlug} />
    );
  if (module === "domains")
    return <DomainsWorkbench data={data} organizationSlug={organizationSlug} />;
  return null;
}
