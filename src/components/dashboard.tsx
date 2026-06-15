import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleAlert,
  CircleDollarSign,
  FileWarning,
  Landmark,
  LayoutDashboard,
  Plus,
  Sparkles,
} from "lucide-react";
import { saveDashboardStudio } from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type DashboardData = NonNullable<Awaited<ReturnType<typeof import("@/lib/workspace-data").getWorkspaceDashboard>>>;

export function Dashboard({ data }: { data: DashboardData }) {
  const base = `/app/${data.organization.slug}`;
  const statMap = {
    cash: {
      label: "Cash position",
      value: data.stats.cash,
      note: "Connected and manual accounts",
      icon: Landmark,
      href: `${base}/banking`,
    },
    pipeline: {
      label: "Open pipeline",
      value: data.stats.pipeline,
      note: `${data.openDeals.length} highest-value opportunities`,
      icon: Sparkles,
      href: `${base}/deals`,
    },
    outstanding: {
      label: "Outstanding",
      value: data.stats.outstanding,
      note: `${data.invoices.filter((invoice) => invoice.balance > 0).length} invoices with balance`,
      icon: FileWarning,
      href: `${base}/invoices`,
    },
    collected: {
      label: "Collected",
      value: data.stats.collected,
      note: "Across current invoices",
      icon: CircleDollarSign,
      href: `${base}/payments`,
    },
    exceptions: {
      label: "Open exceptions",
      value: data.attention.reduce((sum, item) => sum + item.count, 0),
      note: "Operational decisions waiting",
      icon: CircleAlert,
      href: `${base}/tasks`,
    },
    receivables: {
      label: "Receivables",
      value: data.invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
      note: `${data.invoices.length} recent invoice records`,
      icon: BarChart3,
      href: `${base}/invoices`,
    },
    payroll: {
      label: "Payroll readiness",
      value: data.payroll?.employerCost ?? 0,
      note: data.payroll ? data.payroll.status.replaceAll("_", " ") : "No payroll run",
      icon: CalendarClock,
      href: `${base}/payroll`,
    },
  };
  const stats = [
    statMap.cash,
    statMap.pipeline,
    statMap.outstanding,
    statMap.collected,
  ];
  const savedDashboards = (data.dashboards ?? []) as Array<{
    id: string;
    name: string;
    shared: boolean;
    isDefault: boolean;
    config: { widgets?: string[]; chartStyle?: string; accent?: string };
  }>;
  const accentStyles: Record<string, string> = {
    gold: "border-amber-200 bg-amber-50/40 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    rose: "border-rose-200 bg-rose-50/50 text-rose-900",
  };
  return (
    <div className="p-5 lg:p-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><div className="ck-eyebrow">{data.organization.name}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Business command center</h1><p className="mt-1 text-sm text-slate-500">Live operational, customer, and financial signals from one tenant record.</p></div>
        <div className="flex flex-wrap gap-2">
          <details className="group relative">
            <summary className="ck-button !min-h-11 cursor-pointer list-none">
              <Plus size={16} />
              Create dashboard
            </summary>
            <form
              action={saveDashboardStudio}
              className="absolute right-0 z-20 mt-2 w-[min(620px,calc(100vw-40px))] rounded-xl border bg-white p-5 text-left shadow-2xl"
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={data.organization.slug}
              />
              <div className="flex items-center gap-2 font-semibold">
                <LayoutDashboard className="text-[#9b7420]" size={18} />
                Dashboard studio
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Dashboard name
                  <input
                    className="ck-input mt-2"
                    name="name"
                    placeholder="Owner scorecard"
                    required
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Visual style
                  <select className="ck-input mt-2" name="chartStyle">
                    <option value="cards">KPI cards</option>
                    <option value="bars">Horizontal bars</option>
                    <option value="spotlight">Spotlight tiles</option>
                    <option value="compact">Compact list</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Accent
                  <select className="ck-input mt-2" name="accent">
                    <option value="gold">Gold</option>
                    <option value="emerald">Emerald</option>
                    <option value="slate">Slate</option>
                    <option value="rose">Rose</option>
                  </select>
                </label>
                <div className="grid gap-2 text-xs font-semibold text-slate-600">
                  <label className="flex items-center gap-2">
                    <input name="isDefault" type="checkbox" /> Make default
                  </label>
                  <label className="flex items-center gap-2">
                    <input name="shared" type="checkbox" /> Share with team
                  </label>
                </div>
              </div>
              <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
                <legend className="mb-2 text-xs font-semibold text-slate-600">
                  KPIs and sections
                </legend>
                {Object.entries(statMap).map(([key, item]) => (
                  <label
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    key={key}
                  >
                    <input
                      defaultChecked={["cash", "pipeline", "outstanding"].includes(key)}
                      name="widgets"
                      type="checkbox"
                      value={key}
                    />
                    {item.label}
                  </label>
                ))}
              </fieldset>
              <button className="ck-button mt-4 w-full" type="submit">
                Save dashboard
              </button>
            </form>
          </details>
          <Link className="ck-button ck-button-secondary !min-h-11" href={`${base}/invoices`}>Create invoice</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }, index) => <article className="ck-card relative overflow-hidden p-5" key={label}><div className="absolute inset-y-0 left-0 w-1 bg-[#c9a033]" style={{ opacity: .35 + index * .14 }} /><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</div><div className="mt-2 text-xs text-slate-500">{note}</div></div><Icon className="text-[#9b7420]" size={19} /></div></article>)}
      </div>
      {savedDashboards.length > 0 && (
        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          {savedDashboards.map((dashboard) => {
            const widgetKeys = dashboard.config?.widgets?.length
              ? dashboard.config.widgets
              : ["cash", "pipeline", "outstanding"];
            const style = dashboard.config?.chartStyle ?? "cards";
            const accent = dashboard.config?.accent ?? "gold";
            return (
              <article className="ck-card overflow-hidden" key={dashboard.id}>
                <div className="flex items-center justify-between border-b p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{dashboard.name}</h2>
                      {dashboard.isDefault && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {style.replaceAll("_", " ")} layout
                      {dashboard.shared ? " · shared" : " · personal"}
                    </p>
                  </div>
                  <LayoutDashboard className="text-[#9b7420]" size={18} />
                </div>
                <div
                  className={`grid gap-3 p-4 ${
                    style === "compact" ? "" : "sm:grid-cols-2"
                  }`}
                >
                  {widgetKeys.map((key) => {
                    const item = statMap[key as keyof typeof statMap];
                    if (!item) return null;
                    const Icon = item.icon;
                    const percent =
                      style === "bars"
                        ? Math.min(100, Math.max(8, Number(item.value) / 800))
                        : 0;
                    return (
                      <Link
                        className={`rounded-lg border p-4 ${accentStyles[accent] ?? accentStyles.gold}`}
                        href={item.href}
                        key={key}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[.12em] opacity-70">
                              {item.label}
                            </div>
                            <div className="mt-2 text-xl font-semibold">
                              {key === "exceptions"
                                ? Number(item.value).toLocaleString()
                                : formatCurrency(Number(item.value))}
                            </div>
                          </div>
                          <Icon size={18} />
                        </div>
                        <p className="mt-2 text-xs opacity-70">{item.note}</p>
                        {style === "bars" && (
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                            <div
                              className="h-full rounded-full bg-current"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <section className="ck-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Pipeline movement</h2><p className="text-xs text-slate-500">Weighted opportunities requiring the next action.</p></div><Link className="text-xs font-semibold text-[#8b6914]" href={`${base}/deals`}>Full pipeline <ArrowRight className="inline" size={13}/></Link></div>
          <div className="divide-y">{data.openDeals.map((deal) => <div className="grid grid-cols-[1fr_auto] gap-4 p-5" key={deal.id}><div><div className="font-medium">{deal.name}</div><div className="mt-1 text-xs text-slate-500">{deal.account} · {deal.stage.replaceAll("_", " ")}</div><div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-[#c9a033]" style={{ width: `${deal.probability}%` }}/></div></div><div className="text-right"><div className="font-semibold">{formatCurrency(deal.amount)}</div><div className="mt-1 text-xs text-slate-500">{deal.probability}%</div></div></div>)}</div>
        </section>
        <section className="ck-card overflow-hidden">
          <div className="border-b p-5"><h2 className="font-semibold">Work needing attention</h2><p className="text-xs text-slate-500">Prioritized by due date and urgency.</p></div>
          <div className="divide-y">{data.tasks.map((task) => <div className="flex gap-3 p-4" key={task.id}><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><CalendarClock size={16}/></div><div><div className="text-sm font-medium">{task.title}</div><div className="mt-1 text-xs text-slate-500">{task.priority} · {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No due date"}</div></div></div>)}</div>
        </section>
      </div>
      <section className="ck-card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div><div className="ck-eyebrow">Operating queue</div><h2 className="mt-2 font-semibold">Exceptions requiring a decision</h2><p className="mt-1 text-xs text-slate-500">Cross-module work is prioritized here so revenue and accounting do not stall between departments.</p></div>
          <div className="rounded-full bg-[#f8f5ef] px-3 py-1.5 text-xs font-semibold">{data.attention.reduce((sum, item) => sum + item.count, 0)} open exceptions</div>
        </div>
        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-5">
          {data.attention.map((item) => <Link className="group bg-white p-5 transition hover:bg-amber-50" href={`${base}/${item.module}`} key={item.key}>
            <div className="flex items-start justify-between"><CircleAlert className={item.count ? "text-amber-700" : "text-emerald-700"} size={18}/><span className="text-2xl font-semibold">{item.count}</span></div>
            <h3 className="mt-5 text-sm font-semibold">{item.label}</h3>
            <p className="mt-2 min-h-12 text-xs leading-5 text-slate-500">{item.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#8b6914]">Open workbench <ArrowRight className="transition group-hover:translate-x-1" size={13}/></span>
          </Link>)}
        </div>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="ck-card overflow-hidden"><div className="border-b p-5"><h2 className="font-semibold">Receivables</h2></div><div className="divide-y">{data.invoices.slice(0,5).map((invoice) => <div className="flex items-center justify-between p-4" key={invoice.id}><div><div className="text-sm font-medium">{invoice.number} · {invoice.customer}</div><div className="mt-1 text-xs text-slate-500">{invoice.status.replaceAll("_"," ")} · due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</div></div><div className="font-semibold">{formatCurrency(invoice.balance)}</div></div>)}</div></section>
        <section className="ck-card p-5"><h2 className="font-semibold">Payroll readiness</h2>{data.payroll ? <><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-[#f8f5ef] p-4"><div className="text-xs text-slate-500">Gross payroll</div><div className="mt-2 text-xl font-semibold">{formatCurrency(data.payroll.grossPay)}</div></div><div className="rounded-lg bg-[#f8f5ef] p-4"><div className="text-xs text-slate-500">Employer cost</div><div className="mt-2 text-xl font-semibold">{formatCurrency(data.payroll.employerCost)}</div></div></div><div className="mt-4 flex items-center justify-between text-sm"><span>Status: <strong>{data.payroll.status.replaceAll("_"," ")}</strong></span><Link className="font-semibold text-[#8b6914]" href={`${base}/payroll`}>Review payroll</Link></div></> : <p className="mt-4 text-sm text-slate-500">Connect Check or Finch to initialize payroll.</p>}</section>
      </div>
    </div>
  );
}
