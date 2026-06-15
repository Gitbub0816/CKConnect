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
  return (
    <div className="ck-suite ck-product-workspace p-4 lg:p-6">
      <section className="ck-workspace-header">
        <div className="min-w-0">
          <div className="ck-breadcrumb">
            {organizationSlug.replaceAll("-", " ")} / Accounting
          </div>
          <h1>{active.label}</h1>
          <p>{active.description}</p>
        </div>
        <div className="ck-commandbar" aria-label="Accounting commands">
          <Link className="ck-command-primary" href={`${base}/sales-invoices`}>
            <FileText size={15} />
            New invoice
          </Link>
          {actionQueue.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <Link className="ck-command-button" href={action.href} key={action.label}>
                <Icon size={15} />
                {action.label}
              </Link>
            );
          })}
          <Link className="ck-command-button ck-command-more" href={`${base}/reports`}>
            More
          </Link>
        </div>
      </section>

      <nav className="ck-suite-nav" aria-label="Accounting sections">
        {groups.map((group) => (
          <div className="ck-suite-nav-group" key={group}>
            <span>{group}</span>
            <div>
              {accountingSections
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const selected = item.slug === active.slug;
                  return (
                    <Link
                      className={selected ? "is-active" : ""}
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
      </nav>

      <section className="ck-workspace-layout">
        <main className="ck-workspace-main">{children}</main>
        <aside className="ck-context-rail">
          <div className="ck-context-card">
            <div className="ck-context-title">
              <Calculator size={16} />
              Context
            </div>
            <dl>
              <div>
                <dt>Area</dt>
                <dd>{active.label}</dd>
              </div>
              <div>
                <dt>Module</dt>
                <dd>{active.module.replaceAll("-", " ")}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>Finance</dd>
              </div>
            </dl>
          </div>
          <div className="ck-context-card">
            <div className="ck-context-title">Related work</div>
            {actionQueue.map((action) => {
              const Icon = action.icon;
              return (
                <Link className="ck-context-link" href={action.href} key={action.label}>
                  <Icon size={14} />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
