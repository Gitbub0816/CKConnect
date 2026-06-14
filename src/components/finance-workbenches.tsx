import { BadgeCheck, BookOpenCheck, CircleDollarSign, ReceiptText } from "lucide-react";
import { manageBill, postExpense, recordManualPayment } from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type Value = Record<string, unknown>;
type Data = { records?: Value[]; openInvoices?: Value[]; accounts?: Value[] };

function PaymentsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
    <form action={recordManualPayment} className="ck-card h-fit p-5">
      <div className="flex items-center gap-2 font-semibold"><CircleDollarSign className="text-[#9b7420]" size={18}/>Record and allocate payment</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Creates the payment, applies it to receivables, updates invoice status, and posts cash against A/R in one transaction.</p>
      <input name="organizationSlug" type="hidden" value={organizationSlug}/>
      <div className="mt-5 grid gap-4">
        <label className="text-xs font-semibold text-slate-600">Invoice<select className="ck-input mt-2" name="invoiceId" required><option value="">Choose an open invoice</option>{(data.openInvoices ?? []).map((invoice) => <option key={String(invoice.id)} value={String(invoice.id)}>{String(invoice.label)}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Amount<input className="ck-input mt-2" min="0.01" name="amount" step="0.01" type="number" required/></label><label className="text-xs font-semibold text-slate-600">Method<select className="ck-input mt-2" name="method"><option>ACH</option><option>CARD</option><option>CHECK</option><option>CASH</option><option>WIRE</option><option>OTHER</option></select></label></div>
        <label className="text-xs font-semibold text-slate-600">Reference<input className="ck-input mt-2" name="reference" placeholder="Check number or bank reference"/></label>
        <label className="text-xs font-semibold text-slate-600">Received date<input className="ck-input mt-2" name="receivedAt" type="date" required/></label>
        <button className="ck-button" type="submit"><BadgeCheck size={14}/>Record, allocate, and post</button>
      </div>
    </form>
    <section className="space-y-3">{(data.records ?? []).map((payment) => <article className="ck-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]" key={String(payment.id)}><div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">{String(payment.status)}</span><span className="text-xs text-slate-500">{String(payment.method ?? "Unknown method")}</span></div><h3 className="mt-3 font-semibold">{String(payment.reference ?? "No reference")}</h3><p className="mt-1 text-xs text-slate-500">Applied to {String(payment.invoices || "unallocated")} · {new Date(String(payment.receivedAt)).toLocaleDateString()}</p></div><div className="text-right"><div className="text-2xl font-semibold">{formatCurrency(Number(payment.amount))}</div><div className="mt-1 text-xs text-slate-500">{payment.posted ? "Posted to ledger" : "Not posted"}</div></div></article>)}</section>
  </div>;
}

function ExpensesWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-3">{(data.records ?? []).map((expense) => <article className="ck-card flex flex-wrap items-center justify-between gap-5 p-5" key={String(expense.id)}><div className="flex gap-4"><div className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-800"><ReceiptText size={18}/></div><div><div className="flex items-center gap-2"><strong>{String(expense.description)}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${expense.posted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{expense.posted ? "Posted" : "Needs posting"}</span></div><p className="mt-1 text-xs text-slate-500">{String(expense.vendor ?? "No vendor")} · {String(expense.category ?? "Uncategorized")} · {new Date(String(expense.incurredAt)).toLocaleDateString()}</p></div></div><div className="flex items-center gap-4"><strong className="text-xl">{formatCurrency(Number(expense.amount))}</strong>{!expense.posted && <form action={postExpense}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(expense.id)}/><button className="ck-button" type="submit"><BookOpenCheck size={14}/>Post expense</button></form>}</div></article>)}</div>;
}

function VendorsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-4">{(data.records ?? []).map((vendor) => <article className="ck-card overflow-hidden" key={String(vendor.id)}>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><strong>{String(vendor.name)}</strong><p className="mt-1 text-xs text-slate-500">{String(vendor.email ?? "No email")} · {vendor.eligible1099 ? "1099 eligible" : "Standard vendor"}</p></div><div className="text-right"><div className="text-xs text-slate-500">Open balance</div><div className="text-xl font-semibold">{formatCurrency(Number(vendor.balance))}</div></div></div>
    <div className="divide-y">{(vendor.bills as Value[]).map((bill) => <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={String(bill.id)}><div><div className="flex items-center gap-2"><strong>{String(bill.number ?? "Unnumbered bill")}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{String(bill.status)}</span>{Boolean(bill.posted) && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Posted</span>}</div><p className="mt-2 text-xs text-slate-500">Due {new Date(String(bill.dueDate)).toLocaleDateString()} · {formatCurrency(Number(bill.balance))} remaining</p></div><form action={manageBill}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(bill.id)}/>{!bill.posted ? <button className="ck-button" name="command" type="submit" value="POST">Post to A/P</button> : bill.status !== "PAID" ? <button className="ck-button" name="command" type="submit" value="PAY">Record payment</button> : <span className="text-sm font-semibold text-emerald-700">Paid</span>}</form></div>)}</div>
  </article>)}</div>;
}

function AccountingWorkbench({ data }: { data: Data }) {
  const accounts = data.accounts ?? [];
  const totalDebits = (data.records ?? []).reduce((sum, entry) => sum + Number(entry.debit ?? 0), 0);
  const totalCredits = (data.records ?? []).reduce((sum, entry) => sum + Number(entry.credit ?? 0), 0);
  return <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
    <section className="ck-card h-fit overflow-hidden"><div className="border-b p-5"><div className="ck-eyebrow">Trial balance</div><h3 className="mt-2 font-semibold">Chart of accounts</h3></div><div className="divide-y">{accounts.map((account) => <div className="flex items-center justify-between p-4 text-sm" key={String(account.code)}><div><strong>{String(account.code)} · {String(account.name)}</strong><div className="mt-1 text-xs text-slate-500">{String(account.type)}</div></div><span className="font-semibold">{formatCurrency(Number(account.balance))}</span></div>)}</div></section>
    <section className="space-y-4"><div className={`ck-card grid gap-4 p-5 sm:grid-cols-3 ${Math.abs(totalDebits - totalCredits) < 0.01 ? "border-emerald-200" : "border-red-300"}`}><div><div className="text-[10px] font-bold uppercase text-slate-500">Posted debits</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totalDebits)}</div></div><div><div className="text-[10px] font-bold uppercase text-slate-500">Posted credits</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totalCredits)}</div></div><div><div className="text-[10px] font-bold uppercase text-slate-500">Control difference</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totalDebits - totalCredits)}</div></div></div>{(data.records ?? []).map((entry) => <article className="ck-card flex flex-wrap items-center justify-between gap-4 p-5" key={String(entry.id)}><div><div className="flex items-center gap-2"><BookOpenCheck className="text-[#9b7420]" size={17}/><strong>{String(entry.number)}</strong><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{String(entry.status)}</span></div><h3 className="mt-3 font-semibold">{String(entry.description)}</h3><p className="mt-1 text-xs text-slate-500">{String(entry.source)} · {new Date(String(entry.date)).toLocaleDateString()}</p></div><div className="text-right text-sm"><div>Debit <strong>{formatCurrency(Number(entry.debit))}</strong></div><div className="mt-1">Credit <strong>{formatCurrency(Number(entry.credit))}</strong></div></div></article>)}</section>
  </div>;
}

export function FinanceWorkbench({ module, data, organizationSlug }: { module: string; data: Data; organizationSlug: string }) {
  if (module === "payments") return <PaymentsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "expenses") return <ExpensesWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "vendors") return <VendorsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "accounting") return <AccountingWorkbench data={data}/>;
  return null;
}
