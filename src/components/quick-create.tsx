import { Plus, X } from "lucide-react";
import { createWorkspaceRecord } from "@/app/app/[organizationSlug]/actions";

const supported = new Set(["leads","accounts","contacts","deals","tasks","cases","campaigns","calendar","invoices","expenses","vendors","products"]);
const config: Record<string, { primary: string; secondary: string; secondaryPlaceholder: string; amount?: boolean; email?: boolean; date?: boolean; status?: string[] }> = {
  leads: { primary: "Lead name", secondary: "Company", secondaryPlaceholder: "Company", amount: true, email: true },
  accounts: { primary: "Account name", secondary: "Industry", secondaryPlaceholder: "Industry", status: ["PROSPECT","CUSTOMER","PARTNER","VENDOR"] },
  contacts: { primary: "Contact name", secondary: "Job title", secondaryPlaceholder: "Job title", email: true },
  deals: { primary: "Deal name", secondary: "Next step", secondaryPlaceholder: "Next step", amount: true, date: true },
  tasks: { primary: "Task title", secondary: "Description", secondaryPlaceholder: "What needs to happen?", date: true, status: ["NORMAL","HIGH","URGENT"] },
  cases: { primary: "Case subject", secondary: "Description", secondaryPlaceholder: "Describe the issue", status: ["NORMAL","HIGH","URGENT"] },
  campaigns: { primary: "Campaign name", secondary: "Campaign type", secondaryPlaceholder: "Email, event, referral…", amount: true, date: true, status: ["DRAFT","ACTIVE","PAUSED"] },
  calendar: { primary: "Event title", secondary: "Description", secondaryPlaceholder: "Agenda or notes", date: true, status: ["MEETING","APPOINTMENT","INTERNAL"] },
  invoices: { primary: "Line-item description", secondary: "Notes", secondaryPlaceholder: "Invoice notes", amount: true, date: true },
  expenses: { primary: "Expense description", secondary: "Category", secondaryPlaceholder: "Category", amount: true, date: true },
  vendors: { primary: "Vendor name", secondary: "Phone", secondaryPlaceholder: "Phone", email: true },
  products: { primary: "Offering name", secondary: "SKU", secondaryPlaceholder: "SKU", amount: true, status: ["SERVICE","PRODUCT","SUBSCRIPTION"] },
};

export function QuickCreate({ module, organizationSlug, label }: { module: string; organizationSlug: string; label: string }) {
  if (!supported.has(module)) return <button className="ck-button !min-h-11"><Plus size={15}/>{label}</button>;
  const fields = config[module];
  return (
    <details className="relative">
      <summary className="ck-button !min-h-11 list-none"><Plus size={15}/>{label}</summary>
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5">
        <form action={createWorkspaceRecord} className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-2xl">
          <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="module" type="hidden" value={module}/>
          <div className="flex items-start justify-between"><div><div className="ck-eyebrow">Create record</div><h2 className="mt-2 text-2xl font-semibold">{label}</h2></div><span className="grid size-8 place-items-center rounded border text-slate-500"><X size={15}/></span></div>
          <div className="mt-6 grid gap-4">
            <label className="text-xs font-semibold text-slate-600">{fields.primary}<input autoFocus className="ck-input mt-2" name="name" required/></label>
            <label className="text-xs font-semibold text-slate-600">{fields.secondary}<input className="ck-input mt-2" name="secondary" placeholder={fields.secondaryPlaceholder}/></label>
            {fields.email && <label className="text-xs font-semibold text-slate-600">Email<input className="ck-input mt-2" name="email" type="email"/></label>}
            {fields.amount && <label className="text-xs font-semibold text-slate-600">Amount<input className="ck-input mt-2" min="0" name="amount" step="0.01" type="number"/></label>}
            {fields.date && <label className="text-xs font-semibold text-slate-600">Date<input className="ck-input mt-2" name="date" type={module === "calendar" ? "datetime-local" : "date"}/></label>}
            {fields.status && <label className="text-xs font-semibold text-slate-600">Type / status<select className="ck-input mt-2" name="status">{fields.status.map((value) => <option key={value}>{value}</option>)}</select></label>}
          </div>
          <div className="mt-6 flex justify-end"><button className="ck-button !min-h-11" type="submit">Create {module.replace("-"," ")}</button></div>
        </form>
      </div>
    </details>
  );
}
