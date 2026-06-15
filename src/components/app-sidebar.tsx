"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BadgeDollarSign,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ContactRound,
  Database,
  FileCheck2,
  FileText,
  Files,
  Gauge,
  Globe2,
  HandCoins,
  Headphones,
  Landmark,
  ListTodo,
  Mail,
  Megaphone,
  MessageSquare,
  Palette,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type SidebarItem = {
  children?: { label: string; slug: string }[];
  feature?: string;
  icon: LucideIcon;
  label: string;
  slug: string;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    label: "Overview",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: Gauge },
      { slug: "reports", label: "Reports", icon: BarChart3, feature: "reports" },
      { slug: "tasks", label: "Tasks", icon: ListTodo },
      { slug: "calendar", label: "Calendar", icon: CalendarDays },
      { slug: "bookings", label: "Bookings", icon: CalendarDays },
      { slug: "collaboration", label: "Collaboration", icon: MessageSquare },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        slug: "crm",
        label: "CRM center",
        icon: Sparkles,
        feature: "crm",
        children: [
          { slug: "leads", label: "Leads" },
          { slug: "accounts", label: "Accounts" },
          { slug: "contacts", label: "Contacts" },
          { slug: "deals", label: "Deals" },
          { slug: "cases", label: "Cases" },
          { slug: "campaigns", label: "Campaigns" },
          { slug: "tasks", label: "Tasks" },
          { slug: "reports", label: "Reports" },
          { slug: "automation", label: "Automation" },
        ],
      },
      { slug: "leads", label: "Leads", icon: Sparkles, feature: "crm" },
      { slug: "accounts", label: "Accounts", icon: Building2, feature: "crm" },
      { slug: "contacts", label: "Contacts", icon: ContactRound, feature: "crm" },
      { slug: "deals", label: "Deals", icon: BriefcaseBusiness, feature: "crm" },
      { slug: "cases", label: "Cases", icon: Headphones, feature: "cases" },
      { slug: "campaigns", label: "Campaigns", icon: Megaphone, feature: "campaigns" },
    ],
  },
  {
    label: "Finance",
    items: [
      { slug: "invoices", label: "Invoices", icon: FileText, feature: "accounting" },
      { slug: "payments", label: "Payments", icon: CircleDollarSign, feature: "accounting" },
      { slug: "expenses", label: "Expenses", icon: Receipt, feature: "accounting" },
      { slug: "vendors", label: "Vendors & bills", icon: HandCoins, feature: "accounting" },
      {
        slug: "accounting",
        label: "Accounting",
        icon: BookOpen,
        feature: "accounting",
        children: [
          { slug: "sales-invoices", label: "Invoices" },
          { slug: "payments-deposits", label: "Payments" },
          { slug: "vendors-bills", label: "Bills" },
          { slug: "expenses-receipts", label: "Expenses" },
          { slug: "bank-transactions", label: "Bank feed" },
          { slug: "reconciliation", label: "Reconcile" },
          { slug: "chart-of-accounts", label: "Chart" },
          { slug: "journal", label: "Journal" },
          { slug: "close-books", label: "Close" },
          { slug: "reports", label: "Reports" },
        ],
      },
      { slug: "banking", label: "Banking", icon: Landmark, feature: "banking" },
      { slug: "products", label: "Products", icon: Boxes },
      { slug: "payroll", label: "Payroll", icon: BadgeDollarSign, feature: "payroll" },
      { slug: "tax-documents", label: "Tax documents", icon: FileCheck2 },
    ],
  },
  {
    label: "Platform",
    items: [
      { slug: "automations", label: "Automations", icon: Workflow, feature: "automations" },
      { slug: "email", label: "Email", icon: Mail, feature: "managedEmail" },
      { slug: "documents", label: "Documents", icon: Files },
      { slug: "submissions", label: "Form inbox", icon: Headphones },
      { slug: "notifications", label: "Notifications", icon: Bell },
      { slug: "integrations", label: "Integrations", icon: Plug },
      { slug: "payment-settings", label: "Payment providers", icon: CircleDollarSign },
      { slug: "support", label: "ClearKey support", icon: Headphones },
      { slug: "team", label: "Team & roles", icon: Users },
      { slug: "appearance", label: "Appearance", icon: Palette, feature: "websites" },
      { slug: "websites", label: "Website builder", icon: Globe2, feature: "websites" },
      { slug: "data-studio", label: "Data & storage", icon: Database },
      { slug: "domains", label: "Domains & DNS", icon: Globe2, feature: "domains" },
      { slug: "billing", label: "Plans & billing", icon: CircleDollarSign },
      { slug: "audit", label: "Audit log", icon: ShieldCheck },
      { slug: "admin", label: "Platform admin", icon: ShieldCheck },
      { slug: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const scrollStorageKey = "ckconnect.sidebar.scrollTop";
const openStorageKey = "ckconnect.sidebar.openSections";

export function AppSidebar({
  active,
  base,
  enabled,
  logoUrl,
  navigationStyle,
  organizationSlug,
  title,
}: {
  active: string;
  base: string;
  enabled: Record<string, unknown> | null;
  logoUrl?: string | null;
  navigationStyle?: string | null;
  organizationSlug: string;
  title: string;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const isRail = navigationStyle === "rail";
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => !item.feature || enabled?.[item.feature] !== false,
          ),
        }))
        .filter((section) => section.items.length),
    [enabled],
  );
  const activeSection =
    visibleSections.find((section) =>
      section.items.some((item) => item.slug === active),
    )?.label ?? "Overview";
  const [openSections, setOpenSections] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["Overview"];
    const stored = window.sessionStorage.getItem(openStorageKey);
    return stored ? (JSON.parse(stored) as string[]) : ["Overview"];
  });
  const visibleOpenSections = useMemo(() => {
    const next = new Set(openSections);
    next.add(activeSection);
    return [...next];
  }, [activeSection, openSections]);

  useEffect(() => {
    const restoreScroll = () => {
      const saved = Number(sessionStorage.getItem(scrollStorageKey) ?? "0");
      if (navRef.current) navRef.current.scrollTop = saved;
    };
    restoreScroll();
    const frame = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  function persistScroll() {
    if (!navRef.current) return;
    sessionStorage.setItem(scrollStorageKey, String(navRef.current.scrollTop));
  }

  function toggleSection(label: string) {
    setOpenSections((current) => {
      const next = current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label];
      sessionStorage.setItem(openStorageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <aside className="ck-sidebar hidden h-screen overflow-hidden bg-[var(--console-sidebar)] text-slate-300 lg:flex lg:flex-col">
      <Link
        className="ck-sidebar-brand flex h-16 shrink-0 items-center gap-3 border-b border-white/8 px-5 font-semibold text-white"
        href={base}
        onClick={persistScroll}
      >
        {logoUrl ? (
          // Tenant logos can be hosted on arbitrary verified domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-9 rounded-lg object-contain" src={logoUrl} />
        ) : (
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--console-primary)] text-xs font-bold text-[#211b0d]">
            CK
          </span>
        )}
        {!isRail && <span className="truncate">{title}</span>}
      </Link>
      <nav
        className="ck-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        onScroll={persistScroll}
        ref={navRef}
      >
        {visibleSections.map((section) => {
          const isOpen = isRail || visibleOpenSections.includes(section.label);
          return (
            <div className="mb-2" key={section.label}>
              {!isRail && (
                <button
                  className="ck-sidebar-section flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 transition hover:bg-white/7 hover:text-slate-300"
                  onClick={() => toggleSection(section.label)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={`transition ${isOpen ? "" : "-rotate-90"}`}
                    size={14}
                  />
                </button>
              )}
              {isOpen && (
                <div className={`mt-1 space-y-1 ${isRail ? "" : "pl-1"}`}>
                  {section.items.map((item) => {
                    const selected = active === item.slug;
                    const Icon = item.icon;
                    return (
                      <div key={item.slug}>
                      <Link
                        className={`ck-sidebar-link flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                          selected
                            ? "ck-sidebar-link-active bg-[var(--console-primary)] text-[#211b0d] shadow-sm"
                            : "hover:bg-white/7 hover:text-white"
                        }`}
                        href={
                          item.slug === "dashboard" ? base : `${base}/${item.slug}`
                        }
                        onClick={persistScroll}
                        title={isRail ? item.label : undefined}
                      >
                        <Icon className="shrink-0" size={16} />
                        {!isRail && <span className="truncate">{item.label}</span>}
                      </Link>
                      {selected && item.children && !isRail && (
                        <div className="ml-7 mt-1 grid gap-1 border-l border-white/10 pl-2">
                          {item.children.map((child) => (
                            <Link
                              className="ck-sidebar-child rounded-md px-2 py-1.5 text-[12px] text-slate-400 transition hover:bg-white/7 hover:text-white"
                              href={`${base}/${item.slug}/${child.slug}`}
                              key={child.slug}
                              onClick={persistScroll}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div
        className={`shrink-0 border-t border-white/8 p-4 text-xs text-slate-500 ${isRail ? "hidden" : ""}`}
      >
        Workspace: <span className="text-slate-300">{organizationSlug}</span>
      </div>
    </aside>
  );
}
