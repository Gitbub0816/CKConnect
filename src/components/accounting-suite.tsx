import Link from "next/link";
import {
  BadgeDollarSign,
  BanknoteArrowDown,
  BookOpenCheck,
  Boxes,
  Building2,
  Calculator,
  ChartColumnBig,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type AccountingSection = {
  description: string;
  group: "Get paid" | "Pay bills" | "Banking" | "Books" | "Business";
  icon: LucideIcon;
  label: string;
  module: string;
  slug: string;
};

export const accountingSections: AccountingSection[] = [
  {
    slug: "overview",
    label: "Overview",
    description: "Book health, close readiness, and top accounting tasks.",
    group: "Books",
    module: "accounting",
    icon: Sparkles,
  },
  {
    slug: "sales-invoices",
    label: "Invoices",
    description: "Create, send, remind, collect, and post receivables.",
    group: "Get paid",
    module: "invoices",
    icon: FileText,
  },
  {
    slug: "payments-deposits",
    label: "Payments",
    description: "Record receipts, allocate payments, and monitor deposits.",
    group: "Get paid",
    module: "payments",
    icon: WalletCards,
  },
  {
    slug: "products-services",
    label: "Products & services",
    description: "Manage items, pricing, margins, and invoice line defaults.",
    group: "Get paid",
    module: "products",
    icon: Boxes,
  },
  {
    slug: "vendors-bills",
    label: "Vendors & bills",
    description: "Track payables, bill status, due dates, and vendor files.",
    group: "Pay bills",
    module: "vendors",
    icon: Building2,
  },
  {
    slug: "expenses-receipts",
    label: "Expenses",
    description: "Capture spend, receipts, categories, and ledger posting.",
    group: "Pay bills",
    module: "expenses",
    icon: ReceiptText,
  },
  {
    slug: "taxes-1099",
    label: "Taxes & 1099s",
    description: "Prepare tax documents, vendor eligibility, and archive.",
    group: "Pay bills",
    module: "tax-documents",
    icon: Tags,
  },
  {
    slug: "bank-transactions",
    label: "Bank transactions",
    description: "Review bank feed imports, match payments, and post spend.",
    group: "Banking",
    module: "banking",
    icon: Landmark,
  },
  {
    slug: "reconciliation",
    label: "Reconcile",
    description: "Compare statement balances, cleared activity, and variances.",
    group: "Banking",
    module: "banking",
    icon: ClipboardCheck,
  },
  {
    slug: "chart-of-accounts",
    label: "Chart of accounts",
    description: "Maintain the account list, trial balance, and balances.",
    group: "Books",
    module: "accounting",
    icon: BookOpenCheck,
  },
  {
    slug: "journal",
    label: "Journal",
    description: "Inspect posted entries, lines, reversals, and source trails.",
    group: "Books",
    module: "accounting",
    icon: FileSpreadsheet,
  },
  {
    slug: "close-books",
    label: "Close books",
    description: "Create, lock, unlock, and review accounting periods.",
    group: "Books",
    module: "accounting",
    icon: LockKeyhole,
  },
  {
    slug: "reports",
    label: "Reports",
    description: "Profit and loss, balance sheet, cash flow, and saved views.",
    group: "Books",
    module: "reports",
    icon: ChartColumnBig,
  },
  {
    slug: "payroll-costs",
    label: "Payroll costs",
    description: "Payroll runs, employer cost, liabilities, and handoff.",
    group: "Business",
    module: "payroll",
    icon: BadgeDollarSign,
  },
  {
    slug: "settings",
    label: "Settings",
    description: "Accounting provider, currency, permissions, and controls.",
    group: "Business",
    module: "settings",
    icon: Settings,
  },
];

const groups = ["Get paid", "Pay bills", "Banking", "Books", "Business"] as const;

export function getAccountingSection(section = "overview") {
  return (
    accountingSections.find((item) => item.slug === section) ??
    accountingSections[0]
  );
}

export function AccountingSuite({
  activeSection,
  children,
  organizationSlug,
}: {
  activeSection: string;
  children: React.ReactNode;
  organizationSlug: string;
}) {
  const base = `/app/${organizationSlug}/accounting`;
  const active = getAccountingSection(activeSection);
  const actionQueue = [
    {
      label: "Review bank feed",
      href: `${base}/bank-transactions`,
      icon: Landmark,
      detail: "Categorize, match, or post imported activity.",
    },
    {
      label: "Send invoices",
      href: `${base}/sales-invoices`,
      icon: FileText,
      detail: "Post drafts, send reminders, and open payment pages.",
    },
    {
      label: "Pay bills",
      href: `${base}/vendors-bills`,
      icon: BanknoteArrowDown,
      detail: "Post payables and record bill payment.",
    },
    {
      label: "Close period",
      href: `${base}/close-books`,
      icon: LockKeyhole,
      detail: "Create, lock, or unlock accounting periods.",
    },
    {
      label: "Run reports",
      href: `${base}/reports`,
      icon: ChartColumnBig,
      detail: "Review saved reports and operating dashboards.",
    },
    {
      label: "Audit controls",
      href: `/app/${organizationSlug}/audit`,
      icon: ShieldCheck,
      detail: "Trace sensitive financial activity.",
    },
  ];
  const commandGroups = [
    {
      label: "Customers",
      commands: [
        ["Create invoice", `${base}/sales-invoices`],
        ["Record payment", `${base}/payments-deposits`],
        ["Review A/R aging", `${base}/reports`],
        ["Open customer account", `/app/${organizationSlug}/accounts`],
        ["Manage products", `${base}/products-services`],
        ["Batch send queue", `${base}/sales-invoices`],
      ],
    },
    {
      label: "Vendors",
      commands: [
        ["Enter bill", `${base}/vendors-bills`],
        ["Post expense", `${base}/expenses-receipts`],
        ["Review A/P aging", `${base}/reports`],
        ["Prepare 1099", `${base}/taxes-1099`],
        ["Vendor balance detail", `${base}/vendors-bills`],
        ["Receipt matching", `${base}/expenses-receipts`],
      ],
    },
    {
      label: "Banking",
      commands: [
        ["Import feed", `${base}/bank-transactions`],
        ["Match transaction", `${base}/bank-transactions`],
        ["Create rule", `${base}/bank-transactions`],
        ["Start reconciliation", `${base}/reconciliation`],
        ["Review exceptions", `${base}/reconciliation`],
        ["Cash flow view", `${base}/reports`],
      ],
    },
    {
      label: "Books",
      commands: [
        ["Chart of accounts", `${base}/chart-of-accounts`],
        ["Journal register", `${base}/journal`],
        ["Reverse entry", `${base}/journal`],
        ["Close period", `${base}/close-books`],
        ["Lock books", `${base}/close-books`],
        ["Audit trail", `/app/${organizationSlug}/audit`],
      ],
    },
  ];
  const workflowLanes = [
    ["Money in", "Quote or deal", "Invoice", "Payment", "Deposit", "A/R posting"],
    ["Money out", "Vendor", "Bill or expense", "Approval", "Payment", "A/P posting"],
    ["Banking", "Feed import", "Rule or match", "Review", "Reconcile", "Close"],
    ["Close", "Trial balance", "Adjustments", "Statements", "Lock period", "Reports"],
  ];

  return (
    <div className="space-y-4 p-5 lg:p-7">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-5 border-b p-5 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="ck-eyebrow">
              {organizationSlug.replaceAll("-", " ")}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Accounting center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              QuickBooks-inspired workflow for money in, money out, bank review,
              reports, close, controls, and business settings.
            </p>
          </div>
          <div className="rounded-lg border bg-[#f8f5ef] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="text-[#9b7420]" size={17} />
              Current workspace
            </div>
            <h2 className="mt-3 text-xl font-semibold">{active.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {active.description}
            </p>
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 xl:grid-cols-5">
          {groups.map((group) => (
            <div className="bg-white p-4" key={group}>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
                {group}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 xl:block xl:space-y-2">
                {accountingSections
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const selected = item.slug === active.slug;
                    return (
                      <Link
                        className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition xl:flex ${
                          selected
                            ? "border-[#c9a033] bg-[#fff7df] text-[#5f4308]"
                            : "border-[#e0d5c5] bg-white hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
                        }`}
                        href={item.slug === "overview" ? base : `${base}/${item.slug}`}
                        key={item.slug}
                      >
                        <Icon size={14} />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="ck-card h-fit overflow-hidden">
          <div className="border-b p-4">
            <div className="ck-eyebrow">Action center</div>
            <h2 className="mt-2 font-semibold">Common accounting calls</h2>
          </div>
          <div className="divide-y">
            {actionQueue.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className="block p-4 transition hover:bg-amber-50/60"
                  href={action.href}
                  key={action.label}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="text-[#9b7420]" size={16} />
                    {action.label}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {action.detail}
                  </p>
                </Link>
              );
            })}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="ck-card overflow-hidden">
          <div className="border-b p-5">
            <div className="ck-eyebrow">Command ribbon</div>
            <h2 className="mt-2 font-semibold">Accounting operations map</h2>
          </div>
          <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
            {commandGroups.map((group) => (
              <div className="bg-white p-4" key={group.label}>
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <div className="mt-3 grid gap-2">
                  {group.commands.map(([label, href]) => (
                    <Link
                      className="rounded-md border border-[#e0d5c5] px-3 py-2 text-xs font-semibold transition hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
                      href={href}
                      key={label}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-5">
            <div className="grid gap-3">
              {workflowLanes.map(([lane, ...steps]) => (
                <div
                  className="grid gap-2 rounded-lg border bg-[#fbfaf7] p-3 lg:grid-cols-[110px_1fr]"
                  key={lane}
                >
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                    {lane}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {steps.map((step, index) => (
                      <span
                        className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold"
                        key={step}
                      >
                        {index + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="ck-card h-fit p-5">
          <div className="ck-eyebrow">Controls</div>
          <h2 className="mt-2 font-semibold">Close and compliance guardrails</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              "Role-based access for posting, payment, banking, and settings.",
              "Immutable audit records for financial changes and reversals.",
              "Period locks prevent edits after close unless unlocked by authorized users.",
              "Source-linked ledger entries keep invoices, bills, payments, and bank events traceable.",
              "Tax and document retention paths keep finance evidence out of ad hoc storage.",
            ].map((item) => (
              <div className="rounded-lg border bg-[#fbfaf7] p-3" key={item}>
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
