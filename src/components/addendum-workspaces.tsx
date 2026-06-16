import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Mail,
  MessageSquare,
  Package,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  completeTask,
  updateCaseWorkflow,
} from "@/app/app/[organizationSlug]/actions";
import { OperationalWorkbench } from "@/components/operational-workbench";
import { FinanceWorkbench } from "@/components/finance-workbenches";
import { ServiceWorkbench } from "@/components/service-workbenches";
import { RecordOperationsWorkbench } from "@/components/record-operations-workbench";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

type Row = Record<string, unknown>;
type ModuleBundle = Record<
  string,
  | { records?: Row[]; accounts?: Row[]; metrics?: Row[]; [key: string]: unknown }
  | null
>;

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
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
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
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
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
    <div
      className="grid grid-cols-[34px_1fr] gap-3 border-l-[3px] bg-white px-4 py-3"
      style={{ borderLeftColor: color }}
    >
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

function PlaceholderSection({
  icon: Icon,
  label,
  title,
  description,
  href,
  linkLabel,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <section className="ck-card overflow-hidden">
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-slate-100">
          <Icon className="text-slate-400" size={26} />
        </div>
        <div>
          <div className="ck-section-label">{label}</div>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        {href && (
          <Link
            className="ck-button ck-button-primary inline-flex items-center gap-2"
            href={href}
          >
            {linkLabel ?? "Open"} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── CRM section views ────────────────────────────────────────────────────────

function CrmOverviewSection({
  leads,
  accounts,
  contacts,
  deals,
  cases,
  invoices,
  atRisk,
  overdueAr,
  weighted,
  base,
}: {
  leads: Row[];
  accounts: Row[];
  contacts: Row[];
  deals: Row[];
  cases: Row[];
  invoices: Row[];
  atRisk: Row[];
  overdueAr: Row[];
  weighted: number;
  base: string;
}) {
  const openDeals = deals.filter((d) => !text(d.stage).startsWith("CLOSED"));
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TonePill tone="info">Relationship engine</TonePill>
              <span className="text-xs text-slate-500">Addendum D implementation surface</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">CRM is the relationship, not the record</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This workspace puts leads, contacts, companies, deals, activities, invoices, cases, and follow-ups into one operating layer so the team sees what needs attention before a customer is lost.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Open pipeline", formatCurrency(openDeals.reduce((s, d) => s + num(d.amount), 0))],
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
            ["Lead capture", `${leads.filter((l) => text(l.status) !== "CONVERTED").length} active`, `${base}/crm/leads`],
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
            const stageDeals = deals.filter((d) => text(d.stage) === stage);
            const total = stageDeals.reduce((s, d) => s + num(d.amount), 0);
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
                      <Link className={`block rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stale ? "border-l-4 border-l-amber-400" : ""}`} href={`${base}/deals/${text(deal.id)}`} key={text(deal.id)}>
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
              const ac = (account.contacts as Row[] | undefined) ?? [];
              const ad = (account.deals as Row[] | undefined) ?? [];
              const ai = (account.invoices as Row[] | undefined) ?? [];
              return (
                <article className="grid gap-4 p-5 lg:grid-cols-[1fr_210px_210px_auto]" key={text(account.id)}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TonePill tone={num(account.health) >= 85 ? "good" : "warn"}>{num(account.health)} health</TonePill>
                      <span className="text-xs text-slate-500">{text(account.industry, "Uncategorized")}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{text(account.name)}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {ac.slice(0, 2).map((c) => text(c.name)).join(", ") || "No contacts"} · {ad.length} opportunities
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
                      {ai.slice(0, 2).map((inv) => `${text(inv.number)} ${formatCurrency(num(inv.balance))}`).join(" · ") || "No invoices"}
                    </div>
                  </div>
                  <Link className="flex items-center gap-1 self-center text-xs font-semibold text-sky-700 hover:underline" href={`${base}/accounts/${text(account.id)}`}>
                    Open 360 <ArrowRight size={13} />
                  </Link>
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
            <Link className="bg-white p-4 hover:bg-sky-50" href={`${base}/leads/${text(lead.id)}`} key={text(lead.id)}>
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

function CrmLeadsSection({ leads, base }: { leads: Row[]; base: string }) {
  const unconverted = leads.filter((l) => text(l.status) !== "CONVERTED");
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-4">
          {[
            ["Total leads", leads.length],
            ["Hot (≥80)", leads.filter((l) => num(l.score) >= 80).length],
            ["Warm (60–79)", leads.filter((l) => num(l.score) >= 60 && num(l.score) < 80).length],
            ["Cold (<60)", leads.filter((l) => num(l.score) < 60).length],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Qualification queue" title="All leads with scoring, source, and next action">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/crm/leads`}>New lead</Link>
        </SectionTitle>
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
          {unconverted.map((lead) => (
            <Link className="block bg-white p-4 hover:bg-sky-50" href={`${base}/leads/${text(lead.id)}`} key={text(lead.id)}>
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

function CrmDealsSection({ deals, base }: { deals: Row[]; base: string }) {
  const openDeals = deals.filter((d) => !text(d.stage).startsWith("CLOSED"));
  const weighted = openDeals.reduce((s, d) => s + (num(d.amount) * num(d.probability)) / 100, 0);
  const atRisk = openDeals.filter((d) => ["PAST_DUE", "NO_NEXT_STEP"].includes(text(d.risk, "")));
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Open pipeline", formatCurrency(openDeals.reduce((s, d) => s + num(d.amount), 0))],
            ["Weighted forecast", formatCurrency(weighted)],
            ["At-risk deals", atRisk.length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Pipeline board" title="Stage discipline with forecast and at-risk flags">
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1">Board</span>
            <span className="rounded-full px-3 py-1 text-slate-500">Forecast</span>
          </div>
        </SectionTitle>
        <div className="grid min-w-full gap-3 overflow-x-auto p-4 xl:grid-cols-6">
          {crmStages.map((stage) => {
            const sd = deals.filter((d) => text(d.stage) === stage);
            const total = sd.reduce((s, d) => s + num(d.amount), 0);
            return (
              <section className="min-w-[210px] rounded-2xl border bg-slate-50" key={stage} style={{ borderTop: `4px solid ${stageColors[stage]}` }}>
                <div className="border-b p-3">
                  <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">{stage.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatCurrency(total)} · {sd.length} deals</div>
                </div>
                <div className="space-y-2 p-2">
                  {sd.slice(0, 6).map((deal) => {
                    const stale = text(deal.risk, "") !== "ON_TRACK" && !stage.startsWith("CLOSED");
                    return (
                      <Link className={`block rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 ${stale ? "border-l-4 border-l-amber-400" : ""}`} href={`${base}/deals/${text(deal.id)}`} key={text(deal.id)}>
                        <div className="text-sm font-semibold">{text(deal.name)}</div>
                        <div className="mt-1 text-xs text-slate-500">{text(deal.account)} · {num(deal.probability)}%</div>
                        <div className="data-metric mt-3 font-semibold">{formatCurrency(num(deal.amount))}</div>
                        {stale && <div className="mt-2 text-[10px] font-bold uppercase text-amber-700">{text(deal.risk).replaceAll("_", " ")}</div>}
                      </Link>
                    );
                  })}
                  <Link className="block rounded-xl border border-dashed p-3 text-center text-xs font-semibold text-slate-500 hover:bg-white" href={`${base}/crm/deals`}>+ Add deal</Link>
                </div>
              </section>
            );
          })}
        </div>
      </section>
      {atRisk.length > 0 && (
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Attention required" title="At-risk deals needing next step or updated close date" />
          <div className="divide-y">
            {atRisk.map((deal) => (
              <Link className="flex items-center justify-between gap-4 p-4 hover:bg-amber-50" href={`${base}/deals/${text(deal.id)}`} key={text(deal.id)}>
                <div>
                  <div className="flex gap-2">
                    <TonePill tone="warn">{text(deal.risk).replaceAll("_", " ")}</TonePill>
                    <TonePill tone="neutral">{text(deal.stage).replaceAll("_", " ")}</TonePill>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{text(deal.name)}</h3>
                  <p className="text-xs text-slate-500">{text(deal.account)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="ck-section-label">Amount</div>
                    <div className="data-metric mt-1 font-semibold">{formatCurrency(num(deal.amount))}</div>
                  </div>
                  <ArrowRight className="text-slate-400" size={16} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CrmAccountsSection({ accounts, base }: { accounts: Row[]; base: string }) {
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total accounts", accounts.length.toLocaleString()],
            ["Healthy (≥85)", accounts.filter((a) => num(a.health) >= 85).length.toLocaleString()],
            ["Needs attention", accounts.filter((a) => num(a.health) < 70).length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Account 360" title="Relationship, revenue, service, and contact context">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/crm/accounts`}>New account</Link>
        </SectionTitle>
        <div className="divide-y">
          {accounts.map((account) => {
            const ac = (account.contacts as Row[] | undefined) ?? [];
            const ad = (account.deals as Row[] | undefined) ?? [];
            const ai = (account.invoices as Row[] | undefined) ?? [];
            return (
              <article className="grid gap-4 p-5 lg:grid-cols-[1fr_200px_200px_auto]" key={text(account.id)}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TonePill tone={num(account.health) >= 85 ? "good" : num(account.health) >= 70 ? "warn" : "bad"}>{num(account.health)} health</TonePill>
                    <span className="text-xs text-slate-500">{text(account.industry, "Uncategorized")}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">
                    <Link className="hover:text-[#8b6914] hover:underline" href={`${base}/accounts/${text(account.id)}`}>{text(account.name)}</Link>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{ac.slice(0, 2).map((c) => text(c.name)).join(", ") || "No contacts"} · {ad.length} opportunities</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="ck-section-label">Open A/R</div>
                  <div className="data-metric mt-2 font-semibold">{formatCurrency(num(account.receivable))}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="ck-section-label">Recent invoices</div>
                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    {ai.slice(0, 2).map((inv) => `${text(inv.number)} ${formatCurrency(num(inv.balance))}`).join(" · ") || "No invoices"}
                  </div>
                </div>
                <Link className="flex items-center self-center text-[#8b6914] hover:underline" href={`${base}/accounts/${text(account.id)}`}>
                  <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CrmContactsSection({ contacts, base }: { contacts: Row[]; base: string }) {
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total contacts", contacts.length.toLocaleString()],
            ["High score (≥70)", contacts.filter((c) => num(c.leadScore) >= 70).length.toLocaleString()],
            ["With email", contacts.filter((c) => text(c.email) !== "—").length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Contact memory" title="People, lead scores, and relationship context">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/crm/contacts`}>New contact</Link>
        </SectionTitle>
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact) => (
            <Link className="block bg-white p-4 hover:bg-sky-50" href={`${base}/contacts/${text(contact.id)}`} key={text(contact.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{text(contact.name)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(contact.account, "No company")}</p>
                </div>
                <TonePill tone={num(contact.leadScore) >= 70 ? "good" : num(contact.leadScore) >= 40 ? "warn" : "neutral"}>
                  {num(contact.leadScore)} score
                </TonePill>
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
                {text(contact.email) !== "—" && (
                  <span className="flex items-center gap-1.5"><Mail size={11} /> {text(contact.email)}</span>
                )}
                {text(contact.phone) !== "—" && (
                  <span className="flex items-center gap-1.5"><Phone size={11} /> {text(contact.phone)}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {text(contact.title) !== "—" && <TonePill>{text(contact.title)}</TonePill>}
                {text(contact.lifecycleStage) !== "—" && <TonePill tone="info">{text(contact.lifecycleStage)}</TonePill>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function CrmCasesSection({ cases, base, organizationSlug }: { cases: Row[]; base: string; organizationSlug: string }) {
  const open = cases.filter((c) => !["RESOLVED", "CLOSED"].includes(text(c.status)));
  const critical = cases.filter((c) => text(c.severity) === "CRITICAL");
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Open cases", open.length.toLocaleString()],
            ["Critical", critical.length.toLocaleString()],
            ["Total", cases.length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Service queue" title="Support cases with priority and severity classification">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/crm/cases`}>New case</Link>
        </SectionTitle>
        <div className="divide-y">
          {cases.map((c) => {
            const isClosed = ["RESOLVED", "CLOSED"].includes(text(c.status));
            return (
              <article className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]" key={text(c.id)}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TonePill tone={text(c.severity) === "CRITICAL" ? "bad" : text(c.severity) === "HIGH" ? "warn" : "neutral"}>{text(c.severity)}</TonePill>
                    <TonePill tone={isClosed ? "good" : "info"}>{text(c.status)}</TonePill>
                    <TonePill tone={text(c.priority) === "HIGH" ? "bad" : text(c.priority) === "MEDIUM" ? "warn" : "neutral"}>{text(c.priority)}</TonePill>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{text(c.number)} · {text(c.subject)}</h3>
                  <p className="mt-1 text-xs text-slate-500">{text(c.account)} · Assigned to {text(c.assignee, "Unassigned")}</p>
                </div>
                {!isClosed && (
                  <form action={updateCaseWorkflow} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
                    <input name="organizationSlug" type="hidden" value={organizationSlug} />
                    <input name="entityId" type="hidden" value={text(c.id)} />
                    <select className="ck-input text-xs" name="status">
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="PENDING_CUSTOMER">Pending customer</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <input className="ck-input text-xs" name="resolution" placeholder="Resolution note (required to close)" />
                    <button className="ck-button !py-1.5 text-xs" type="submit">Update status</button>
                  </form>
                )}
              </article>
            );
          })}
          {!cases.length && (
            <div className="p-8 text-center text-sm text-slate-400">No cases yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function CrmTasksSection({ tasks, base, organizationSlug }: { tasks: Row[]; base: string; organizationSlug: string }) {
  const pending = tasks.filter((t) => !["DONE", "CANCELLED"].includes(text(t.status)));
  const overdue = pending.filter((t) => text(t.dueDate) !== "—" && new Date(text(t.dueDate)) < new Date());
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Pending", pending.length.toLocaleString()],
            ["Overdue", overdue.length.toLocaleString()],
            ["Total", tasks.length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Task management" title="Follow-ups, calls, and work items">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/tasks`}>New task</Link>
        </SectionTitle>
        <div className="divide-y">
          {tasks.map((task) => {
            const isDone = text(task.status) === "DONE";
            const isOverdue = !isDone && text(task.dueDate) !== "—" && new Date(text(task.dueDate)) < new Date();
            return (
              <article className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]" key={text(task.id)}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${isDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`} />
                  <div>
                    <div className="text-sm font-semibold">{text(task.title)}</div>
                    <p className="mt-1 text-xs text-slate-500">
                      {text(task.relatedTo, "No relation")} · <span className={isOverdue ? "font-semibold text-red-600" : ""}>Due {text(task.dueDate)}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <TonePill tone={text(task.priority) === "HIGH" ? "bad" : text(task.priority) === "MEDIUM" ? "warn" : "neutral"}>{text(task.priority)}</TonePill>
                      {isOverdue && <TonePill tone="bad">Overdue</TonePill>}
                    </div>
                  </div>
                </div>
                {!isDone && (
                  <form action={completeTask}>
                    <input name="organizationSlug" type="hidden" value={organizationSlug} />
                    <input name="entityId" type="hidden" value={text(task.id)} />
                    <button className="ck-button ck-button-secondary !py-1.5 text-xs" type="submit">Mark done</button>
                  </form>
                )}
              </article>
            );
          })}
          {!tasks.length && (
            <div className="p-8 text-center text-sm text-slate-400">No tasks yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Accounting section views ─────────────────────────────────────────────────

function AccountingOverviewSection({
  accounting,
  entries,
  accounts,
  invoices,
  payments,
  vendors,
  expenses,
  products,
  statements,
  balanced,
  totalDebits,
  totalCredits,
  exportBase,
  base,
}: {
  accounting: Row | null;
  entries: Row[];
  accounts: Row[];
  invoices: Row[];
  payments: Row[];
  vendors: Row[];
  expenses: Row[];
  products: Row[];
  statements: Row;
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  exportBase: string;
  base: string;
}) {
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
                      <div className="flex gap-2">
                        <TonePill tone={num(invoice.daysPastDue) > 0 ? "bad" : num(invoice.balance) === 0 ? "good" : "warn"}>{text(invoice.status)}</TonePill>
                        <TonePill>{text(invoice.generationSource)}</TonePill>
                      </div>
                      <h3 className="mt-2 font-semibold">{text(invoice.number)} · {text(invoice.customer)}</h3>
                      <p className="mt-1 text-xs text-slate-500">{text(invoice.nextCollectionAction)}</p>
                    </div>
                    <div className="text-right">
                      <div className="ck-section-label">Balance due</div>
                      <div className="data-metric mt-1 text-xl font-semibold">{formatCurrency(num(invoice.balance))}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {text(invoice.pdfUrl) !== "—" && <a className="ck-button ck-button-secondary !min-h-9" href={text(invoice.pdfUrl, "#")} target="_blank" rel="noreferrer">PDF</a>}
                    <Link className="ck-button ck-button-secondary !min-h-9" href={`${base}/invoices/${text(invoice.id)}`}>Open invoice</Link>
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
              ["Open invoices", invoices.filter((inv) => num(inv.balance) > 0).length, FileText],
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

function AccountingSalesInvoicesSection({ invoices, base, exportBase }: { invoices: Row[]; base: string; exportBase: string }) {
  const open = invoices.filter((inv) => num(inv.balance) > 0);
  const overdue = invoices.filter((inv) => num(inv.balance) > 0 && num(inv.daysPastDue) > 0);
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-4">
          {[
            ["Total invoices", invoices.length.toLocaleString()],
            ["Open A/R", formatCurrency(open.reduce((s, inv) => s + num(inv.balance), 0))],
            ["Overdue", overdue.length.toLocaleString()],
            ["Paid", invoices.filter((inv) => num(inv.balance) === 0).length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Invoice state machine" title="Draft → sent → viewed → partial → paid → void">
          <div className="flex gap-2">
            <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/sales-invoices`}>New invoice</Link>
            <a className="ck-button ck-button-secondary text-xs" href={`${exportBase}&report=invoices&format=xlsx`}>Export</a>
          </div>
        </SectionTitle>
        <div className="divide-y">
          {invoices.map((invoice) => (
            <article className="p-4" key={text(invoice.id)}>
              <div className={`rounded-xl border-l-4 p-4 ${num(invoice.daysPastDue) > 0 ? "border-l-red-500 bg-red-50" : num(invoice.balance) === 0 ? "border-l-emerald-500 bg-emerald-50" : "border-l-amber-500 bg-amber-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex gap-2">
                      <TonePill tone={num(invoice.daysPastDue) > 0 ? "bad" : num(invoice.balance) === 0 ? "good" : "warn"}>{text(invoice.status)}</TonePill>
                      <TonePill>{text(invoice.generationSource)}</TonePill>
                    </div>
                    <h3 className="mt-2 font-semibold">{text(invoice.number)} · {text(invoice.customer)}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {num(invoice.daysPastDue) > 0 ? `${num(invoice.daysPastDue)} days past due · ` : ""}{text(invoice.nextCollectionAction)}
                    </p>
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
  );
}

function AccountingPaymentsSection({ payments, base }: { payments: Row[]; base: string }) {
  const total = payments.reduce((s, p) => s + num(p.amount), 0);
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total payments", payments.length.toLocaleString()],
            ["Total received", formatCurrency(total)],
            ["Methods", [...new Set(payments.map((p) => text(p.method, "Unknown")))].length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Payments &amp; deposits" title="Received payments with method and posting date">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/payments-deposits`}>Receive payment</Link>
        </SectionTitle>
        <div className="divide-y">
          {payments.map((payment) => (
            <article className="flex items-center justify-between gap-4 p-4" key={text(payment.id)}>
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-50">
                  <CreditCard className="text-emerald-600" size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{text(payment.reference)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(payment.customer)} · {text(payment.method)} · {text(payment.postedAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <TonePill tone="good">Received</TonePill>
                <div className="data-metric mt-2 font-semibold">{formatCurrency(num(payment.amount))}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountingProductsSection({ products, base }: { products: Row[]; base: string }) {
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total items", products.length.toLocaleString()],
            ["Services", products.filter((p) => text(p.type) === "SERVICE").length.toLocaleString()],
            ["Products", products.filter((p) => text(p.type) === "PRODUCT").length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Product catalog" title="Services and products available for invoicing">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/products-services`}>New item</Link>
        </SectionTitle>
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div className="bg-white p-4" key={text(product.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid size-9 place-items-center rounded-lg bg-slate-100">
                  {text(product.type) === "SERVICE" ? <Tag className="text-slate-500" size={16} /> : <Package className="text-slate-500" size={16} />}
                </div>
                <TonePill tone={String(product.taxable) === "true" ? "info" : "neutral"}>
                  {String(product.taxable) === "true" ? "Taxable" : "Non-taxable"}
                </TonePill>
              </div>
              <div className="mt-3">
                <div className="text-sm font-semibold">{text(product.name)}</div>
                <p className="mt-1 text-xs text-slate-500">{text(product.type)} · {text(product.description, "No description")}</p>
              </div>
              <div className="data-metric mt-3 font-semibold">{formatCurrency(num(product.price))}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountingVendorsSection({ vendors, base }: { vendors: Row[]; base: string }) {
  const totalAP = vendors.reduce((s, v) => s + num(v.openBalance), 0);
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total vendors", vendors.length.toLocaleString()],
            ["Open A/P", formatCurrency(totalAP)],
            ["With open bills", vendors.filter((v) => num(v.openBalance) > 0).length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Vendor management" title="Supplier records, open bills, and payment terms">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/vendors-bills`}>New vendor</Link>
        </SectionTitle>
        <div className="divide-y">
          {vendors.map((vendor) => (
            <article className="flex items-center justify-between gap-4 p-4" key={text(vendor.id)}>
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-slate-100">
                  <Building2 className="text-slate-500" size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{text(vendor.name)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(vendor.type)} · Terms: {text(vendor.paymentTerms, "Net 30")}</p>
                </div>
              </div>
              <div className="text-right">
                {num(vendor.openBalance) > 0 && <TonePill tone="warn">Open bill</TonePill>}
                <div className="data-metric mt-2 font-semibold">{formatCurrency(num(vendor.openBalance))}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountingExpensesSection({ expenses, base }: { expenses: Row[]; base: string }) {
  const total = expenses.reduce((s, e) => s + num(e.amount), 0);
  const withReceipt = expenses.filter((e) => text(e.receiptUrl) !== "—");
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total expenses", expenses.length.toLocaleString()],
            ["Total amount", formatCurrency(total)],
            ["With receipt", withReceipt.length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Expense management" title="Category expenses with receipt tracking and posting">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/expenses-receipts`}>New expense</Link>
        </SectionTitle>
        <div className="divide-y">
          {expenses.map((expense) => (
            <article className="flex items-center justify-between gap-4 p-4" key={text(expense.id)}>
              <div>
                <div className="flex gap-2">
                  <TonePill>{text(expense.category)}</TonePill>
                  <TonePill tone={text(expense.receiptUrl) !== "—" ? "good" : "warn"}>
                    {text(expense.receiptUrl) !== "—" ? "Receipt" : "No receipt"}
                  </TonePill>
                </div>
                <h3 className="mt-2 text-sm font-semibold">{text(expense.description, text(expense.category))}</h3>
                <p className="mt-1 text-xs text-slate-500">{text(expense.vendor, "No vendor")} · {text(expense.date)}</p>
              </div>
              <div className="text-right">
                <div className="data-metric font-semibold">{formatCurrency(num(expense.amount))}</div>
                {text(expense.receiptUrl) !== "—" && (
                  <a className="mt-2 block text-xs font-semibold text-sky-600 hover:underline" href={text(expense.receiptUrl)} target="_blank" rel="noreferrer">View receipt</a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountingBankTransactionsSection({
  bankingData,
  base,
}: {
  bankingData: { records?: Row[]; [key: string]: unknown } | null;
  base: string;
}) {
  const bankAccounts = (bankingData?.records as Row[] | undefined) ?? [];
  const totalBalance = bankAccounts.reduce((s, a) => s + num(a.currentBalance), 0);
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Bank accounts", bankAccounts.length.toLocaleString()],
            ["Total cash", formatCurrency(totalBalance)],
            ["Needs reconciliation", bankAccounts.filter((a) => text(a.reconciliationStatus) !== "RECONCILED").length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Bank feed" title="Connected accounts and transaction register">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/bank-transactions`}>Connect bank</Link>
        </SectionTitle>
        <div className="divide-y">
          {bankAccounts.map((account) => (
            <article className="flex items-center justify-between gap-4 p-4" key={text(account.id)}>
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-slate-100">
                  <Landmark className="text-slate-500" size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{text(account.name)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(account.institution)} · {text(account.accountType)} · ···{text(account.last4, "****")}</p>
                </div>
              </div>
              <div className="text-right">
                <TonePill tone={text(account.reconciliationStatus) === "RECONCILED" ? "good" : "warn"}>{text(account.reconciliationStatus)}</TonePill>
                <div className="data-metric mt-2 font-semibold">{formatCurrency(num(account.currentBalance))}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountingReconciliationSection({
  bankingData,
  base,
}: {
  bankingData: { records?: Row[]; reconciliations?: Row[]; [key: string]: unknown } | null;
  base: string;
}) {
  const bankAccounts = (bankingData?.records as Row[] | undefined) ?? [];
  const reconciliations = (bankingData?.reconciliations as Row[] | undefined) ?? [];
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Reconciliation center" title="Book vs. bank balance comparison per account">
          <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/reconciliation`}>Start reconciliation</Link>
        </SectionTitle>
        <div className="divide-y">
          {bankAccounts.map((account) => {
            const diff = num(account.currentBalance) - num(account.bookBalance);
            const reconciled = Math.abs(diff) < 0.01;
            return (
              <article className="grid gap-4 p-5 lg:grid-cols-[1fr_160px_160px_160px]" key={text(account.id)}>
                <div>
                  <TonePill tone={reconciled ? "good" : "warn"}>{reconciled ? "Reconciled" : "Difference"}</TonePill>
                  <h3 className="mt-2 text-sm font-semibold">{text(account.name)}</h3>
                  <p className="mt-1 text-xs text-slate-500">{text(account.institution)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="ck-section-label">Bank balance</div>
                  <div className="data-metric mt-2 font-semibold">{formatCurrency(num(account.currentBalance))}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="ck-section-label">Book balance</div>
                  <div className="data-metric mt-2 font-semibold">{formatCurrency(num(account.bookBalance))}</div>
                </div>
                <div className={`rounded-xl p-3 ${reconciled ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <div className="ck-section-label">Difference</div>
                  <div className="data-metric mt-2 font-semibold">{formatCurrency(Math.abs(diff))}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {reconciliations.length > 0 && (
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Reconciliation history" title="Prior period reconciliations" />
          <div className="divide-y">
            {reconciliations.map((rec) => (
              <article className="flex items-center justify-between gap-4 p-4" key={text(rec.id)}>
                <div>
                  <div className="text-sm font-semibold">{text(rec.period)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(rec.account)} · Closed by {text(rec.closedBy)}</p>
                </div>
                <TonePill tone="good">Completed</TonePill>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AccountingChartOfAccountsSection({ accounts, base, exportBase }: { accounts: Row[]; base: string; exportBase: string }) {
  const groups = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
  const grouped = Object.fromEntries(groups.map((g) => [g, accounts.filter((a) => text(a.type) === g)]));
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-5">
          {groups.map((g) => (
            <div className="bg-white p-5" key={g}>
              <div className="ck-section-label capitalize">{g.toLowerCase()}s</div>
              <div className="data-metric mt-2 text-2xl font-semibold">{grouped[g].length}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Chart of accounts" title="Full account tree with codes, types, and balances">
          <div className="flex gap-2">
            <Link className="ck-button ck-button-primary text-xs" href={`${base}/accounting/chart-of-accounts`}>New account</Link>
            <a className="ck-button ck-button-secondary text-xs" href={`${exportBase}&report=chart-of-accounts&format=xlsx`}>Export</a>
          </div>
        </SectionTitle>
        {groups.map((g) => (
          <div key={g}>
            <div className="bg-slate-50 px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{g.toLowerCase()}s</div>
            {grouped[g].map((account, index) => (
              <div className={`grid grid-cols-[80px_1fr_auto] gap-3 px-5 py-3 text-sm ${index % 2 ? "bg-[#F8F9FB]" : "bg-white"}`} key={text(account.id)}>
                <span className="font-mono text-slate-400">{text(account.code)}</span>
                <span className="font-semibold">{text(account.name)}</span>
                <span className="money">{formatCurrency(num(account.balance))}</span>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function AccountingJournalSection({ entries, balanced, totalDebits, totalCredits, exportBase }: { entries: Row[]; balanced: boolean; totalDebits: number; totalCredits: number; exportBase: string }) {
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Total debits", formatCurrency(totalDebits)],
            ["Total credits", formatCurrency(totalCredits)],
            [balanced ? "Balanced" : "Difference", balanced ? "✓" : formatCurrency(Math.abs(totalDebits - totalCredits))],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className={`data-metric mt-2 text-2xl font-semibold ${String(label) === "Difference" ? "text-red-600" : ""}`}>{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Transaction processor" title="Journal register with reversal discipline">
          <div className="flex gap-2">
            <TonePill tone={balanced ? "good" : "bad"}>{balanced ? "Balanced" : "Control difference"}</TonePill>
            <a className="ck-button ck-button-secondary text-xs" href={`${exportBase}&report=ledger&format=csv`}>Export CSV</a>
          </div>
        </SectionTitle>
        <div className="divide-y">
          {entries.map((entry) => (
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
    </div>
  );
}

function AccountingCloseBooksSection({
  accountingData,
  base,
}: {
  accountingData: { periods?: Row[]; [key: string]: unknown } | null;
  base: string;
}) {
  const periods = (accountingData?.periods as Row[] | undefined) ?? [];
  const openPeriod = periods.find((p) => text(p.status) === "OPEN");
  const steps = [
    "Reconcile all bank accounts",
    "Review and post all journal entries",
    "Confirm accounts receivable aging",
    "Confirm accounts payable aging",
    "Run trial balance and verify debits = credits",
    "Review financial statements",
    "Close the period",
  ];
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {[
            ["Open period", openPeriod ? text(openPeriod.name) : "None"],
            ["Closed periods", periods.filter((p) => text(p.status) === "CLOSED").length.toLocaleString()],
            ["Total periods", periods.length.toLocaleString()],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-xl font-semibold">{String(value)}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Period close workflow" title="Checklist to close the current accounting period">
            {openPeriod && <TonePill tone="warn">{text(openPeriod.name)} is open</TonePill>}
          </SectionTitle>
          <div className="divide-y p-1">
            {steps.map((step, i) => (
              <div className="flex items-start gap-3 px-4 py-3" key={step}>
                <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</div>
                <p className="text-sm">{step}</p>
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <Link className="ck-button ck-button-primary flex w-full items-center justify-center gap-2" href={`${base}/accounting/close-books`}>
              <ShieldCheck size={15} /> Close current period
            </Link>
          </div>
        </section>
        <section className="ck-card overflow-hidden">
          <SectionTitle eyebrow="Period history" title="Closed accounting periods" />
          <div className="divide-y">
            {periods.map((period) => (
              <article className="flex items-center justify-between gap-4 p-4" key={text(period.id)}>
                <div>
                  <div className="text-sm font-semibold">{text(period.name)}</div>
                  <p className="mt-1 text-xs text-slate-500">{text(period.startDate)} – {text(period.endDate)}</p>
                </div>
                <TonePill tone={text(period.status) === "CLOSED" ? "good" : "warn"}>{text(period.status)}</TonePill>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountingReportsSection({ statements, exportBase }: { statements: Row; exportBase: string }) {
  return (
    <div className="space-y-5">
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Financial statements" title="Balance sheet, income statement, and cash flow snapshot" />
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Assets", statements.assets],
            ["Liabilities", statements.liabilities],
            ["Equity", statements.equity],
            ["Income", statements.income],
            ["Expenses", statements.expenses],
          ].map(([label, value]) => (
            <div className="bg-white p-5" key={String(label)}>
              <div className="ck-section-label">{String(label)}</div>
              <div className="data-metric mt-2 text-xl font-semibold">{formatCurrency(num(value))}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="ck-card overflow-hidden">
        <SectionTitle eyebrow="Export center" title="Executable exports, statements, and accountant handoff" />
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
    </div>
  );
}

// ─── Exported workspace components ───────────────────────────────────────────

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
  const tasks = list(data, "tasks");
  const invoices = list(data, "invoices");
  const openDeals = deals.filter((d) => !text(d.stage).startsWith("CLOSED"));
  const weighted = openDeals.reduce((s, d) => s + (num(d.amount) * num(d.probability)) / 100, 0);
  const atRisk = openDeals.filter((d) => ["PAST_DUE", "NO_NEXT_STEP"].includes(text(d.risk, "")));
  const overdueAr = invoices.filter((inv) => num(inv.balance) > 0 && num(inv.daysPastDue) > 0);
  const base = `/app/${organizationSlug}`;

  switch (section) {
    case "leads":
      return <OperationalWorkbench module="leads" data={data.leads as AnyData} organizationSlug={organizationSlug} />;
    case "deals":
      return <OperationalWorkbench module="deals" data={data.deals as AnyData} organizationSlug={organizationSlug} />;
    case "accounts":
      return <OperationalWorkbench module="accounts" data={data.accounts as AnyData} organizationSlug={organizationSlug} />;
    case "contacts":
      return <RecordOperationsWorkbench module="contacts" organizationSlug={organizationSlug} records={contacts as Record<string, unknown>[]} />;
    case "cases":
      return <ServiceWorkbench module="cases" data={data.cases as AnyData} organizationSlug={organizationSlug} />;
    case "tasks":
      return <OperationalWorkbench module="tasks" data={data.tasks as AnyData} organizationSlug={organizationSlug} />;
    case "campaigns":
      return <ServiceWorkbench module="campaigns" data={data.campaigns as AnyData ?? { records: [] }} organizationSlug={organizationSlug} />;
    case "email":
      return (
        <PlaceholderSection
          description="Send and track emails from inside CRM, associate conversations with contacts and deals, and schedule follow-up sequences triggered by deal stage changes."
          href={`${base}/email`}
          icon={Mail}
          label="Email"
          linkLabel="Go to Email"
          title="Managed email"
        />
      );
    case "calendar":
      return (
        <PlaceholderSection
          description="Schedule meetings, demos, and follow-ups with context from the deal record. Calendar events sync to collaboration channels and trigger task creation."
          href={`${base}/calendar`}
          icon={CalendarClock}
          label="Calendar"
          linkLabel="Go to Calendar"
          title="Calendar and scheduling"
        />
      );
    case "reports":
      return (
        <PlaceholderSection
          description="Pipeline velocity, lead conversion rates, win/loss analysis, and rep performance — all built from the live CRM data with export to Excel and PDF."
          href={`${base}/reports`}
          icon={FileSpreadsheet}
          label="Reports"
          linkLabel="Go to Reports"
          title="CRM analytics and reporting"
        />
      );
    case "automation":
      return (
        <PlaceholderSection
          description="Trigger workflows from stage changes, field updates, lead scores, and invoice events. Route leads, assign tasks, send emails, and post to channels automatically."
          href={`${base}/automations`}
          icon={Zap}
          label="Automation"
          linkLabel="Go to Automations"
          title="Workflow automation"
        />
      );
    case "settings":
      return (
        <PlaceholderSection
          description="Configure CRM pipeline stages, required fields per stage, lead scoring weights, custom fields, team assignments, and integration settings."
          href={`${base}/settings`}
          icon={ShieldCheck}
          label="Settings"
          linkLabel="Go to Settings"
          title="CRM configuration"
        />
      );
    default:
      return (
        <CrmOverviewSection
          accounts={accounts}
          atRisk={atRisk}
          base={base}
          cases={cases}
          contacts={contacts}
          deals={deals}
          invoices={invoices}
          leads={leads}
          overdueAr={overdueAr}
          weighted={weighted}
        />
      );
  }
}

export function AccountingAddendumWorkspace({
  data,
  organizationSlug,
  section = "overview",
}: {
  data: ModuleBundle;
  organizationSlug: string;
  section?: string;
}) {
  const accountingData = data.accounting;
  const entries = list(data, "accounting");
  const accounts = ((accountingData?.accounts as Row[] | undefined) ?? []);
  const invoices = list(data, "invoices");
  const payments = list(data, "payments");
  const vendors = list(data, "vendors");
  const expenses = list(data, "expenses");
  const products = list(data, "products");
  const bankingData = data.banking as { records?: Row[]; reconciliations?: Row[]; [key: string]: unknown } | null;
  const statements = (accountingData?.statements as Row | undefined) ?? {};
  const totalDebits = entries.reduce((s, e) => s + num(e.debit), 0);
  const totalCredits = entries.reduce((s, e) => s + num(e.credit), 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const exportBase = `/api/accounting/export?organizationSlug=${encodeURIComponent(organizationSlug)}`;
  const base = `/app/${organizationSlug}`;

  switch (section) {
    // These sections use existing full-featured workbench components
    case "sales-invoices":
      return <OperationalWorkbench module="invoices" data={data.invoices as AnyData} organizationSlug={organizationSlug} />;
    case "payments-deposits":
      return <FinanceWorkbench module="payments" data={data.payments as AnyData} organizationSlug={organizationSlug} />;
    case "products-services":
      return <RecordOperationsWorkbench module="products" organizationSlug={organizationSlug} records={products as Record<string, unknown>[]} />;
    case "vendors-bills":
      return <FinanceWorkbench module="vendors" data={data.vendors as AnyData} organizationSlug={organizationSlug} />;
    case "expenses-receipts":
      return <FinanceWorkbench module="expenses" data={data.expenses as AnyData} organizationSlug={organizationSlug} />;
    case "bank-transactions":
      return <OperationalWorkbench module="banking" data={data.banking as AnyData} organizationSlug={organizationSlug} />;
    // Chart, journal, reconciliation, and close-books all use the accounting workbench
    case "reconciliation":
    case "chart-of-accounts":
    case "journal":
    case "close-books":
      return <FinanceWorkbench module="accounting" data={data.accounting as AnyData} organizationSlug={organizationSlug} />;
    case "reports":
      return <AccountingReportsSection statements={statements} exportBase={exportBase} />;
    case "taxes-1099":
      return (
        <PlaceholderSection
          description="Generate 1099-NEC and 1099-MISC forms for contractors and vendors. Powered by Tax1099 integration with direct e-file to the IRS and automatic recipient delivery."
          href={`${base}/tax-documents`}
          icon={FileText}
          label="Taxes &amp; 1099"
          linkLabel="Go to Tax Documents"
          title="Tax documents and 1099 filing"
        />
      );
    case "payroll-costs":
      return (
        <PlaceholderSection
          description="View payroll journal entries and cost allocations posted from the Finch payroll integration. Payroll runs sync to the general ledger automatically."
          href={`${base}/payroll`}
          icon={Users}
          label="Payroll costs"
          linkLabel="Go to Payroll"
          title="Payroll cost accounting"
        />
      );
    case "settings":
      return (
        <PlaceholderSection
          description="Configure fiscal year, accounting basis (cash vs accrual), chart of accounts structure, tax rates, default accounts, and integration settings."
          href={`${base}/settings`}
          icon={ShieldCheck}
          label="Settings"
          linkLabel="Go to Settings"
          title="Accounting configuration"
        />
      );
    default:
      return (
        <AccountingOverviewSection
          accounting={accountingData as Row | null}
          accounts={accounts}
          balanced={balanced}
          base={base}
          entries={entries}
          expenses={expenses}
          exportBase={exportBase}
          invoices={invoices}
          payments={payments}
          products={products}
          statements={statements}
          totalCredits={totalCredits}
          totalDebits={totalDebits}
          vendors={vendors}
        />
      );
  }
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
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-blue-300" size={17} />
                  <h3 className="font-semibold">#{text(active?.name, "operations")}</h3>
                  <TonePill tone="info">{text(active?.visibility, "members")}</TonePill>
                </div>
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
