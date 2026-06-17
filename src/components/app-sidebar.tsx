"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  Globe2,
  Headphones,
  Landmark,
  ListTodo,
  Megaphone,
  MessageSquare,
  Plug,
  Settings,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type SidebarChild = { label: string; slug: string };

type SidebarItem = {
  children?: SidebarChild[];
  childrenNested?: boolean;
  feature?: string;
  icon: LucideIcon;
  label: string;
  slug: string;
};

type SidebarSection = { label: string; items: SidebarItem[] };

const moduleTints: Record<string, string> = {
  dashboard: "#5B5FCF",
  reports: "#5B5FCF",
  tasks: "#5B5FCF",
  calendar: "#F97316",
  bookings: "#F97316",
  collaboration: "#3B82F6",
  crm: "#0EA5E9",
  leads: "#0EA5E9",
  accounts: "#0EA5E9",
  contacts: "#0EA5E9",
  deals: "#0EA5E9",
  cases: "#EF4444",
  campaigns: "#0EA5E9",
  invoices: "#10B981",
  payments: "#10B981",
  expenses: "#10B981",
  vendors: "#10B981",
  accounting: "#10B981",
  banking: "#10B981",
  products: "#10B981",
  payroll: "#8B5CF6",
  "tax-documents": "#F59E0B",
  automations: "#A855F7",
  email: "#06B6D4",
  documents: "#6B7280",
  submissions: "#EF4444",
  notifications: "#6B7280",
  integrations: "#A855F7",
  "payment-settings": "#10B981",
  support: "#EF4444",
  team: "#6B7280",
  appearance: "#EC4899",
  websites: "#EC4899",
  "data-studio": "#5B5FCF",
  domains: "#A855F7",
  billing: "#10B981",
  audit: "#6B7280",
  compliance: "#F59E0B",
  settings: "#6B7280",
};

const sections: SidebarSection[] = [
  {
    label: "Overview",
    items: [
      { slug: "dashboard", label: "Dashboard", icon: Gauge },
      { slug: "reports", label: "Reports", icon: BarChart3, feature: "reports" },
      { slug: "tasks", label: "Tasks", icon: ListTodo },
      { slug: "calendar", label: "Calendar", icon: CalendarDays },
      { slug: "collaboration", label: "Collaboration", icon: MessageSquare },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        slug: "crm",
        label: "CRM",
        icon: Sparkles,
        feature: "crm",
        children: [
          { slug: "leads", label: "Leads" },
          { slug: "accounts", label: "Accounts" },
          { slug: "contacts", label: "Contacts" },
          { slug: "deals", label: "Deals" },
        ],
      },
      { slug: "cases", label: "Cases", icon: Headphones, feature: "cases" },
      { slug: "campaigns", label: "Campaigns", icon: Megaphone, feature: "campaigns" },
    ],
  },
  {
    label: "Finance",
    items: [
      { slug: "invoices", label: "Invoices", icon: FileText, feature: "accounting" },
      { slug: "payments", label: "Payments", icon: CircleDollarSign, feature: "accounting" },
      { slug: "banking", label: "Banking", icon: Landmark, feature: "banking" },
      {
        slug: "accounting",
        label: "Accounting",
        icon: BookOpen,
        feature: "accounting",
        childrenNested: true,
        children: [
          { slug: "chart-of-accounts", label: "Chart of accounts" },
          { slug: "journal", label: "Journal" },
          { slug: "bank-transactions", label: "Bank feed" },
          { slug: "reconciliation", label: "Reconcile" },
          { slug: "expenses-receipts", label: "Expenses" },
          { slug: "vendors-bills", label: "Bills" },
          { slug: "payroll", label: "Payroll" },
          { slug: "tax-documents", label: "Tax documents" },
          { slug: "products", label: "Products" },
        ],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      { slug: "automations", label: "Automations", icon: Workflow, feature: "automations" },
      { slug: "integrations", label: "Integrations", icon: Plug },
      {
        slug: "websites",
        label: "Sites & content",
        icon: Globe2,
        feature: "websites",
        children: [
          { slug: "websites", label: "Website builder" },
          { slug: "appearance", label: "Appearance" },
          { slug: "domains", label: "Domains" },
          { slug: "email", label: "Email" },
          { slug: "documents", label: "Documents" },
          { slug: "submissions", label: "Form inbox" },
          { slug: "notifications", label: "Notifications" },
        ],
      },
      {
        slug: "settings",
        label: "Workspace",
        icon: Settings,
        children: [
          { slug: "team", label: "Team & roles" },
          { slug: "payment-settings", label: "Payment providers" },
          { slug: "billing", label: "Plans & billing" },
          { slug: "data-studio", label: "Data & storage" },
          { slug: "audit", label: "Audit log" },
          { slug: "compliance", label: "Compliance" },
          { slug: "settings", label: "Settings" },
          { slug: "support", label: "ClearKey support" },
        ],
      },
    ],
  },
];

const scrollKey = "ckconnect.sidebar.scrollTop";
const openSectionsKey = "ckconnect.sidebar.openSections";
const expandedItemsKey = "ckconnect.sidebar.expandedItems";
const collapsedKey = "ckconnect.sidebar.collapsed";

