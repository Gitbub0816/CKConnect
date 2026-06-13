import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { QuickCreate } from "@/components/quick-create";
import { BillingActions } from "@/components/billing-actions";
import { OperationalWorkbench } from "@/components/operational-workbench";
import { PlatformWorkbench } from "@/components/platform-workbenches";
import { ServiceWorkbench } from "@/components/service-workbenches";
import { FinanceWorkbench } from "@/components/finance-workbenches";
import { PlatformOperationsWorkbench } from "@/components/platform-operations-workbench";
import { CommunicationsWorkbench } from "@/components/communications-workbench";
import { DataExplorer } from "@/components/data-explorer";

type Metric = { label: string; value: number; format?: string; suffix?: string };
type ModuleData = { kind: string; metrics?: Metric[]; records?: Record<string, unknown>[]; [key: string]: unknown };

const copy: Record<string, { title: string; description: string; action: string }> = {
  leads: { title: "Leads", description: "Qualify demand, prioritize outreach, and convert the right opportunities.", action: "Add lead" },
  accounts: { title: "Accounts", description: "A complete commercial and service view of every customer organization.", action: "Add account" },
  contacts: { title: "Contacts", description: "People, relationships, preferences, and communication history.", action: "Add contact" },
  deals: { title: "Deal pipeline", description: "Forecast revenue and move opportunities through a disciplined sales process.", action: "New deal" },
  cases: { title: "Customer cases", description: "Triage, own, and resolve customer issues with a visible service history.", action: "Create case" },
  campaigns: { title: "Campaigns", description: "Build audiences, attribute demand, and measure conversion.", action: "New campaign" },
  tasks: { title: "Tasks", description: "The follow-ups and internal work that keep commitments moving.", action: "New task" },
  calendar: { title: "Calendar", description: "Appointments, meetings, bookings, and team commitments.", action: "New event" },
  invoices: { title: "Invoices", description: "Draft, send, collect, and post receivables into the ledger.", action: "New invoice" },
  payments: { title: "Payments", description: "Collections, allocations, refunds, and Stripe payment state.", action: "Record payment" },
  expenses: { title: "Expenses", description: "Operating spend, receipts, categories, and ledger posting.", action: "New expense" },
  vendors: { title: "Vendors & bills", description: "Payables, vendor records, due dates, and 1099 readiness.", action: "New bill" },
  accounting: { title: "Accounting", description: "A proprietary double-entry ledger with immutable posted entries.", action: "Journal entry" },
  banking: { title: "Banking", description: "Balances, imported activity, matching, rules, and reconciliation.", action: "Connect account" },
  products: { title: "Products & services", description: "Catalog, pricing, margin, inventory, and invoice line items.", action: "Add offering" },
  payroll: { title: "Payroll", description: "Employees, time, approvals, provider execution, and accounting.", action: "Run payroll" },
  billing: { title: "Plans & billing", description: "Database-driven pricing for licensed users, modules, mailboxes, and managed services.", action: "Manage billing" },
  websites: { title: "Website builder", description: "Hosted tenant websites, responsive pages, publication state, SEO, booking, portal, and payment widgets.", action: "New website" },
  domains: { title: "Domains & DNS", description: "Custom domains, wildcard hosting, SSL, Cloudflare records, and mail authentication health.", action: "Connect domain" },
  integrations: { title: "Integrations", description: "Provider health, synchronization, credentials, and recovery.", action: "Connect provider" },
  automations: { title: "Automations", description: "Event-driven workflows with visible conditions, actions, and runs.", action: "New automation" },
  email: { title: "Email", description: "Templates, transactional delivery, consent, and message history.", action: "Compose" },
  notifications: { title: "Notifications", description: "Actionable personal, financial, provider, and security alerts.", action: "Preferences" },
  audit: { title: "Audit ledger", description: "Tamper-evident history for sensitive, administrative, and financial activity.", action: "Verify chain" },
  team: { title: "Team & permissions", description: "Membership, roles, granular permissions, and administrative access.", action: "Invite member" },
  "tax-documents": { title: "Tax documents", description: "Draft, review, provider generation, submission, and archive.", action: "Generate draft" },
  documents: { title: "Documents", description: "Private files, generated documents, signatures, and client delivery.", action: "Upload" },
  bookings: { title: "Booking operations", description: "Confirm, complete, and manage customer appointments created from public endpoints.", action: "New booking" },
  submissions: { title: "Form inbox", description: "Triage public inquiries, route work, and retain the original structured submission.", action: "New form" },
  collaboration: { title: "Collaboration", description: "Team channels, customer workspaces, video rooms, messaging, and shared calendar context.", action: "New workspace" },
  support: { title: "ClearKey support", description: "Auditable conversations with ClearKey personnel, system context, and account assistance.", action: "Open ticket" },
  "payment-settings": { title: "Customer payment providers", description: "Connect tenant-owned merchant accounts and choose how customer checkouts are routed.", action: "Connect provider" },
};

