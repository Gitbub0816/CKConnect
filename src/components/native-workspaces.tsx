"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ContactRound,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  ListChecks,
  LockKeyhole,
  Mail,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserRoundCheck,
  WalletCards,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { QuickCreate } from "@/components/quick-create";

type Row = Record<string, unknown>;
type Metric = { label?: string; value?: unknown; format?: string; suffix?: string };
type ModuleData = {
  accounts?: Row[];
  metrics?: Metric[];
  periods?: Row[];
  records?: Row[];
  reconciliations?: Row[];
  statements?: Record<string, unknown>;
} | null;
type Bundle = Record<string, ModuleData>;

type Column = {
  key: string;
  label: string;
  align?: "right";
  format?: "currency" | "date" | "percent" | "status";
};

type NavItem = {
  group: string;
  icon: LucideIcon;
  label: string;
  module: string;
  slug: string;
};

type RibbonCommand = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const crmNavigation: NavItem[] = [
  { slug: "overview", label: "Command Center", group: "Workspace", module: "accounts", icon: Activity },
  { slug: "leads", label: "Leads", group: "Sales", module: "leads", icon: Sparkles },
  { slug: "contacts", label: "Contacts", group: "Sales", module: "contacts", icon: ContactRound },
  { slug: "accounts", label: "Companies", group: "Sales", module: "accounts", icon: Building2 },
  { slug: "deals", label: "Deals & Pipeline", group: "Sales", module: "deals", icon: BriefcaseBusiness },
  { slug: "campaigns", label: "Campaigns", group: "Engagement", module: "campaigns", icon: Megaphone },
  { slug: "email", label: "Email", group: "Engagement", module: "email", icon: Mail },
  { slug: "collaboration", label: "Collaboration", group: "Engagement", module: "collaboration", icon: MessageSquare },
  { slug: "cases", label: "Support Cases", group: "Service", module: "cases", icon: ClipboardCheck },
  { slug: "tasks", label: "Tasks", group: "Operations", module: "tasks", icon: ListChecks },
  { slug: "calendar", label: "Calendar", group: "Operations", module: "calendar", icon: CalendarDays },
  { slug: "reports", label: "Reports", group: "Operations", module: "reports", icon: BarChart3 },
  { slug: "automation", label: "Automation", group: "Operations", module: "automations", icon: Workflow },
  { slug: "settings", label: "CRM Settings", group: "Administration", module: "settings", icon: Settings },
];

const accountingNavigation: NavItem[] = [
  { slug: "overview", label: "Financial Workspace", group: "Workspace", module: "accounting", icon: Activity },
  { slug: "bank-transactions", label: "Bank Feeds", group: "Banking", module: "banking", icon: Landmark },
  { slug: "reconciliation", label: "Reconciliation", group: "Banking", module: "banking", icon: ClipboardCheck },
  { slug: "sales-invoices", label: "Accounts Receivable", group: "Sales", module: "invoices", icon: FileText },
  { slug: "payments-deposits", label: "Payments & Deposits", group: "Sales", module: "payments", icon: WalletCards },
  { slug: "vendors-bills", label: "Accounts Payable", group: "Purchases", module: "vendors", icon: Building2 },
  { slug: "expenses-receipts", label: "Expenses & Receipts", group: "Purchases", module: "expenses", icon: ReceiptText },
  { slug: "chart-of-accounts", label: "Chart of Accounts", group: "Books", module: "accounting", icon: BookOpenCheck },
  { slug: "journal", label: "General Ledger", group: "Books", module: "accounting", icon: FileSpreadsheet },
  { slug: "close-books", label: "Month-End Close", group: "Books", module: "accounting", icon: LockKeyhole },
  { slug: "products-services", label: "Inventory & COGS", group: "Business", module: "products", icon: Archive },
  { slug: "payroll-costs", label: "Payroll", group: "Business", module: "payroll", icon: BadgeDollarSign },
  { slug: "taxes-1099", label: "Taxes & 1099", group: "Business", module: "tax-documents", icon: Tags },
  { slug: "reports", label: "Financial Reports", group: "Reporting", module: "reports", icon: FileBarChart },
  { slug: "settings", label: "Accounting Settings", group: "Administration", module: "settings", icon: Settings },
];

