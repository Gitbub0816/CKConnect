import Link from "next/link";
import {
  BarChart3,
  BadgeDollarSign,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  FileText,
  FileCheck2,
  Files,
  Gauge,
  HandCoins,
  Headphones,
  Landmark,
  ListTodo,
  Megaphone,
  Mail,
  Bell,
  Palette,
  Plug,
  Receipt,
  Globe2,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { getDb } from "@/lib/db";

const sections = [
  {
    label: "Overview",
    items: [
      ["dashboard", "Dashboard", Gauge],
      ["reports", "Reports", BarChart3],
      ["tasks", "Tasks", ListTodo],
      ["calendar", "Calendar", CalendarDays],
      ["bookings", "Bookings", CalendarDays],
    ],
  },
  {
    label: "CRM",
    items: [
      ["leads", "Leads", Sparkles],
      ["accounts", "Accounts", Building2],
      ["contacts", "Contacts", ContactRound],
      ["deals", "Deals", BriefcaseBusiness],
      ["cases", "Cases", Headphones],
      ["campaigns", "Campaigns", Megaphone],
    ],
  },
  {
    label: "Finance",
    items: [
      ["invoices", "Invoices", FileText],
      ["payments", "Payments", CircleDollarSign],
      ["expenses", "Expenses", Receipt],
      ["vendors", "Vendors & bills", HandCoins],
      ["accounting", "Accounting", BookOpen],
      ["banking", "Banking", Landmark],
      ["products", "Products", Boxes],
      ["payroll", "Payroll", BadgeDollarSign],
      ["tax-documents", "Tax documents", FileCheck2],
    ],
  },
  {
    label: "Platform",
    items: [
      ["automations", "Automations", Workflow],
      ["email", "Email", Mail],
      ["documents", "Documents", Files],
      ["submissions", "Form inbox", Headphones],
      ["notifications", "Notifications", Bell],
      ["integrations", "Integrations", Plug],
      ["team", "Team & roles", Users],
      ["appearance", "Appearance", Palette],
      ["websites", "Website builder", Globe2],
      ["domains", "Domains & DNS", Globe2],
      ["billing", "Plans & billing", CircleDollarSign],
      ["audit", "Audit log", ShieldCheck],
      ["admin", "Platform admin", ShieldCheck],
      ["settings", "Settings", Settings],
    ],
  },
] as const;

const featureForModule: Record<string, string> = {
  leads: "crm", accounts: "crm", contacts: "crm", deals: "crm", cases: "cases", campaigns: "campaigns",
  reports: "reports", accounting: "accounting", expenses: "accounting", vendors: "accounting", invoices: "accounting",
  payments: "accounting", banking: "banking", payroll: "payroll", automations: "automations", websites: "websites",
  appearance: "websites", domains: "domains", email: "managedEmail",
};

export async function AppShell({
  organizationSlug,
  active,
  children,
}: {
  organizationSlug: string;
  active: string;
  children: React.ReactNode;
}) {
  const base = `/app/${organizationSlug}`;
  const organization = await getDb().organization.findUnique({ where: { slug: organizationSlug }, include: { theme: true, moduleConfiguration: true } });
  const theme = organization?.theme;
  const enabled = organization?.moduleConfiguration as Record<string, unknown> | null;
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items.filter(([slug]) => {
      const feature = featureForModule[slug];
      return !feature || enabled?.[feature] !== false;
    }),
  })).filter((section) => section.items.length);
  const shellStyle = {
    "--console-primary": theme?.consolePrimaryColor ?? "#c9a033",
    "--console-sidebar": theme?.consoleSidebarColor ?? "#1c1917",
    backgroundImage: theme?.consoleBackgroundImageUrl ? `linear-gradient(rgb(245 240 232 / 92%), rgb(245 240 232 / 92%)), url("${theme.consoleBackgroundImageUrl}")` : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as React.CSSProperties;

  return (
    <div className="grid min-h-screen lg:grid-cols-[238px_1fr]" style={shellStyle}>
      <aside className="hidden bg-[var(--console-sidebar)] text-slate-300 lg:flex lg:flex-col">
        <Link className="flex h-16 items-center gap-3 border-b border-white/8 px-5 font-semibold text-white" href={base}>
          {theme?.consoleLogoUrl ? (
            // Tenant logos can be hosted on arbitrary verified domains.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-9 rounded-lg object-contain" src={theme.consoleLogoUrl}/>
          ) : <span className="grid size-9 place-items-center rounded-lg bg-[var(--console-primary)] text-xs font-bold text-[#211b0d]">CK</span>}
          <span>{theme?.consoleTitle ?? organization?.name ?? "ClearKey Connect"}</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div className="mb-4" key={section.label}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{section.label}</div>
              {section.items.map(([slug, label, Icon]) => {
                const selected = active === slug;
                return (
                  <Link
                    className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                      selected ? "bg-[var(--console-primary)] text-[#211b0d] shadow-sm" : "hover:bg-white/7 hover:text-white"
                    }`}
                    href={slug === "dashboard" ? base : `${base}/${slug}`}
                    key={slug}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/8 p-4 text-xs text-slate-500">
          Workspace: <span className="text-slate-300">{organizationSlug}</span>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b bg-white px-5 lg:px-7">
          <div>
            <div className="text-xs text-slate-500">ClearKey workspace</div>
            <div className="text-sm font-semibold capitalize">{organizationSlug.replaceAll("-", " ")}</div>
          </div>
          <div className="flex items-center gap-3">
            <Link className="ck-button ck-button-secondary" href={`/p/${organizationSlug}`}>View client endpoint</Link>
            <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">CB</div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
