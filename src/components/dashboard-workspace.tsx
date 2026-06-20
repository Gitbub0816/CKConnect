"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import {
  BarChart3,
  Eye,
  Gauge,
  Grid3X3,
  LineChart,
  ListTree,
  PieChart,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { saveDashboardStudio } from "@/app/app/[organizationSlug]/actions";
import { EChartsPanel } from "@/components/charts/echarts-panel";
import { ThreeMetricScene } from "@/components/charts/three-metric-scene";

type Metric = {
  key: string;
  label: string;
  value: number;
  note: string;
  href: string;
  format: "currency" | "number";
};

type Dashboard = {
  id: string;
  name: string;
  shared: boolean;
  isDefault: boolean;
  config: {
    widgets?: string[];
    chartStyle?: string;
    dateRange?: string;
    comparison?: string;
    refreshMinutes?: number;
    widgetSettings?: Record<string, { chartType?: string; title?: string }>;
  };
};

const visualizations = [
  ["kpi", "KPI", Grid3X3],
  ["line", "Line", LineChart],
  ["bar", "Bar", BarChart3],
  ["pie", "Pie", PieChart],
  ["gauge", "Gauge", Gauge],
  ["table", "Table", ListTree],
  ["three", "3D", Eye],
] as const;

function formatMetric(metric: Metric) {
  return metric.format === "currency"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(metric.value)
    : metric.value.toLocaleString();
}

function chartOption(metric: Metric, type: string): EChartsOption {
  const values = [0.64, 0.78, 0.71, 0.88, 0.82, 0.94].map((factor) =>
    Math.round(metric.value * factor),
  );
  if (type === "pie") {
    return {
      color: ["#6366f1", "#22c55e", "#f59e0b"],
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          label: { color: "#cbd5e1" },
          data: [
            { name: "Current", value: metric.value },
            { name: "Prior", value: Math.round(metric.value * 0.74) },
            { name: "Target gap", value: Math.round(metric.value * 0.18) },
          ],
        },
      ],
    };
  }
  if (type === "gauge") {
    return {
      series: [
        {
          type: "gauge",
          progress: { show: true, width: 12 },
          axisLine: { lineStyle: { width: 12 } },
          axisLabel: { color: "#64748b" },
          detail: { color: "#e2e8f0", fontSize: 18, formatter: "{value}%" },
          data: [{ value: 78, name: metric.label }],
        },
      ],
    };
  }
  return {
    color: ["#818cf8"],
    grid: { top: 18, right: 12, bottom: 28, left: 46 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: ["W1", "W2", "W3", "W4", "W5", "W6"],
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        type: type === "bar" ? "bar" : "line",
        smooth: true,
        areaStyle: type === "line" ? { opacity: 0.16 } : undefined,
        data: values,
      },
    ],
  };
}

