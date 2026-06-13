import { ArrowUpRight, CalendarClock, CircleDollarSign, FileWarning, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const stats = [
  { label: "Revenue", value: 84240, note: "+12.8% this month", icon: CircleDollarSign, color: "#1f6feb" },
  { label: "Net income", value: 31090, note: "+8.4% this month", icon: ArrowUpRight, color: "#12805c" },
  { label: "Outstanding", value: 12830, note: "4 invoices overdue", icon: FileWarning, color: "#b54708" },
  { label: "Pipeline", value: 126000, note: "18 active deals", icon: Users, color: "#7c3aed" },
];

export function Dashboard() {
  return (
    <div className="p-5 lg:p-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Friday, June 12</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Business overview</h1>
        </div>
        <button className="ck-button">Create invoice</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, color }) => (
          <article className="ck-card relative overflow-hidden p-5" key={label}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(value)}</div>
                <div className="mt-2 text-xs text-slate-500">{note}</div>
              </div>
              <div className="grid size-10 place-items-center rounded-xl" style={{ background: `${color}16`, color }}>
                <Icon size={18} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <article className="ck-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Revenue and expenses</h2>
              <p className="text-xs text-slate-500">Posted accounting activity</p>
            </div>
            <select className="ck-input !w-auto text-sm"><option>Last 6 months</option></select>
          </div>
          <div className="mt-8 flex h-56 items-end gap-4 border-b border-l px-4">
            {[41, 57, 49, 72, 66, 88].map((height, index) => (
              <div className="flex h-full flex-1 items-end justify-center gap-1" key={height}>
                <div className="w-[38%] rounded-t-md bg-blue-500" style={{ height: `${height}%` }} />
                <div className="w-[38%] rounded-t-md bg-teal-400" style={{ height: `${Math.max(24, height - 25 + index)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-5 text-xs text-slate-500">
            <span><i className="mr-2 inline-block size-2 rounded-sm bg-blue-500" />Revenue</span>
            <span><i className="mr-2 inline-block size-2 rounded-sm bg-teal-400" />Expenses</span>
          </div>
        </article>

        <article className="ck-card p-5">
          <h2 className="font-semibold">Today</h2>
          <p className="text-xs text-slate-500">Work needing attention</p>
          <div className="mt-5 space-y-3">
            {[
              ["Follow up with Harbor Dental", "10:30 AM", "Sales"],
              ["Review bank reconciliation", "1:00 PM", "Accounting"],
              ["Northstar kickoff call", "3:30 PM", "Meeting"],
              ["Approve invoice CK-1048", "Today", "Finance"],
            ].map(([title, time, type]) => (
              <div className="flex gap-3 rounded-xl border bg-slate-50 p-3" key={title}>
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm"><CalendarClock size={16} /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{time} · {type}</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