const crmColumns: Record<string, Column[]> = {
  overview: [
    { key: "name", label: "Account" }, { key: "industry", label: "Industry" },
    { key: "health", label: "Health", format: "percent" }, { key: "openPipeline", label: "Open pipeline", format: "currency", align: "right" },
    { key: "receivable", label: "Receivable", format: "currency", align: "right" }, { key: "type", label: "Relationship", format: "status" },
  ],
  leads: [
    { key: "name", label: "Lead" }, { key: "company", label: "Company" }, { key: "status", label: "Status", format: "status" },
    { key: "source", label: "Source" }, { key: "score", label: "Score", align: "right" }, { key: "value", label: "Potential value", format: "currency", align: "right" },
  ],
  contacts: [
    { key: "name", label: "Contact" }, { key: "account", label: "Company" }, { key: "title", label: "Title" },
    { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "lifecycle", label: "Lifecycle", format: "status" },
  ],
  accounts: [
    { key: "name", label: "Company" }, { key: "type", label: "Type", format: "status" }, { key: "industry", label: "Industry" },
    { key: "health", label: "Health", format: "percent" }, { key: "lifetimeValue", label: "Lifetime value", format: "currency", align: "right" }, { key: "receivable", label: "A/R", format: "currency", align: "right" },
  ],
  deals: [
    { key: "name", label: "Opportunity" }, { key: "account", label: "Account" }, { key: "stage", label: "Stage", format: "status" },
    { key: "amount", label: "Amount", format: "currency", align: "right" }, { key: "probability", label: "Probability", format: "percent", align: "right" }, { key: "closeDate", label: "Close date", format: "date" },
  ],
  cases: [
    { key: "number", label: "Case" }, { key: "subject", label: "Subject" }, { key: "customer", label: "Customer" },
    { key: "priority", label: "Priority", format: "status" }, { key: "status", label: "Status", format: "status" }, { key: "ageHours", label: "Age (hours)", align: "right" },
  ],
  tasks: [
    { key: "title", label: "Task" }, { key: "relatedType", label: "Related to" }, { key: "priority", label: "Priority", format: "status" },
    { key: "status", label: "Status", format: "status" }, { key: "dueAt", label: "Due", format: "date" },
  ],
  campaigns: [
    { key: "name", label: "Campaign" }, { key: "type", label: "Type" }, { key: "status", label: "Status", format: "status" },
    { key: "members", label: "Audience", align: "right" }, { key: "responses", label: "Responses", align: "right" }, { key: "conversionRate", label: "Conversion", format: "percent", align: "right" },
  ],
  email: [
    { key: "subject", label: "Subject" }, { key: "recipient", label: "Recipient" }, { key: "status", label: "Delivery", format: "status" },
    { key: "category", label: "Category" }, { key: "sentAt", label: "Sent", format: "date" },
  ],
  calendar: [
    { key: "title", label: "Event" }, { key: "type", label: "Type" }, { key: "startsAt", label: "Starts", format: "date" },
    { key: "location", label: "Location" }, { key: "attendees", label: "Attendees", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
};

const accountingColumns: Record<string, Column[]> = {
  overview: [
    { key: "number", label: "Journal" }, { key: "date", label: "Date", format: "date" }, { key: "description", label: "Description" },
    { key: "source", label: "Source" }, { key: "debit", label: "Debit", format: "currency", align: "right" }, { key: "credit", label: "Credit", format: "currency", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
  journal: [
    { key: "number", label: "Entry" }, { key: "date", label: "Date", format: "date" }, { key: "description", label: "Memo" },
    { key: "source", label: "Source" }, { key: "debit", label: "Debit", format: "currency", align: "right" }, { key: "credit", label: "Credit", format: "currency", align: "right" }, { key: "status", label: "Posting", format: "status" },
  ],
  "chart-of-accounts": [
    { key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "type", label: "Type", format: "status" }, { key: "balance", label: "Balance", format: "currency", align: "right" },
  ],
  "close-books": [
    { key: "name", label: "Period" }, { key: "startsOn", label: "Start", format: "date" }, { key: "endsOn", label: "End", format: "date" }, { key: "status", label: "Status", format: "status" }, { key: "lockedAt", label: "Locked", format: "date" },
  ],
  "sales-invoices": [
    { key: "number", label: "Invoice" }, { key: "customer", label: "Customer" }, { key: "issueDate", label: "Issued", format: "date" }, { key: "dueDate", label: "Due", format: "date" },
    { key: "total", label: "Total", format: "currency", align: "right" }, { key: "balance", label: "Balance", format: "currency", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
  "payments-deposits": [
    { key: "reference", label: "Reference" }, { key: "receivedAt", label: "Received", format: "date" }, { key: "method", label: "Method" }, { key: "invoices", label: "Applied to" }, { key: "amount", label: "Amount", format: "currency", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
  "vendors-bills": [
    { key: "name", label: "Vendor" }, { key: "email", label: "Email" }, { key: "openBills", label: "Open bills", align: "right" }, { key: "balance", label: "Open balance", format: "currency", align: "right" }, { key: "eligible1099", label: "1099 eligible", format: "status" },
  ],
  "expenses-receipts": [
    { key: "incurredAt", label: "Date", format: "date" }, { key: "description", label: "Description" }, { key: "vendor", label: "Vendor" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", format: "currency", align: "right" }, { key: "posted", label: "Posted", format: "status" },
  ],
  "bank-transactions": [
    { key: "date", label: "Date", format: "date" }, { key: "description", label: "Description" }, { key: "account", label: "Account" }, { key: "direction", label: "Direction" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount", format: "currency", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
  reconciliation: [
    { key: "statementDate", label: "Statement date", format: "date" }, { key: "statementBalance", label: "Statement", format: "currency", align: "right" }, { key: "clearedBalance", label: "Cleared", format: "currency", align: "right" }, { key: "difference", label: "Difference", format: "currency", align: "right" }, { key: "status", label: "Status", format: "status" },
  ],
  "products-services": [
    { key: "sku", label: "SKU" }, { key: "name", label: "Item" }, { key: "type", label: "Type" }, { key: "onHand", label: "On hand", align: "right" }, { key: "reorderLevel", label: "Reorder point", align: "right" }, { key: "cost", label: "Cost", format: "currency", align: "right" }, { key: "price", label: "Price", format: "currency", align: "right" }, { key: "stockState", label: "Status", format: "status" },
  ],
};

function recordsFor(bundle: Bundle, section: string, accounting: boolean): Row[] {
  if (accounting) {
    if (["overview", "journal"].includes(section)) return bundle.accounting?.records ?? [];
    if (section === "chart-of-accounts") return bundle.accounting?.accounts ?? [];
    if (section === "close-books") return bundle.accounting?.periods ?? [];
    if (section === "sales-invoices") return bundle.invoices?.records ?? [];
    if (section === "payments-deposits") return bundle.payments?.records ?? [];
    if (section === "vendors-bills") return bundle.vendors?.records ?? [];
    if (section === "expenses-receipts") return bundle.expenses?.records ?? [];
    if (section === "reconciliation") return bundle.banking?.reconciliations ?? [];
    if (section === "bank-transactions")
      return (bundle.banking?.records ?? []).flatMap((account) =>
        (Array.isArray(account.transactions) ? account.transactions : []).map((transaction) => ({
          ...(transaction as Row),
          account: account.name,
        })),
      );
    if (section === "products-services") return bundle.products?.records ?? [];
  }
  const sourceModule =
    crmNavigation.find((item) => item.slug === section)?.module ?? "accounts";
  if (sourceModule === "accounts") return bundle.accounts?.accounts ?? [];
  return bundle[sourceModule]?.records ?? [];
}

function metricsFor(bundle: Bundle, section: string, accounting: boolean): Metric[] {
  const nav = (accounting ? accountingNavigation : crmNavigation).find((item) => item.slug === section);
  return bundle[nav?.module ?? (accounting ? "accounting" : "accounts")]?.metrics?.slice(0, 5) ?? [];
}

function formatValue(value: unknown, format?: Column["format"]) {
  if (value === null || value === undefined || value === "") return "-";
  if (format === "currency")
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
  if (format === "percent") return `${Number(value).toLocaleString()}%`;
  if (format === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replaceAll("_", " ");
}

function metricValue(metric: Metric) {
  if (metric.format === "currency") return formatValue(metric.value, "currency");
  return `${formatValue(metric.value)}${metric.suffix ?? ""}`;
}

function Ribbon({ accounting, base }: { accounting: boolean; base: string }) {
  const tabs = accounting
    ? ["Home", "Banking", "Sales", "Purchases", "Payroll", "Inventory", "Taxes", "Reports", "Close", "Admin"]
    : ["Home", "Sales", "Customers", "Marketing", "Service", "Operations", "Reports", "Admin"];
  const [activeTab, setActiveTab] = useState("Home");
  const crmHome: RibbonCommand[][] = [
    [{ label: "New lead", icon: Plus, href: `${base}/leads` }],
    [{ label: "Lead", icon: Sparkles, href: `${base}/leads` }, { label: "Contact", icon: ContactRound, href: `${base}/contacts` }, { label: "Company", icon: Building2, href: `${base}/accounts` }, { label: "Deal", icon: BriefcaseBusiness, href: `${base}/deals` }],
    [{ label: "Assign", icon: UserRoundCheck, href: `${base}/tasks` }, { label: "Task", icon: ListChecks, href: `${base}/tasks` }, { label: "Email", icon: Mail, href: `${base}/email` }, { label: "Call", icon: Phone, href: `${base}/contacts` }],
    [{ label: "Reports", icon: BarChart3, href: `${base}/reports` }, { label: "Automate", icon: Workflow, href: `${base}/automation` }],
  ];
  const accountingHome: RibbonCommand[][] = [
    [{ label: "Journal", icon: FileSpreadsheet, href: `${base}/journal` }, { label: "Invoice", icon: FileText, href: `${base}/sales-invoices` }, { label: "Bill", icon: ReceiptText, href: `${base}/vendors-bills` }, { label: "Expense", icon: Banknote, href: `${base}/expenses-receipts` }],
    [{ label: "Match", icon: CheckCircle2, href: `${base}/bank-transactions` }, { label: "Reconcile", icon: ClipboardCheck, href: `${base}/reconciliation` }, { label: "Import", icon: ArrowUpFromLine, href: `${base}/reconciliation` }],
    [{ label: "Payroll", icon: BadgeDollarSign, href: `${base}/payroll-costs` }, { label: "1099", icon: Tags, href: `${base}/taxes-1099` }, { label: "Close", icon: LockKeyhole, href: `${base}/close-books` }],
    [{ label: "P&L", icon: FileBarChart, href: `${base}/reports` }, { label: "Balance", icon: BarChart3, href: `${base}/reports` }, { label: "Export", icon: ArrowDownToLine, href: `${base}/reports` }, { label: "Audit", icon: ShieldCheck, href: `${base.replace(/\/accounting$/, "")}/audit` }],
  ];
  const fallback: RibbonCommand[][] = accounting
    ? [[{ label: "Open workspace", icon: Activity, href: base }, { label: "Reports", icon: FileBarChart, href: `${base}/reports` }], [{ label: "Import", icon: ArrowUpFromLine, href: `${base}/reconciliation` }, { label: "Export", icon: ArrowDownToLine, href: `${base}/reports` }], [{ label: "Audit trail", icon: History, href: `${base.replace(/\/accounting$/, "")}/audit` }, { label: "Settings", icon: Settings, href: `${base}/settings` }]]
    : [[{ label: "Open workspace", icon: Activity, href: base }, { label: "New lead", icon: Plus, href: `${base}/leads` }], [{ label: "Tasks", icon: ListChecks, href: `${base}/tasks` }, { label: "Calendar", icon: CalendarDays, href: `${base}/calendar` }], [{ label: "Reports", icon: BarChart3, href: `${base}/reports` }, { label: "Settings", icon: Settings, href: `${base}/settings` }]];
  const groups = activeTab === "Home" ? (accounting ? accountingHome : crmHome) : fallback;
  return (
    <div className="ck-native-ribbon">
      <div className="ck-native-ribbon-tabs" role="tablist">
        {tabs.map((tab) => <button aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab}</button>)}
      </div>
      <div className="ck-native-ribbon-groups">
        {groups.map((group, index) => (
          <div className="ck-native-ribbon-group" key={`${activeTab}-${index}`}>
            <div className="ck-native-ribbon-actions">
              {group.map((command) => {
                const Icon = command.icon;
                const content = <><Icon size={18} /><span>{command.label}</span></>;
                return <Link href={command.href} key={command.label}>{content}</Link>;
              })}
            </div>
            <span>{["Create", "Records", "Communicate", "Tools"][index] ?? "Actions"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleNavigation({ activeSection, base, items }: { activeSection: string; base: string; items: NavItem[] }) {
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <nav className="ck-native-module-nav" aria-label="Module navigation">
      <div className="ck-native-nav-search"><Search size={14} /><input aria-label="Find a workspace" placeholder="Find a workspace" /></div>
      {groups.map((group) => (
        <div className="ck-native-nav-group" key={group}>
          <div>{group}</div>
          {items.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon;
            return <Link className={item.slug === activeSection ? "is-active" : ""} href={item.slug === "overview" ? base : `${base}/${item.slug}`} key={item.slug}><Icon size={15} /><span>{item.label}</span></Link>;
          })}
        </div>
      ))}
    </nav>
  );
}

function Inspector({ row, columns, accounting, base }: { row?: Row; columns: Column[]; accounting: boolean; base: string }) {
  return (
    <aside className="ck-native-inspector">
      <div className="ck-native-inspector-header"><strong>{row ? "Record inspector" : "Workspace inspector"}</strong><SlidersHorizontal size={16} /></div>
      {row ? (
        <>
          <div className="ck-native-inspector-title">{formatValue(row.name ?? row.title ?? row.description ?? row.number ?? row.reference ?? "Selected record")}</div>
          <dl>
            {columns.slice(0, 8).map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{formatValue(row[column.key], column.format)}</dd></div>)}
          </dl>
          <div className="ck-native-inspector-actions">
            <Link href={accounting ? `${base}/reports` : `${base}/tasks`}><ListChecks size={14} /> Create follow-up</Link>
            <Link href={`${base.replace(/\/(accounting|crm)$/, "")}/audit`}><History size={14} /> View audit trail</Link>
            {typeof row.pdfUrl === "string" && <a href={row.pdfUrl}><FileText size={14} /> Open PDF</a>}
          </div>
          {Object.entries(row).filter(([, value]) => Array.isArray(value)).map(([key, value]) => (
            <div className="ck-native-related" key={key}><strong>{key.replaceAll("_", " ")}</strong><span>{(value as unknown[]).length} related records</span></div>
          ))}
        </>
      ) : (
        <div className="ck-native-empty-inspector"><Activity size={24} /><strong>Select a row</strong><p>Details, related work, approvals, and audit history will appear here.</p></div>
      )}
    </aside>
  );
}

export function NativeBusinessWorkspace({ activeSection, bundle, mode, organizationSlug }: { activeSection: string; bundle: Bundle; mode: "crm" | "accounting"; organizationSlug: string }) {
  const accounting = mode === "accounting";
  const items = accounting ? accountingNavigation : crmNavigation;
  const base = `/app/${organizationSlug}/${mode}`;
  const active = items.find((item) => item.slug === activeSection) ?? items[0];
  const columns = useMemo<Column[]>(
    () =>
      (accounting ? accountingColumns : crmColumns)[active.slug] ?? [
        { key: "name", label: "Name" },
        { key: "status", label: "Status", format: "status" },
        { key: "updatedAt", label: "Updated", format: "date" },
      ],
    [accounting, active.slug],
  );
  const rows = useMemo(() => recordsFor(bundle, active.slug, accounting), [bundle, active.slug, accounting]);
  const metrics = metricsFor(bundle, active.slug, accounting);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ? String(rows[0].id) : null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => columns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(needle)));
  }, [rows, columns, query]);
  const selected = rows.find((row) => String(row.id) === selectedId) ?? filtered[0];
  const quickModule = active.module === "accounting" || active.module === "banking" ? (accounting ? "invoices" : "accounts") : active.module;
  const exportRows = () => {
    const header = columns.map((column) => column.label);
    const body = filtered.map((row) =>
      columns.map((column) => String(row[column.key] ?? "").replaceAll('"', '""')),
    );
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${mode}-${active.slug}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="ck-native-shell">
      <div className="ck-native-titlebar">
        <div><strong>ClearKey Connect</strong><span>/</span><span>{accounting ? "Accounting" : "CRM"}</span><span>/</span><span>{active.label}</span></div>
        <div><button title="Refresh workspace" type="button"><RefreshCw size={14} /></button><button title="More actions" type="button"><MoreHorizontal size={15} /></button></div>
      </div>
      <Ribbon accounting={accounting} base={base} />
      <div className="ck-native-body">
        <ModuleNavigation activeSection={active.slug} base={base} items={items} />
        <main className="ck-native-workspace">
          <div className="ck-native-workspace-heading">
            <div><span>{accounting ? "Financial workspace" : "Relationship workspace"}</span><h1>{active.label}</h1></div>
            <QuickCreate label={`New ${active.label.replace(/s$/, "").toLowerCase()}`} module={quickModule} organizationSlug={organizationSlug} />
          </div>
          <div className="ck-native-kpis">
            {metrics.length ? metrics.map((metric, index) => <div key={`${metric.label}-${index}`}><span>{metric.label}</span><strong>{metricValue(metric)}</strong></div>) : <><div><span>Records</span><strong>{rows.length}</strong></div><div><span>Selected</span><strong>{selected ? 1 : 0}</strong></div></>}
          </div>
          <div className="ck-native-command-strip">
            <div className="ck-native-grid-search"><Search size={14} /><input onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.label.toLowerCase()}`} value={query} />{query && <button aria-label="Clear search" onClick={() => setQuery("")} type="button"><X size={13} /></button>}</div>
            <button onClick={() => window.location.reload()} type="button"><RefreshCw size={14} /> Refresh</button>
            <button onClick={exportRows} type="button"><ArrowDownToLine size={14} /> Export CSV</button>
            <span>{filtered.length} records</span>
          </div>
          <div className="ck-native-grid-wrap">
            <table className="ck-native-grid">
              <thead><tr><th aria-label="Select"><input aria-label="Select all visible rows" type="checkbox" /></th>{columns.map((column) => <th className={column.align === "right" ? "is-number" : ""} key={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>
                {filtered.map((row, index) => {
                  const id = String(row.id ?? index);
                  return <tr className={String(selected?.id ?? "") === id ? "is-selected" : ""} key={id} onClick={() => setSelectedId(id)}><td><input aria-label={`Select row ${index + 1}`} checked={String(selected?.id ?? "") === id} onChange={() => setSelectedId(id)} type="checkbox" /></td>{columns.map((column) => <td className={column.align === "right" ? "is-number" : ""} key={column.key}>{column.format === "status" ? <span className="ck-native-status">{formatValue(row[column.key], column.format)}</span> : formatValue(row[column.key], column.format)}</td>)}</tr>;
                })}
                {!filtered.length && <tr><td className="ck-native-grid-empty" colSpan={columns.length + 1}>No records match this view.</td></tr>}
              </tbody>
            </table>
          </div>
        </main>
        <Inspector accounting={accounting} base={base} columns={columns} row={selected} />
      </div>
      <div className="ck-native-statusbar"><span>{filtered.length} of {rows.length} records</span><span>Connected to ClearKey data</span><span><CheckCircle2 size={12} /> Sync current</span><span>Audit logging enabled</span></div>
    </div>
  );
}