export function DashboardWorkspace({
  dashboards,
  metrics,
  organizationName,
  organizationSlug,
}: {
  dashboards: Dashboard[];
  metrics: Metric[];
  organizationName: string;
  organizationSlug: string;
}) {
  const initial = dashboards[0];
  const [dashboardName, setDashboardName] = useState(
    initial?.name ?? `${organizationName} command center`,
  );
  const [widgetKeys, setWidgetKeys] = useState<string[]>(
    initial?.config.widgets?.length
      ? initial.config.widgets
      : metrics.slice(0, 6).map((metric) => metric.key),
  );
  const [widgetSettings, setWidgetSettings] = useState<
    Record<string, { chartType: string; title: string }>
  >(() =>
    Object.fromEntries(
      metrics.map((metric) => [
        metric.key,
        {
          chartType:
            initial?.config.widgetSettings?.[metric.key]?.chartType ??
            (metric.key === "cash" ? "three" : "kpi"),
          title:
            initial?.config.widgetSettings?.[metric.key]?.title ?? metric.label,
        },
      ]),
    ),
  );
  const [selectedKey, setSelectedKey] = useState(widgetKeys[0] ?? "");
  const [editing, setEditing] = useState(true);
  const selectedMetric = metrics.find((metric) => metric.key === selectedKey);
  const metricMap = useMemo(
    () => Object.fromEntries(metrics.map((metric) => [metric.key, metric])),
    [metrics],
  );

  function loadDashboard(id: string) {
    const dashboard = dashboards.find((item) => item.id === id);
    if (!dashboard) return;
    const nextKeys = dashboard.config.widgets ?? [];
    setDashboardName(dashboard.name);
    setWidgetKeys(nextKeys);
    setSelectedKey(nextKeys[0] ?? "");
    setWidgetSettings((current) => {
      const next = { ...current };
      for (const key of nextKeys) {
        next[key] = {
          chartType:
            dashboard.config.widgetSettings?.[key]?.chartType ??
            dashboard.config.chartStyle ??
            "kpi",
          title:
            dashboard.config.widgetSettings?.[key]?.title ??
            metricMap[key]?.label ??
            key,
        };
      }
      return next;
    });
  }

  function addWidget(key: string) {
    setWidgetKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setSelectedKey(key);
  }

  function removeWidget(key: string) {
    setWidgetKeys((current) => current.filter((item) => item !== key));
    if (selectedKey === key) {
      setSelectedKey(widgetKeys.find((item) => item !== key) ?? "");
    }
  }

  function updateSelected(
    changes: Partial<{ chartType: string; title: string }>,
  ) {
    if (!selectedKey) return;
    setWidgetSettings((current) => ({
      ...current,
      [selectedKey]: { ...current[selectedKey], ...changes },
    }));
  }

  return (
    <form
      action={saveDashboardStudio}
      className="flex h-[calc(100vh-3.75rem)] min-h-[720px] flex-col overflow-hidden bg-[#0f1117] text-slate-200"
    >
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="name" type="hidden" value={dashboardName} />
      <input name="chartStyle" type="hidden" value="kpi" />
      <input name="accent" type="hidden" value="slate" />
      <input name="density" type="hidden" value="balanced" />
      <input name="columns" type="hidden" value="4" />
      <input name="dateRange" type="hidden" value="30d" />
      <input name="comparison" type="hidden" value="prior_period" />
      <input name="refreshMinutes" type="hidden" value="15" />
      <input name="goalMetric" type="hidden" value="" />
      <input name="goalTarget" type="hidden" value="0" />
      <input name="widgetConfigJson" type="hidden" value={JSON.stringify(widgetSettings)} />
      <input name="shared" type="hidden" value="on" />
      <input name="showInsights" type="hidden" value="on" />
      {widgetKeys.map((key) => (
        <input key={key} name="widgets" type="hidden" value={key} />
      ))}

      <header className="flex min-h-14 items-center gap-3 border-b border-slate-800 bg-[#0a0d14] px-4">
        <select
          aria-label="Saved dashboard"
          className="h-9 border border-slate-700 bg-slate-900 px-3 text-sm"
          defaultValue={initial?.id ?? ""}
          onChange={(event) => loadDashboard(event.target.value)}
        >
          {!dashboards.length && <option value="">New dashboard</option>}
          {dashboards.map((dashboard) => (
            <option key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Dashboard name"
          className="h-9 min-w-64 border border-slate-700 bg-transparent px-3 text-sm font-semibold outline-none focus:border-indigo-500"
          onChange={(event) => setDashboardName(event.target.value)}
          value={dashboardName}
        />
        <span className="text-xs text-slate-500">{widgetKeys.length} widgets</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="h-9 border border-slate-700 px-3 text-sm hover:bg-slate-800" onClick={() => setEditing((value) => !value)} type="button">
            {editing ? "Preview" : "Edit"}
          </button>
          <button className="flex h-9 items-center gap-2 bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400" type="submit">
            <Save size={15} /> Save dashboard
          </button>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 ${editing ? "grid-cols-[240px_minmax(0,1fr)_300px]" : "grid-cols-1"}`}>
        {editing && (
          <aside className="min-h-0 overflow-y-auto border-r border-slate-800 bg-[#0a0d14]">
            <div className="border-b border-slate-800 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Data widgets</div>
              <p className="mt-1 text-xs text-slate-600">Click a metric to add it to the canvas.</p>
            </div>
            <div className="divide-y divide-slate-800">
              {metrics.map((metric) => (
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-900"
                  key={metric.key}
                  onClick={() => addWidget(metric.key)}
                  type="button"
                >
                  <Plus className="text-indigo-400" size={15} />
                  <span className="min-w-0"><strong className="block truncate text-sm">{metric.label}</strong><span className="block truncate text-xs text-slate-500">{metric.note}</span></span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <main className="min-h-0 overflow-y-auto bg-[#0f1117] p-5" style={{ backgroundImage: "radial-gradient(circle, #273044 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          <div className="grid auto-rows-[260px] grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {widgetKeys.map((key) => {
              const metric = metricMap[key];
              if (!metric) return null;
              const settings = widgetSettings[key] ?? { chartType: "kpi", title: metric.label };
              return (
                <section
                  className={`relative overflow-hidden border bg-[#151925] ${editing && selectedKey === key ? "border-indigo-400" : "border-slate-800"}`}
                  key={key}
                  onClick={() => editing && setSelectedKey(key)}
                >
                  <header className="flex h-11 items-center border-b border-slate-800 px-4">
                    <strong className="truncate text-sm">{settings.title}</strong>
                    <span className="ml-auto text-[10px] uppercase text-slate-500">{settings.chartType}</span>
                    {editing && <button aria-label="Remove widget" className="ml-2 p-1 text-slate-500 hover:text-red-400" onClick={(event) => { event.stopPropagation(); removeWidget(key); }} type="button"><Trash2 size={14} /></button>}
                  </header>
                  <div className="h-[calc(100%-2.75rem)] p-3">
                    {settings.chartType === "kpi" ? (
                      <Link className="flex h-full flex-col justify-center" href={metric.href}>
                        <div className="text-4xl font-semibold text-white">{formatMetric(metric)}</div>
                        <p className="mt-2 text-sm text-slate-400">{metric.note}</p>
                        <span className="mt-5 text-xs font-semibold text-indigo-400">Open source records</span>
                      </Link>
                    ) : settings.chartType === "table" ? (
                      <table className="w-full text-sm"><tbody className="divide-y divide-slate-800"><tr><td className="py-3 text-slate-400">Current</td><td className="py-3 text-right font-semibold">{formatMetric(metric)}</td></tr><tr><td className="py-3 text-slate-400">Prior period</td><td className="py-3 text-right">{Math.round(metric.value * 0.82).toLocaleString()}</td></tr><tr><td className="py-3 text-slate-400">Variance</td><td className="py-3 text-right text-emerald-400">+18%</td></tr></tbody></table>
                    ) : settings.chartType === "three" ? (
                      <ThreeMetricScene
                        height={190}
                        metrics={[
                          { name: "Current", value: metric.value },
                          { name: "Prior", value: metric.value * 0.72 },
                          { name: "Target", value: metric.value * 0.46 },
                        ]}
                      />
                    ) : (
                      <EChartsPanel
                        height={190}
                        option={chartOption(metric, settings.chartType)}
                      />
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {!widgetKeys.length && <div className="grid h-full place-items-center text-sm text-slate-500">Add a widget from the data palette.</div>}
        </main>

        {editing && (
          <aside className="min-h-0 overflow-y-auto border-l border-slate-800 bg-[#0a0d14]">
            <div className="flex items-center gap-2 border-b border-slate-800 p-4"><Settings2 size={15} /><strong className="text-sm">Widget settings</strong></div>
            {selectedMetric ? (
              <div className="space-y-5 p-4">
                <label className="block text-xs font-semibold uppercase text-slate-500">Title<input className="mt-2 h-10 w-full border border-slate-700 bg-slate-900 px-3 text-sm normal-case text-slate-200 outline-none focus:border-indigo-500" onChange={(event) => updateSelected({ title: event.target.value })} value={widgetSettings[selectedKey]?.title ?? selectedMetric.label} /></label>
                <div><div className="text-xs font-semibold uppercase text-slate-500">Visualization</div><div className="mt-2 grid grid-cols-2 border-l border-t border-slate-800">{visualizations.map(([value, label, Icon]) => <button className={`flex h-12 items-center gap-2 border-b border-r border-slate-800 px-3 text-sm hover:bg-slate-900 ${widgetSettings[selectedKey]?.chartType === value ? "bg-indigo-500/20 text-indigo-300" : ""}`} key={value} onClick={() => updateSelected({ chartType: value })} type="button"><Icon size={15} />{label}</button>)}</div></div>
                <dl className="divide-y divide-slate-800 border-y border-slate-800 text-sm"><div className="flex justify-between py-3"><dt className="text-slate-500">Data key</dt><dd className="font-mono text-xs">{selectedMetric.key}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-500">Current value</dt><dd>{formatMetric(selectedMetric)}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-500">Comparison</dt><dd>Prior period</dd></div></dl>
                <button className="flex h-10 w-full items-center justify-center gap-2 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10" onClick={() => removeWidget(selectedKey)} type="button"><Trash2 size={14} /> Remove widget</button>
              </div>
            ) : <div className="p-6 text-center text-sm text-slate-500">Select a widget on the canvas.</div>}
          </aside>
        )}
      </div>
    </form>
  );
}
