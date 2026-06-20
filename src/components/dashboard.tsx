import Link from "next/link";
import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import {
  ArrowRight,
  BarChart3,
  CircleAlert,
  CircleDollarSign,
  FileDown,
  FileText,
  Landmark,
  LayoutDashboard,
  LineChart,
  Plus,
  Sparkles,
} from "lucide-react";
import { saveDashboardStudio } from "@/app/app/[organizationSlug]/actions";
import { EChartsPanel } from "@/components/charts/echarts-panel";
import { ThreeMetricScene } from "@/components/charts/three-metric-scene";
import { formatCurrency } from "@/lib/utils";

type DashboardData = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/workspace-data").getWorkspaceDashboard>>
>;

type StatKey =
  | "cash"
  | "pipeline"
  | "outstanding"
  | "collected"
  | "exceptions"
  | "receivables"
  | "payroll"
  | "newLeads"
  | "overdueTasks"
  | "bankReview"
  | "automationFailures";

type StatDefinition = {
  label: string;
  value: number;
  note: string;
  href: string;
  format?: "currency" | "number";
};

const chartStyles = [
  ["line", "Line"],
  ["bar", "Bar"],
  ["area", "Area"],
  ["pie", "Pie"],
  ["funnel", "Funnel"],
  ["kpi", "KPI strip"],
] as const;

function valueLabel(stat: StatDefinition) {
  return stat.format === "number"
    ? stat.value.toLocaleString()
    : formatCurrency(stat.value);
}

function chartOption(
  title: string,
  style: string,
  rows: Array<{ name: string; value: number }>,
): EChartsOption {
  const normalizedStyle =
    style === "bars" || style === "spotlight" ? "bar" :
    style === "trend" ? "line" :
    style === "donut" ? "pie" :
    ["line", "bar", "area", "pie", "funnel"].includes(style) ? style :
    "bar";
  const textColor = "#111827";
  const axis = {
    axisLine: { lineStyle: { color: "#d7dce5" } },
    axisLabel: { color: "#667085" },
    splitLine: { lineStyle: { color: "#edf1f7" } },
  };
  if (normalizedStyle === "pie") {
    return {
      color: ["#5b5fcf", "#16a34a", "#f59e0b", "#0ea5e9", "#ef4444"],
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          label: { color: textColor, formatter: "{b}" },
          data: rows,
        },
      ],
    };
  }
  if (normalizedStyle === "funnel") {
    return {
      color: ["#5b5fcf", "#0ea5e9", "#16a34a", "#f59e0b"],
      tooltip: { trigger: "item" },
      series: [
        {
          type: "funnel",
          left: "6%",
          top: 12,
          bottom: 12,
          width: "88%",
          label: { color: textColor },
          data: rows,
        },
      ],
    };
  }
  return {
    color: ["#5b5fcf"],
    grid: { top: 24, right: 18, bottom: 34, left: 56 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: rows.map((row) => row.name), ...axis },
    yAxis: { type: "value", ...axis },
    series: [
      {
        name: title,
        type: normalizedStyle === "bar" ? "bar" : "line",
        smooth: true,
        areaStyle: normalizedStyle === "area" ? {} : undefined,
        data: rows.map((row) => row.value),
      },
    ],
  };
}

