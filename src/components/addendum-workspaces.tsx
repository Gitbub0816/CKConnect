import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Mail,
  MessageSquare,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Row = Record<string, unknown>;
type ModuleBundle = Record<string, { records?: Row[]; accounts?: Row[]; metrics?: Row[]; [key: string]: unknown } | null>;

const crmStages = [
  "PROSPECTING",
  "QUALIFICATION",
  "NEEDS_ANALYSIS",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
] as const;

const stageColors: Record<string, string> = {
  PROSPECTING: "#8892A8",
  QUALIFICATION: "#6366F1",
  NEEDS_ANALYSIS: "#818CF8",
  PROPOSAL: "#7C3AED",
  NEGOTIATION: "#F59E0B",
  CLOSED_WON: "#22C55E",
};

function list(data: ModuleBundle, key: string) {
  const moduleData = data[key];
  if (!moduleData) return [];
  if (Array.isArray(moduleData.records)) return moduleData.records;
  if (Array.isArray(moduleData.accounts)) return moduleData.accounts;
  return [];
}

function num(value: unknown) {
  return Number(value ?? 0);
}

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function TonePill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
      <div>
        <div className="ck-section-label">{eyebrow}</div>
        <h2 className="mt-1 text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  color,
  title,
  detail,
}: {
  icon: typeof Mail;
  color: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-[34px_1fr] gap-3 border-l-[3px] bg-white px-4 py-3" style={{ borderLeftColor: color }}>
      <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-700">
        <Icon size={15} />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export function CrmAddendumWorkspace({
  data,
  organizationSlug,
  section = "overview",
}: {
  data: ModuleBundle;
  organizationSlug: string;
  section?: string;
}) {
  const leads = list(data, "leads");
  const accounts = list(data, "accounts");
  const contacts = list(data, "contacts");
  const deals = list(data, "deals");
  const cases = list(data, "cases");
  const invoices = list(data, "invoices");
  const openDeals = deals.filter((deal) => !text(deal.stage).startsWith("CLOSED"));
  const weighted = openDeals.reduce((sum, deal) => sum + (num(deal.amount) * num(deal.probability)) / 100, 0);
  const atRisk = openDeals.filter((deal) => ["PAST_DUE", "NO_NEXT_STEP"].includes(text(deal.risk, "")));
  const overdueAr = invoices.filter((invoice) => num(invoice.balance) > 0 && num(invoice.daysPastDue) > 0);
  const base = `/app/${organizationSlug}`;
  const sectionLabel = section.replaceAll("-", " ");

  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TonePill tone="info">Relationship engine</TonePill>
              <span className="text-xs capitalize text-slate-500">{sectionLabel} · Addendum D implementation surface</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">CRM is the relationship, not the record</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This workspace puts leads, contacts, companies, deals, activities, invoices, cases, and follow-ups into one operating layer so the team sees what needs attention before a customer is lost.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Open pipeline", formatCurrency(openDeals.reduce((sum, deal) => sum + num(deal.amount), 0))],
              ["Weighted forecast", formatCurrency(weighted)],
              ["At-risk deals", atRisk.length.toLocaleString()],
              ["Overdue A/R alerts", overdueAr.length.toLocaleString()],
            ].map(([label, value]) => (
              <div className="rounded-2xl border bg-slate-50 p-4" key={label}>
                <div className="ck-section-label">{label}</div>
                <div className="data-metric mt-2 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 lg:grid-cols-4">
          {[
            ["Lead capture", `${leads.filter((lead) => text(lead.status) !== "CONVERTED").length} active`, `${base}/crm/leads`],
            ["Contact memory", `${contacts.length} people`, `${base}/crm/contacts`],
            ["Account 360", `${accounts.length} companies`, `${base}/crm/accounts`],
            ["Service context", `${cases.length} cases`, `${base}/crm/cases`],
          ].map(([label, value, href]) => (
            <Link className="group bg-white p-4 transition hover:bg-sky-50" href={href} key={label}>
              <div className="text-sm font-semibold">{label}</div>
              <div className="mt-2 data-metric text-xl font-semibold">{value}</div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                Open <ArrowRight className="transition group-hover:translate-x-1" size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Pipeline architecture" title="Board, forecast, and stage discipline">
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1">Board</span>
            <span className="rounded-full px-3 py-1 text-slate-500">Table</span>
            <span className="rounded-full px-3 py-1 text-slate-500">Forecast</span>
          </div>
        </SectionTitle>
        <div className="grid min-w-full gap-3 overflow-x-auto p-4 xl:grid-cols-6">
          {crmStages.map((stage) => {
            const stageDeals = deals.filter((deal) => text(deal.stage) === stage);
            const total = stageDeals.reduce((sum, deal) => sum + num(deal.amount), 0);
            return (
              <section className="min-w-[210px] rounded-2xl border bg-slate-50" key={stage} style={{ borderTop: `4px solid ${stageColors[stage]}` }}>
                <div className="border-b p-3">
                  <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">{stage.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatCurrency(total)} · {stageDeals.length} deals</div>
                </div>
                <div className="space-y-2 p-2">
                  {stageDeals.slice(0, 4).map((deal) => {
                    const stale = text(deal.risk, "") !== "ON_TRACK" && !stage.startsWith("CLOSED");
                    return (
                      <Link className={`block rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stale ? "border-l-4 border-l-amber-400" : ""}`} href={`${base}/deals`} key={text(deal.id)}>
                        <div className="text-sm font-semibold">{text(deal.name)}</div>
                        <div className="mt-1 text-xs text-slate-500">{text(deal.account)} · {num(deal.probability)}%</div>
                        <div className="data-metric mt-3 font-semibold">{formatCurrency(num(deal.amount))}</div>
                        {stale && <div className="mt-2 text-[10px] font-bold uppercase text-amber-700">{text(deal.risk).replaceAll("_", " ")}</div>}
                      </Link>
                    );
                  })}
                  <Link className="block rounded-xl border border-dashed p-3 text-center text-xs font-semibold text-slate-500 hover:bg-white" href={`${base}/crm/deals`}>
                    + Add deal
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Account 360" title="Relationship, revenue, service, and contact context" />
          <div className="divide-y">
            {accounts.slice(0, 5).map((account) => {
              const accountContacts = (account.contacts as Row[] | undefined) ?? [];
              const accountDeals = (account.deals as Row[] | undefined) ?? [];
              const accountInvoices = (account.invoices as Row[] | undefined) ?? [];
              return (
                <article className="grid gap-4 p-5 lg:grid-cols-[1fr_210px_210px]" key={text(account.id)}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TonePill tone={num(account.health) >= 85 ? "good" : "warn"}>{num(account.health)} health</TonePill>
                      <span className="text-xs text-slate-500">{text(account.industry, "Uncategorized")}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{text(account.name)}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {accountContacts.slice(0, 2).map((contact) => text(contact.name)).join(", ") || "No contacts"} · {accountDeals.length} opportunities
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="ck-section-label">CRM → Accounting</div>
                    <div className="data-metric mt-2 font-semibold">{formatCurrency(num(account.receivable))}</div>
                    <p className="mt-1 text-xs text-slate-500">open receivable</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="ck-section-label">Recent invoices</div>
                    <div className="mt-2 text-xs leading-5 text-slate-600">
                      {accountInvoices.slice(0, 2).map((invoice) => `${text(invoice.number)} ${formatCurrency(num(invoice.balance))}`).join(" · ") || "No invoices"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Unified timeline" title="Activity rhythm across modules" />
          <div className="space-y-2 bg-slate-50 p-4">
            <ActivityItem color="#6366F1" detail="Proposal follow-up queued from the deal stage requirements." icon={Mail} title="Email sent" />
            <ActivityItem color="#22C55E" detail="Payment posted; customer lifetime value and open A/R refreshed." icon={ReceiptText} title="Invoice event" />
            <ActivityItem color="#2563EB" detail="Customer space meeting added to collaboration and calendar." icon={CalendarClock} title="Meeting" />
            <ActivityItem color="#EF4444" detail={`${atRisk.length} opportunities need next-step or close-date attention.`} icon={CircleAlert} title="System alert" />
          </div>
        </section>
      </div>

      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Lead conversion and outreach" title="Qualification queue with natural next actions" />
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
          {leads.slice(0, 8).map((lead) => (
            <Link className="bg-white p-4 hover:bg-sky-50" href={`${base}/crm/leads`} key={text(lead.id)}>
              <div className="flex items-center justify-between gap-2">
                <TonePill tone={num(lead.score) >= 80 ? "bad" : num(lead.score) >= 60 ? "warn" : "neutral"}>{text(lead.priority)}</TonePill>
                <span className="data-metric text-lg font-semibold">{num(lead.score)}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{text(lead.name)}</h3>
              <p className="mt-1 text-xs text-slate-500">{text(lead.company)} · {text(lead.source)}</p>
              <p className="mt-3 text-xs font-semibold text-sky-700">{text(lead.recommendation)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AccountingAddendumWorkspace({
  data,
  organizationSlug,
}: {
  data: ModuleBundle;
  organizationSlug: string;
}) {
  const accounting = data.accounting;
  const entries = list(data, "accounting");
  const accounts = ((accounting?.accounts as Row[] | undefined) ?? []);
  const invoices = list(data, "invoices");
  const payments = list(data, "payments");
  const vendors = list(data, "vendors");
  const expenses = list(data, "expenses");
  const products = list(data, "products");
  const statements = (accounting?.statements as Row | undefined) ?? {};
  const totalDebits = entries.reduce((sum, entry) => sum + num(entry.debit), 0);
  const totalCredits = entries.reduce((sum, entry) => sum + num(entry.credit), 0);
  const exportBase = `/api/accounting/export?organizationSlug=${encodeURIComponent(organizationSlug)}`;
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const base = `/app/${organizationSlug}`;

  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TonePill tone={balanced ? "good" : "bad"}>{balanced ? "Balanced ledger" : "Control difference"}</TonePill>
              <span className="text-xs text-slate-500">Every financial action must post through the ledger</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Accounting has physics</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This workspace is organized around the Addendum C engine: transaction processing, invoice state, bank reconciliation, A/R, A/P, chart of accounts, period close, and executable reports.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Debits", formatCurrency(totalDebits)],
              ["Credits", formatCurrency(totalCredits)],
              ["Difference", formatCurrency(totalDebits - totalCredits)],
            ].map(([label, value]) => (
              <div className="rounded-2xl border bg-slate-50 p-4" key={label}>
                <div className="ck-section-label">{label}</div>
                <div className="data-metric mt-2 text-xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-6">
            {([
              ["New invoice", `${base}/accounting/sales-invoices`, FileText],
              ["Receive payment", `${base}/accounting/payments-deposits`, Banknote],
              ["Enter bill", `${base}/accounting/vendors-bills`, ReceiptText],
              ["Bank feed", `${base}/accounting/bank-transactions`, Landmark],
              ["Close books", `${base}/accounting/close-books`, ShieldCheck],
              ["Reports", `${base}/accounting/reports`, FileSpreadsheet],
            ] as Array<[string, string, LucideIcon]>).map(([label, href, Icon]) => (
            <Link className="flex items-center gap-3 bg-white p-4 text-sm font-semibold hover:bg-emerald-50" href={String(href)} key={String(label)}>
              <Icon className="text-emerald-600" size={17} />
              {String(label)}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Transaction processor" title="Journal register and reversal discipline" />
          <div className="divide-y">
            {entries.slice(0, 7).map((entry) => (
              <article className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]" key={text(entry.id)}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpenCheck className="text-emerald-600" size={16} />
                    <strong>{text(entry.number)}</strong>
                    <TonePill tone={text(entry.status) === "POSTED" ? "good" : "neutral"}>{text(entry.status)}</TonePill>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{text(entry.description)}</p>
                  <p className="mt-1 text-xs text-slate-500">{text(entry.source)} · {text(entry.date)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-right text-xs">
                  <div><span className="block text-slate-400">DR</span><strong className="data-metric">{formatCurrency(num(entry.debit))}</strong></div>
                  <div><span className="block text-slate-400">CR</span><strong className="data-metric">{formatCurrency(num(entry.credit))}</strong></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Invoice state machine" title="Draft → sent → viewed → partial → paid → void" />
          <div className="divide-y">
            {invoices.slice(0, 6).map((invoice) => (
              <article className="p-4" key={text(invoice.id)}>
                <div className={`rounded-xl border-l-4 p-4 ${num(invoice.daysPastDue) > 0 ? "border-l-red-500 bg-red-50" : num(invoice.balance) === 0 ? "border-l-emerald-500 bg-emerald-50" : "border-l-amber-500 bg-amber-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex gap-2"><TonePill tone={num(invoice.daysPastDue) > 0 ? "bad" : num(invoice.balance) === 0 ? "good" : "warn"}>{text(invoice.status)}</TonePill><TonePill>{text(invoice.generationSource)}</TonePill></div>
                      <h3 className="mt-2 font-semibold">{text(invoice.number)} · {text(invoice.customer)}</h3>
                      <p className="mt-1 text-xs text-slate-500">{text(invoice.nextCollectionAction)}</p>
                    </div>
                    <div className="text-right">
                      <div className="ck-section-label">Balance due</div>
                      <div className="data-metric mt-1 text-xl font-semibold">{formatCurrency(num(invoice.balance))}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a className="ck-button ck-button-secondary !min-h-9" href={text(invoice.pdfUrl, "#")} target="_blank" rel="noreferrer">PDF</a>
                    <Link className="ck-button ck-button-secondary !min-h-9" href={`${base}/invoices`}>Open workflow</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Reports and Excel bridge" title="Executable exports, imports, statements, and accountant handoff" />
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Full workbook", "workbook", "xlsx"],
            ["Raw ledger", "ledger", "csv"],
            ["Trial balance", "trial-balance", "xlsx"],
            ["Statements", "statements", "xlsx"],
            ["Import template", "import-template", "xlsx"],
          ].map(([label, report, format]) => (
            <a className="bg-white p-4 hover:bg-emerald-50" href={`${exportBase}&report=${report}&format=${format}`} key={label}>
              <FileSpreadsheet className="text-emerald-600" size={18} />
              <div className="mt-3 text-sm font-semibold">{label}</div>
              <div className="mt-1 text-xs uppercase text-slate-500">{format}</div>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="ck-card overflow-hidden xl:col-span-2">
          <SectionTitle eyebrow="Ledger aesthetic" title="Chart of accounts and statement snapshot" />
          <div className="grid gap-px bg-slate-200 lg:grid-cols-[1fr_320px]">
            <div className="bg-white">
              {accounts.slice(0, 10).map((account, index) => (
                <div className={`grid grid-cols-[80px_1fr_auto] gap-3 px-4 py-3 text-sm ${index % 2 ? "bg-[#F8F9FB]" : ""}`} key={text(account.id)}>
                  <span className="font-mono text-slate-400">{text(account.code)}</span>
                  <span className="font-semibold">{text(account.name)}</span>
                  <span className="money">{formatCurrency(num(account.balance))}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-4">
              {[
                ["Assets", statements.assets],
                ["Liabilities", statements.liabilities],
                ["Equity", statements.equity],
                ["Income", statements.income],
                ["Expenses", statements.expenses],
              ].map(([label, value]) => (
                <div className="flex justify-between border-b py-3 text-sm" key={String(label)}>
                  <span>{String(label)}</span>
                  <strong className="money">{formatCurrency(num(value))}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Operating queues" title="A/R, A/P, expenses, inventory" />
          <div className="divide-y">
            {([
              ["Open invoices", invoices.filter((invoice) => num(invoice.balance) > 0).length, FileText],
              ["Payments", payments.length, CheckCircle2],
              ["Vendors", vendors.length, Users],
              ["Expenses", expenses.length, ReceiptText],
              ["Products/services", products.length, ClipboardList],
            ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
              <div className="flex items-center justify-between p-4" key={String(label)}>
                <span className="flex items-center gap-2 text-sm font-semibold"><Icon className="text-emerald-600" size={16} />{String(label)}</span>
                <strong className="data-metric">{Number(value).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function CollaborationAddendumWorkspace({
  channels,
  calendar,
}: {
  channels: Row[];
  calendar: Row[];
}) {
  const active = channels[0];
  const messages = ((active?.messages as Row[] | undefined) ?? []);
  return (
    <section className="ck-card overflow-hidden border-slate-800 bg-[#16191F] text-white">
      <div className="grid min-h-[760px] lg:grid-cols-[280px_1fr_320px]">
        <aside className="border-r border-white/10 bg-[#1A1F2B]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Workspace</div>
                <h2 className="mt-1 font-semibold">Channels</h2>
              </div>
              <Hash className="text-blue-300" size={18} />
            </div>
            <label className="relative mt-4 block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={14} />
              <input className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35" placeholder="Search messages, files, people..." readOnly />
            </label>
          </div>
          <nav className="space-y-5 p-3">
            {["Core team", "Customer spaces", "Threads"].map((group) => (
              <div key={group}>
                <div className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">{group}</div>
                <div className="mt-2 space-y-1">
                  {channels.slice(0, 5).map((channel, index) => (
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-blue-600 text-white" : "text-white/65 hover:bg-white/7"}`} key={`${group}-${text(channel.id)}`}>
                      <span className="flex min-w-0 items-center gap-2"><Hash size={14} /><span className="truncate">{text(channel.name)}</span></span>
                      {index < 2 && <span className="rounded-full bg-white/15 px-1.5 text-[10px]">{index + 1}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-col">
          <header className="border-b border-white/10 bg-[#1A1F2B] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><MessageSquare className="text-blue-300" size={17} /><h3 className="font-semibold">#{text(active?.name, "operations")}</h3><TonePill tone="info">{text(active?.visibility, "members")}</TonePill></div>
                <p className="mt-1 text-xs text-white/45">{text(active?.description, "Team operating channel with CRM and accounting context.")}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">Threads</button>
                <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">Files</button>
                <button className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold">Start meeting</button>
              </div>
            </div>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-center">
              <strong>This channel is connected to business context</strong>
              <p className="mt-1 text-xs text-white/45">Stage changes, invoice payments, files, meetings, Kira responses, and customer messages stay attached here.</p>
            </div>
            {messages.map((message) => (
              <article className="grid grid-cols-[40px_1fr] gap-3" key={text(message.id)}>
                <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-xs font-bold">{text(message.author).slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="flex items-baseline gap-2"><strong className="text-sm">{text(message.author)}</strong><time className="text-[10px] text-white/35">{text(message.createdAt)}</time></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/75">{text(message.body)}</p>
                  <div className="mt-2 flex gap-1 text-[11px] text-white/45"><span>Reply</span><span>·</span><span>React</span><span>·</span><span>Pin</span></div>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-white/10 bg-[#1A1F2B] p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2 text-xs text-white/55">
                <span>/kira</span><span>@mention</span><span>Attach file</span><span>Create task</span>
              </div>
              <div className="flex items-center gap-3 pt-3">
                <span className="flex-1 text-sm text-white/35">Message #{text(active?.name, "operations")}</span>
                <button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold">Send</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="border-l border-white/10 bg-[#1A1F2B] p-4">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Presence</div>
            <div className="mt-3 space-y-3">
              {["Available", "In a meeting", "Deep focus"].map((status, index) => (
                <div className="flex items-center gap-3 text-sm" key={status}>
                  <span className={`size-2 rounded-full ${index === 0 ? "bg-emerald-400" : index === 1 ? "bg-amber-400" : "bg-blue-400"}`} />
                  {status}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Upcoming meetings</div>
            <div className="mt-3 space-y-3">
              {calendar.slice(0, 4).map((event) => (
                <div className="rounded-xl bg-black/20 p-3 text-xs" key={text(event.id)}>
                  <strong>{text(event.title)}</strong>
                  <div className="mt-1 text-white/45">{text(event.startsAt)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">File hub</div>
            <div className="mt-3 space-y-2 text-xs text-white/65">
              <div>Proposal_Final.pdf</div>
              <div>Revenue_Tracker.xlsx</div>
              <div>Customer_Logo.png</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