const labels: Record<string, string> = {
  name: "Name", company: "Company", status: "Status", source: "Source", score: "Score", value: "Value",
  type: "Type", industry: "Industry", contacts: "Contacts", pipeline: "Pipeline", receivable: "Receivable",
  account: "Account", title: "Title", email: "Email", lifecycle: "Lifecycle", preferred: "Preferred",
  contact: "Contact", stage: "Stage", amount: "Amount", probability: "Probability", closeDate: "Close date",
  nextStep: "Next step", number: "Number", subject: "Subject", customer: "Customer", priority: "Priority",
  updatedAt: "Updated", members: "Members", responses: "Responses", conversions: "Conversions", startsAt: "Starts",
  dueAt: "Due", relatedType: "Related to", location: "Location", issueDate: "Issued", dueDate: "Due",
  total: "Total", paid: "Paid", balance: "Balance", items: "Items", reference: "Reference", method: "Method",
  receivedAt: "Received", invoices: "Invoices", description: "Description", vendor: "Vendor", category: "Category",
  incurredAt: "Date", posted: "Posted", eligible1099: "1099", openBills: "Open bills", date: "Date",
  debit: "Debit", credit: "Credit", institution: "Institution", bookBalance: "Book balance",
  availableBalance: "Available", lastSyncAt: "Last sync", sku: "SKU", price: "Price", cost: "Cost",
  margin: "Margin", onHand: "On hand", active: "Active", provider: "Provider", direction: "Direction",
  trigger: "Trigger", lastRunAt: "Last run", runs: "Runs", failures: "Failures", recipient: "Recipient",
  sentAt: "Sent", action: "Action", entity: "Entity", outcome: "Outcome", severity: "Severity",
  createdAt: "Created", role: "Role", permissions: "Permissions", joinedAt: "Joined", year: "Tax year",
  version: "Version", generatedAt: "Generated", size: "Size", quantity: "Quantity", unitPrice: "Unit price",
  hostname: "Hostname", pages: "Pages", publishedAt: "Published", ssl: "SSL", dnsRecords: "DNS records", healthyRecords: "Healthy",
};

const moneyFields = new Set(["value", "pipeline", "receivable", "amount", "total", "paid", "balance", "debit", "credit", "bookBalance", "availableBalance", "price", "cost", "margin", "compensation", "grossPay", "netPay", "employerCost"]);
const dateFields = new Set(["closeDate", "updatedAt", "startsAt", "dueAt", "issueDate", "dueDate", "receivedAt", "incurredAt", "date", "lastSyncAt", "lastRunAt", "sentAt", "createdAt", "joinedAt", "generatedAt"]);

function display(value: unknown, key: string) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
  if (moneyFields.has(key)) return formatCurrency(Number(value));
  if (dateFields.has(key)) return new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replaceAll("_", " ");
}

function MetricGrid({ metrics = [] }: { metrics?: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <article className="ck-card relative overflow-hidden p-5" key={metric.label}>
          <div className="absolute inset-y-0 left-0 w-1 bg-[#c9a033]" style={{ opacity: .35 + index * .16 }} />
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{metric.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {metric.format === "currency" ? formatCurrency(metric.value) : metric.value.toLocaleString()}{metric.suffix}
          </div>
        </article>
      ))}
    </div>
  );
}