export function Dashboard({ data }: { data: DashboardData }) {
  const base = `/app/${data.organization.slug}`;
  const statMap: Record<StatKey, StatDefinition> = {
    cash: {
      label: "Cash position",
      value: data.stats.cash,
      note: "Connected and manual accounts",
      href: `${base}/banking`,
    },
    pipeline: {
      label: "Open pipeline",
      value: data.stats.pipeline,
      note: `${data.openDeals.length} highest-value opportunities`,
      href: `${base}/deals`,
    },
    outstanding: {
      label: "Outstanding",
      value: data.stats.outstanding,
      note: `${data.invoices.filter((invoice) => invoice.balance > 0).length} invoices with balance`,
      href: `${base}/invoices`,
    },
    collected: {
      label: "Collected",
      value: data.stats.collected,
      note: "Across current invoices",
      href: `${base}/payments`,
    },
    exceptions: {
      label: "Open exceptions",
      value: data.attention.reduce((sum, item) => sum + item.count, 0),
      note: "Operational decisions waiting",
      href: `${base}/tasks`,
      format: "number",
    },
    receivables: {
      label: "Receivables",
      value: data.invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
      note: `${data.invoices.length} recent invoice records`,
      href: `${base}/invoices`,
    },
    payroll: {
      label: "Payroll readiness",
      value: data.payroll?.employerCost ?? 0,
      note: data.payroll
        ? data.payroll.status.replaceAll("_", " ")
        : "No payroll run",
      href: `${base}/payroll`,
    },
    newLeads: {
      label: "New leads",
      value: data.stats.newLeads,
      note: "Unqualified demand waiting",
      href: `${base}/leads`,
      format: "number",
    },
    overdueTasks: {
      label: "Overdue tasks",
      value:
        data.attention.find((item) => item.key === "overdue-tasks")?.count ??
        0,
      note: "Commitments past due",
      href: `${base}/tasks`,
      format: "number",
    },
    bankReview: {
      label: "Bank feed review",
      value:
        data.attention.find((item) => item.key === "unmatched-banking")
          ?.count ?? 0,
      note: "Transactions needing match",
      href: `${base}/banking`,
      format: "number",
    },
    automationFailures: {
      label: "Automation failures",
      value:
        data.attention.find((item) => item.key === "automation-failures")
          ?.count ?? 0,
      note: "Failed in the last 7 days",
      href: `${base}/automations`,
      format: "number",
    },
  };
  const signalKeys: StatKey[] = ["cash", "pipeline", "outstanding", "collected"];
  const savedDashboards = (data.dashboards ?? []) as Array<{
    id: string;
    name: string;
    shared: boolean;
    isDefault: boolean;
    config: {
      widgets?: StatKey[];
      chartStyle?: string;
      dateRange?: string;
      comparison?: string;
      refreshMinutes?: number;
      goalMetric?: string;
      goalTarget?: number;
      showInsights?: boolean;
    };
  }>;
  const primaryRows = signalKeys.map((key) => ({
    name: statMap[key].label,
    value: statMap[key].value,
  }));
  const pipelineRows = data.openDeals.map((deal) => ({
    name: deal.name,
    value: deal.amount,
  }));

  return (
    <div
      className="ck-module-page px-5 py-5 lg:px-7"
      style={
        { "--module-tint": "#5B5FCF" } as CSSProperties &
          Record<"--module-tint", string>
      }
    >
      <div className="ck-module-header flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="ck-module-pill">Command</span>
            <div className="ck-section-label">{data.organization.name}</div>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Business command center
          </h1>
          <p className="mt-1 text-sm text-[var(--ck-ink-secondary)]">
            Operational, CRM, and accounting signals with drill-down paths to the source records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <details className="group relative">
            <summary className="ck-button !min-h-11 cursor-pointer list-none">
              <Plus size={16} />
              Create dashboard
            </summary>
            <form
              action={saveDashboardStudio}
              className="absolute right-0 z-20 mt-2 w-[min(1080px,calc(100vw-40px))] overflow-hidden rounded-2xl border bg-white text-left shadow-2xl"
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={data.organization.slug}
              />
              <div className="grid max-h-[84vh] overflow-y-auto lg:grid-cols-[300px_1fr_300px]">
                <aside className="border-r bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <LayoutDashboard size={18} />
                    Dashboard studio
                  </div>
                  <label className="mt-5 block text-xs font-semibold text-white/70">
                    Dashboard name
                    <input
                      className="ck-input mt-2 bg-white text-slate-950"
                      name="name"
                      placeholder="Owner scorecard"
                      required
                    />
                  </label>
                  <label className="mt-4 block text-xs font-semibold text-white/70">
                    Date range
                    <select className="ck-input mt-2 bg-white text-slate-950" name="dateRange">
                      <option value="30d">Last 30 days</option>
                      <option value="today">Today</option>
                      <option value="7d">Last 7 days</option>
                      <option value="quarter">This quarter</option>
                      <option value="year">This year</option>
                    </select>
                  </label>
                  <label className="mt-4 block text-xs font-semibold text-white/70">
                    Compare against
                    <select className="ck-input mt-2 bg-white text-slate-950" name="comparison">
                      <option value="prior_period">Prior period</option>
                      <option value="target">Target</option>
                      <option value="none">No comparison</option>
                    </select>
                  </label>
                  <label className="mt-4 block text-xs font-semibold text-white/70">
                    Refresh cadence
                    <select className="ck-input mt-2 bg-white text-slate-950" name="refreshMinutes">
                      <option value="0">Manual refresh</option>
                      <option value="15">Every 15 minutes</option>
                      <option value="60">Hourly</option>
                      <option value="240">Every 4 hours</option>
                      <option value="1440">Daily</option>
                    </select>
                  </label>
                  <div className="mt-5 space-y-2 text-xs font-semibold text-white/80">
                    <label className="flex items-center gap-2">
                      <input name="isDefault" type="checkbox" /> Make default
                    </label>
                    <label className="flex items-center gap-2">
                      <input defaultChecked name="shared" type="checkbox" /> Share with team
                    </label>
                    <label className="flex items-center gap-2">
                      <input defaultChecked name="showInsights" type="checkbox" /> Show insights
                    </label>
                  </div>
                </aside>
                <section className="p-5">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="ck-section-label">Apache ECharts</div>
                      <h2 className="font-semibold">Visualization type</h2>
                    </div>
                    <select className="ck-input max-w-52" name="chartStyle">
                      {chartStyles.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4">
                    <EChartsPanel
                      option={chartOption("Command signals", "bar", primaryRows)}
                    />
                  </div>
                  <div className="mt-5 overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[.12em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Metric</th>
                          <th className="px-4 py-3">Value</th>
                          <th className="px-4 py-3">Include</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(statMap).map(([key, stat]) => (
                          <tr key={key}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{stat.label}</div>
                              <div className="text-xs text-slate-500">{stat.note}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold">{valueLabel(stat)}</td>
                            <td className="px-4 py-3">
                              <input
                                defaultChecked={signalKeys.includes(key as StatKey)}
                                name="widgets"
                                type="checkbox"
                                value={key}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <aside className="border-l bg-slate-50 p-5">
                  <div className="ck-section-label">Goal layer</div>
                  <label className="mt-4 block text-xs font-semibold text-slate-600">
                    Goal metric
                    <select className="ck-input mt-2" name="goalMetric">
                      <option value="">No goal</option>
                      {Object.entries(statMap).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 block text-xs font-semibold text-slate-600">
                    Goal target
                    <input className="ck-input mt-2" min="0" name="goalTarget" type="number" />
                  </label>
                  <input name="accent" type="hidden" value="slate" />
                  <input name="density" type="hidden" value="balanced" />
                  <input name="columns" type="hidden" value="3" />
                  <input name="showActivity" type="hidden" value="on" />
                  <div className="mt-6 border-t pt-5 text-xs leading-5 text-slate-600">
                    Dashboards store the selected dataset contract, chart type,
                    refresh cadence, and source links. Widgets open the module
                    that owns the data instead of becoming dead decorative blocks.
                  </div>
                  <button className="ck-button mt-5 w-full" type="submit">
                    Save dashboard
                  </button>
                </aside>
              </div>
            </form>
          </details>
          <Link className="ck-button ck-button-secondary !min-h-11" href={`${base}/invoices`}>
            <FileText size={16} />
            Create invoice
          </Link>
        </div>
      </div>

      <nav className="ck-module-tabs mt-4" aria-label="Dashboard sections">
        <a className="is-active" href="#signals">Signals</a>
        <a href="#studio">Studio</a>
        <a href="#pipeline">Pipeline</a>
        <a href="#queue">Queue</a>
      </nav>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]" id="signals">
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="ck-section-label">Executive signal</div>
              <h2 className="text-lg font-semibold">Operating performance</h2>
            </div>
            <LineChart className="text-[var(--module-tint)]" size={20} />
          </div>
          <EChartsPanel option={chartOption("Operating performance", "area", primaryRows)} />
        </div>
        <div className="rounded-2xl border bg-white">
          <div className="border-b p-4">
            <div className="ck-section-label">KPI register</div>
          </div>
          <div className="divide-y">
            {signalKeys.map((key) => {
              const stat = statMap[key];
              return (
                <Link
                  className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 transition hover:bg-slate-50"
                  href={stat.href}
                  key={key}
                >
                  <span>
                    <span className="block text-sm font-semibold">{stat.label}</span>
                    <span className="text-xs text-slate-500">{stat.note}</span>
                  </span>
                  <span className="font-semibold">{valueLabel(stat)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5" aria-label="Three-dimensional operating signal visualization">
        <div className="mb-2 flex items-center justify-between"><div><div className="ck-section-label">Spatial comparison</div><h2 className="font-semibold">Operating scale</h2></div><span className="text-xs text-slate-500">Drag-free live view</span></div>
        <ThreeMetricScene metrics={primaryRows} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]" id="studio">
        {savedDashboards.map((dashboard) => {
          const widgetKeys = dashboard.config?.widgets?.length
            ? dashboard.config.widgets
            : (["cash", "pipeline", "outstanding"] satisfies StatKey[]);
          const rows = widgetKeys
            .map((key) => statMap[key])
            .filter(Boolean)
            .map((stat) => ({ name: stat.label, value: stat.value }));
          const style = dashboard.config?.chartStyle ?? "bar";
          return (
            <article className="rounded-2xl border bg-white p-5" key={dashboard.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="text-[var(--module-tint)]" size={18} />
                    <h2 className="font-semibold">{dashboard.name}</h2>
                    {dashboard.isDefault && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {style} chart - {dashboard.shared ? "shared" : "personal"} -{" "}
                    {dashboard.config?.dateRange ?? "30d"}
                  </p>
                </div>
                <Link className="text-xs font-semibold text-[#5b5fcf]" href={`${base}/reports`}>
                  Open report builder <ArrowRight className="inline" size={13} />
                </Link>
              </div>
              {style === "kpi" ? (
                <div className="mt-4 overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {rows.map((row) => (
                        <tr key={row.name}>
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(row.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EChartsPanel option={chartOption(dashboard.name, style, rows)} />
              )}
            </article>
          );
        })}
        {savedDashboards.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-8">
            <div className="ck-section-label">Studio</div>
            <h2 className="mt-2 text-lg font-semibold">No saved dashboards yet</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Create one dashboard to persist an ECharts visualization contract,
              selected metrics, comparison rules, and drill-through behavior.
            </p>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]" id="pipeline">
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="ck-section-label">Pipeline</div>
              <h2 className="font-semibold">Opportunity value</h2>
            </div>
            <Sparkles className="text-[var(--module-tint)]" size={19} />
          </div>
          <EChartsPanel option={chartOption("Pipeline", "bar", pipelineRows)} />
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">Work needing attention</h2>
            <CircleAlert size={18} />
          </div>
          <div className="divide-y">
            {data.tasks.map((task) => (
              <Link
                className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                href={`${base}/tasks`}
                key={task.id}
              >
                <span>
                  <span className="block font-medium">{task.title}</span>
                  <span className="text-xs text-slate-500">{task.priority}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No due date"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border bg-white" id="queue">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <div className="ck-section-label">Operating queue</div>
            <h2 className="mt-1 font-semibold">Exceptions requiring a decision</h2>
          </div>
          <span className="text-sm font-semibold">
            {data.attention.reduce((sum, item) => sum + item.count, 0)} open
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Exception</th>
                <th className="px-5 py-3">Count</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.attention.map((item) => (
                <tr key={item.key}>
                  <td className="px-5 py-4">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </td>
                  <td className="px-5 py-4 text-lg font-semibold">{item.count}</td>
                  <td className="px-5 py-4 capitalize">{item.severity}</td>
                  <td className="px-5 py-4">{item.module}</td>
                  <td className="px-5 py-4">
                    <Link className="font-semibold text-[#5b5fcf]" href={`${base}/${item.module}`}>
                      Open <ArrowRight className="inline" size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="font-semibold">Receivables</h2>
            <CircleDollarSign size={18} />
          </div>
          <div className="divide-y">
            {data.invoices.slice(0, 5).map((invoice) => (
              <Link
                className="grid grid-cols-[1fr_auto] gap-4 p-4 hover:bg-slate-50"
                href={`${base}/invoices/${invoice.id}`}
                key={invoice.id}
              >
                <span>
                  <span className="block text-sm font-medium">
                    {invoice.number} - {invoice.customer}
                  </span>
                  <span className="text-xs text-slate-500">
                    {invoice.status.replaceAll("_", " ")} - due{" "}
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                </span>
                <span className="font-semibold">{formatCurrency(invoice.balance)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="font-semibold">Exports</h2>
            <FileDown size={18} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link className="ck-button ck-button-secondary justify-center" href={`${base}/reports`}>
              <BarChart3 size={16} />
              Report center
            </Link>
            <Link className="ck-button ck-button-secondary justify-center" href={`${base}/accounting/reconciliation`}>
              <Landmark size={16} />
              Excel bridge
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
