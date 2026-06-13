import Link from "next/link";
import { ArrowRight, CalendarClock, CircleDollarSign, FileWarning, Landmark, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type DashboardData = NonNullable<Awaited<ReturnType<typeof import("@/lib/workspace-data").getWorkspaceDashboard>>>;

export function Dashboard({ data }: { data: DashboardData }) {
  const base = `/app/${data.organization.slug}`;
  const stats = [
    { label: "Cash position", value: data.stats.cash, note: "Connected and manual accounts", icon: Landmark },
    { label: "Open pipeline", value: data.stats.pipeline, note: `${data.openDeals.length} highest-value opportunities`, icon: Sparkles },
    { label: "Outstanding", value: data.stats.outstanding, note: `${data.invoices.filter((invoice) => invoice.balance > 0).length} invoices with balance`, icon: FileWarning },
    { label: "Collected", value: data.stats.collected, note: "Across current invoices", icon: CircleDollarSign },
  ];
  return (
    <div className="p-5 lg:p-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><div className="ck-eyebrow">{data.organization.name}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Business command center</h1><p className="mt-1 text-sm text-slate-500">Live operational, customer, and financial signals from one tenant record.</p></div>
        <Link className="ck-button !min-h-11" href={`${base}/invoices`}>Create invoice</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }, index) => <article className="ck-card relative overflow-hidden p-5" key={label}><div className="absolute inset-y-0 left-0 w-1 bg-[#c9a033]" style={{ opacity: .35 + index * .14 }} /><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</div><div className="mt-2 text-xs text-slate-500">{note}</div></div><Icon className="text-[#9b7420]" size={19} /></div></article>)}
      </div>
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
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="ck-card overflow-hidden"><div className="border-b p-5"><h2 className="font-semibold">Receivables</h2></div><div className="divide-y">{data.invoices.slice(0,5).map((invoice) => <div className="flex items-center justify-between p-4" key={invoice.id}><div><div className="text-sm font-medium">{invoice.number} · {invoice.customer}</div><div className="mt-1 text-xs text-slate-500">{invoice.status.replaceAll("_"," ")} · due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</div></div><div className="font-semibold">{formatCurrency(invoice.balance)}</div></div>)}</div></section>
        <section className="ck-card p-5"><h2 className="font-semibold">Payroll readiness</h2>{data.payroll ? <><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-[#f8f5ef] p-4"><div className="text-xs text-slate-500">Gross payroll</div><div className="mt-2 text-xl font-semibold">{formatCurrency(data.payroll.grossPay)}</div></div><div className="rounded-lg bg-[#f8f5ef] p-4"><div className="text-xs text-slate-500">Employer cost</div><div className="mt-2 text-xl font-semibold">{formatCurrency(data.payroll.employerCost)}</div></div></div><div className="mt-4 flex items-center justify-between text-sm"><span>Status: <strong>{data.payroll.status.replaceAll("_"," ")}</strong></span><Link className="font-semibold text-[#8b6914]" href={`${base}/payroll`}>Review payroll</Link></div></> : <p className="mt-4 text-sm text-slate-500">Connect Check or Finch to initialize payroll.</p>}</section>
      </div>
    </div>
  );
}