const defaultSections = sections.map((s) => s.label);

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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(defaultSections);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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

  const activeItemParent = useMemo(() => {
    for (const section of visibleSections) {
      for (const item of section.items) {
        if (item.children?.some((c) => c.slug === active)) return item.slug;
      }
    }
    return null;
  }, [active, visibleSections]);

  const effectiveExpandedItems = useMemo(() => {
    if (!activeItemParent || expandedItems.includes(activeItemParent)) return expandedItems;
    return [...expandedItems, activeItemParent];
  }, [expandedItems, activeItemParent]);

  useEffect(() => {
    try {
      const c = localStorage.getItem(collapsedKey);
      if (c !== null) setIsCollapsed(JSON.parse(c) as boolean);
      const s = localStorage.getItem(openSectionsKey);
      if (s) setOpenSections(JSON.parse(s) as string[]);
      const e = localStorage.getItem(expandedItemsKey);
      if (e) setExpandedItems(JSON.parse(e) as string[]);
    } catch {}
  }, []);

  useEffect(() => {
    const saved = Number(sessionStorage.getItem(scrollKey) ?? "0");
    if (navRef.current) navRef.current.scrollTop = saved;
  }, [pathname]);

  function persistScroll() {
    if (!navRef.current) return;
    sessionStorage.setItem(scrollKey, String(navRef.current.scrollTop));
  }

  function toggleSection(label: string) {
    setOpenSections((current) => {
      const next = current.includes(label)
        ? current.filter((s) => s !== label)
        : [...current, label];
      try { localStorage.setItem(openSectionsKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function toggleItem(slug: string) {
    setExpandedItems((current) => {
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      try { localStorage.setItem(expandedItemsKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem(collapsedKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const iconOnly = isRail || isCollapsed;

  return (
    <aside
      className={`ck-sidebar hidden h-screen shrink-0 overflow-hidden bg-[var(--console-sidebar)] text-slate-300 transition-all duration-200 ease-in-out lg:flex lg:flex-col ${iconOnly ? "w-14" : "w-[260px]"}`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-white/8">
        <Link
          className={`flex items-center gap-3 font-semibold text-white ${iconOnly ? "px-[13px]" : "px-4"}`}
          href={base}
          onClick={persistScroll}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-9 shrink-0 rounded-lg object-contain" src={logoUrl} />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ck-accent)] text-xs font-bold text-white">
              CK
            </span>
          )}
          {!iconOnly && <span className="truncate">{title}</span>}
        </Link>
      </div>

      <nav
        className="ck-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3"
        onScroll={persistScroll}
        ref={navRef}
      >
        {visibleSections.map((section) => {
          const isSectionOpen = iconOnly || openSections.includes(section.label);
          return (
            <div className="mb-3" key={section.label}>
              {!iconOnly && (
                <button
                  className="mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 transition hover:text-slate-300"
                  onClick={() => toggleSection(section.label)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={`transition ${isSectionOpen ? "" : "-rotate-90"}`}
                    size={12}
                  />
                </button>
              )}
              {isSectionOpen && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isSelected = active === item.slug;
                    const hasActiveChild = item.children?.some((c) => c.slug === active) ?? false;
                    const isExpanded = !iconOnly && effectiveExpandedItems.includes(item.slug);
                    const Icon = item.icon;
                    const tint = moduleTints[item.slug] ?? "#5B5FCF";
                    return (
                      <div
                        key={item.slug}
                        style={{ "--module-tint": tint } as CSSProperties & Record<"--module-tint", string>}
                      >
                        <div
                          className={`relative flex items-center rounded-lg ${
                            isSelected
                              ? "ck-sidebar-link-active text-white"
                              : hasActiveChild
                              ? "text-slate-200"
                              : "text-slate-300 hover:bg-white/7 hover:text-white"
                          }`}
                        >
                          <Link
                            className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-[13px]"
                            href={item.slug === "dashboard" ? base : `${base}/${item.slug}`}
                            onClick={persistScroll}
                            title={iconOnly ? item.label : undefined}
                          >
                            <Icon className="shrink-0" size={16} />
                            {!iconOnly && <span className="truncate">{item.label}</span>}
                          </Link>
                          {!iconOnly && item.children && (
                            <button
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                              className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
                              onClick={() => toggleItem(item.slug)}
                              type="button"
                            >
                              <ChevronDown
                                className={`transition ${isExpanded ? "" : "-rotate-90"}`}
                                size={13}
                              />
                            </button>
                          )}
                        </div>
                        {isExpanded && item.children && (
                          <div className="ml-[13px] mt-0.5 border-l border-white/10 pb-1 pl-3">
                            {item.children.map((child) => {
                              const childActive = active === child.slug;
                              const childHref = item.childrenNested
                                ? `${base}/${item.slug}/${child.slug}`
                                : `${base}/${child.slug}`;
                              return (
                                <Link
                                  className={`block rounded-md px-2 py-1.5 text-[12px] transition ${
                                    childActive
                                      ? "font-medium text-white"
                                      : "text-slate-400 hover:bg-white/7 hover:text-white"
                                  }`}
                                  href={childHref}
                                  key={child.slug}
                                  onClick={persistScroll}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
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

      <div className="shrink-0 border-t border-white/8 p-2">
        {!isRail && (
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-500 transition hover:bg-white/7 hover:text-slate-300"
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        )}
        {!iconOnly && (
          <p className="mt-1 truncate px-2 text-[10px] text-slate-600">{organizationSlug}</p>
        )}
      </div>
    </aside>
  );
}
