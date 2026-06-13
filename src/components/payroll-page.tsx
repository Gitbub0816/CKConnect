import {
  BadgeDollarSign,
  CalendarCheck,
  Clock3,
  FileCheck2,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const payrollSections = [
  ["Employees", Users],
  ["Time tracking", Clock3],
  ["Time off", CalendarCheck],
  ["Payroll runs", BadgeDollarSign],
  ["Pay history", FileCheck2],
  ["Tax documents", FileCheck2],
  ["Reports", BadgeDollarSign],
  ["Settings", Settings2],
] as const;

export function PayrollPage() {
  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">
            Native employee operations with provider-managed calculation, filing, and direct deposit.
          </p>
        </div>
        <button className="ck-button"><BadgeDollarSign size={15} />Run payroll</button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Next payroll", "Jun 19", "Biweekly"],
          ["Estimated gross", formatCurrency(48200), "24 employees"],
          ["Time awaiting approval", "18.5 hrs", "3 submissions"],
          ["Provider status", "Not connected", "Check or Finch"],
        ].map(([label, value, note]) => (
          <article className="ck-card p-5" key={label}>
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-2 text-xl font-semibold">{value}</div>
            <div className="mt-2 text-xs text-slate-500">{note}</div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <section className="ck-card overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Payroll workspace</h2>
            <p className="mt-1 text-xs text-slate-500">The interface remains consistent across payroll providers.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {payrollSections.map(([label, Icon]) => (
              <button className="flex min-h-28 flex-col items-start gap-3 border-b border-r p-5 text-left hover:bg-blue-50/50" key={label}>
                <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon size={17} /></span>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="ck-card p-5">
          <div className="flex items-center gap-2 font-semibold"><RefreshCw size={16} />Payroll provider</div>
          <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-5">
            <div className="text-sm font-semibold">Not connected</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Use ClearKey Payroll through Check, or connect an existing provider securely through Finch OAuth.
            </p>
            <button className="ck-button mt-4 w-full">Connect payroll</button>
            <button className="ck-button ck-button-secondary mt-2 w-full">Choose existing provider</button>
          </div>
          <div className="mt-5 text-xs leading-5 text-slate-500">
            ClearKey never requests payroll usernames, passwords, or MFA codes. Tax calculation, filing, remittance, and direct deposit remain with the selected provider.
          </div>
        </aside>
      </div>
    </div>
  );
}