function DataTable({ records = [] }: { records?: Record<string, unknown>[] }) {
  const columns = records[0]
    ? Object.keys(records[0]).filter((key) => !["id", "transactions", "detail", "recordHash"].includes(key)).slice(0, 8)
    : [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f8f5ef] text-[10px] uppercase tracking-[.12em] text-slate-500">
          <tr>{columns.map((column) => <th className="border-b px-4 py-3 font-bold" key={column}>{labels[column] ?? column}</th>)}</tr>
        </thead>
        <tbody>
          {records.map((record, row) => (
            <tr className="transition hover:bg-amber-50/45" key={String(record.id ?? row)}>
              {columns.map((column, index) => (
                <td className="border-b px-4 py-4" key={column}>
                  {index === 0 ? <span className="font-semibold text-[#755714]">{display(record[column], column)}</span> : display(record[column], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!records.length && <div className="p-12 text-center text-sm text-slate-500">No records yet. Use the primary action to create the first one.</div>}
    </div>
  );
}

function BillingView({ data, organizationSlug }: { data: ModuleData; organizationSlug: string }) {
  const pricing = data.pricing as { pricingVersion: string; tier: string; licensedUsers: number; manualQuoteRequired: boolean; override: boolean };
  return <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
    <section className="ck-card overflow-hidden">
      <div className="border-b p-5"><h2 className="font-semibold">Monthly subscription calculation</h2><p className="mt-1 text-xs text-slate-500">Calculated exclusively on the server from active Neon pricing configuration.</p></div>
      <DataTable records={data.records}/>
    </section>
    <aside className="ck-card p-5">
      <div className="ck-eyebrow">{pricing.pricingVersion}</div>
      <h2 className="mt-3 text-2xl font-semibold capitalize">{pricing.tier} plan</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{pricing.licensedUsers} licensed users. Employees, contacts, vendors, customers, and portal users are not billable seats.</p>
      <div className="my-5 border-t"/>
      {pricing.manualQuoteRequired ? <div className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">Enterprise pricing requires an approved quote or administrator override.</div> : <BillingActions hasSubscription={Boolean(data.hasSubscription)} organizationSlug={organizationSlug}/>}
      {pricing.override && <p className="mt-4 text-xs font-medium text-amber-800">A contracted pricing override is active.</p>}
    </aside>
  </div>;
}

export function ModulePage({ module, data, organizationSlug }: { module: string; data: ModuleData; organizationSlug: string }) {
  const config = copy[module] ?? { title: module.replaceAll("-", " "), description: "Organization operations and records.", action: "Create record" };
  const operationalModules = new Set(["leads", "accounts", "deals", "tasks", "invoices", "banking", "automations"]);
  const platformModules = new Set(["reports", "team", "settings", "websites", "domains"]);
  const serviceModules = new Set(["cases", "campaigns", "calendar", "email", "payroll"]);
  const financeModules = new Set(["payments", "expenses", "vendors", "accounting"]);
  const platformOperations = new Set(["documents", "integrations", "bookings", "submissions"]);
  const communicationModules = new Set(["collaboration", "support", "payment-settings"]);
  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="ck-eyebrow">{organizationSlug.replaceAll("-", " ")}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{config.title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{config.description}</p></div>
        <QuickCreate label={config.action} module={module} organizationSlug={organizationSlug}/>
      </div>
      <div className="mt-6"><MetricGrid metrics={data.metrics} /></div>
      <div className="mt-4">
        {operationalModules.has(module) ? <OperationalWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : platformModules.has(module) ? <PlatformWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : serviceModules.has(module) ? <ServiceWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : financeModules.has(module) ? <FinanceWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : platformOperations.has(module) ? <PlatformOperationsWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : communicationModules.has(module) ? <CommunicationsWorkbench data={data} module={module} organizationSlug={organizationSlug}/>
          : module === "billing" ? <BillingView data={data} organizationSlug={organizationSlug} />
          : <DataExplorer module={module} records={data.records ?? []}/>}
      </div>
      {["invoices", "payments"].includes(module) && <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm"><span className="flex items-center gap-2"><CircleDollarSign className="text-amber-700" size={18} />Public collection pages use signed tokens and the tenant&apos;s configured payment provider.</span><Link className="font-semibold text-amber-800" href={`/p/${organizationSlug}`}>Open endpoint <ArrowRight className="inline" size={14} /></Link></div>}
      {module === "automations" && <div className="mt-4 rounded-lg border bg-[#1c1917] p-6 text-white"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="text-[#e8c96a]" size={18} />Automation canvas</div><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Triggers, conditions, delays, branches, and actions are stored as structured JSON so workflows remain inspectable and portable.</p></div>}
    </div>
  );
}
