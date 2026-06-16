import {
  BadgeCheck,
  BookOpenCheck,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileUp,
  FileSpreadsheet,
  GitCompareArrows,
  Landmark,
  Layers3,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  importAccountingSpreadsheet,
  manageAccountingPeriod,
  manageBill,
  postExpense,
  recordManualPayment,
  reverseJournalEntry,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type Value = Record<string, unknown>;
type Data = {
  records?: Value[];
  openInvoices?: Value[];
  accounts?: Value[];
  periods?: Value[];
  statements?: Value;
};

function PaymentsWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <form action={recordManualPayment} className="ck-card h-fit p-5">
        <div className="flex items-center gap-2 font-semibold">
          <CircleDollarSign className="text-[#9b7420]" size={18} />
          Record and allocate payment
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Creates the payment, applies it to receivables, updates invoice
          status, and posts cash against A/R in one transaction.
        </p>
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <div className="mt-5 grid gap-4">
          <label className="text-xs font-semibold text-slate-600">
            Invoice
            <select className="ck-input mt-2" name="invoiceId" required>
              <option value="">Choose an open invoice</option>
              {(data.openInvoices ?? []).map((invoice) => (
                <option key={String(invoice.id)} value={String(invoice.id)}>
                  {String(invoice.label)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Amount
              <input
                className="ck-input mt-2"
                min="0.01"
                name="amount"
                step="0.01"
                type="number"
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Method
              <select className="ck-input mt-2" name="method">
                <option>ACH</option>
                <option>CARD</option>
                <option>CHECK</option>
                <option>CASH</option>
                <option>WIRE</option>
                <option>OTHER</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Reference
            <input
              className="ck-input mt-2"
              name="reference"
              placeholder="Check number or bank reference"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Received date
            <input
              className="ck-input mt-2"
              name="receivedAt"
              type="date"
              required
            />
          </label>
          <button className="ck-button" type="submit">
            <BadgeCheck size={14} />
            Record, allocate, and post
          </button>
        </div>
      </form>
      <section className="space-y-3">
        {(data.records ?? []).map((payment) => (
          <article
            className="ck-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]"
            key={String(payment.id)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                  {String(payment.status)}
                </span>
                <span className="text-xs text-slate-500">
                  {String(payment.method ?? "Unknown method")}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">
                {String(payment.reference ?? "No reference")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Applied to {String(payment.invoices || "unallocated")} on{" "}
                {new Date(String(payment.receivedAt)).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">
                {formatCurrency(Number(payment.amount))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {payment.posted ? "Posted to ledger" : "Not posted"}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ExpensesWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-3">
      {(data.records ?? []).map((expense) => (
        <article
          className="ck-card flex flex-wrap items-center justify-between gap-5 p-5"
          key={String(expense.id)}
        >
          <div className="flex gap-4">
            <div className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-800">
              <ReceiptText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong>{String(expense.description)}</strong>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${expense.posted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                >
                  {expense.posted ? "Posted" : "Needs posting"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {String(expense.vendor ?? "No vendor")} -{" "}
                {String(expense.category ?? "Uncategorized")} -{" "}
                {new Date(String(expense.incurredAt)).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <strong className="text-xl">
              {formatCurrency(Number(expense.amount))}
            </strong>
            {!expense.posted && (
              <form action={postExpense}>
                <input
                  name="organizationSlug"
                  type="hidden"
                  value={organizationSlug}
                />
                <input name="entityId" type="hidden" value={String(expense.id)} />
                <button className="ck-button" type="submit">
                  <BookOpenCheck size={14} />
                  Post expense
                </button>
              </form>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function VendorsWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-4">
      {(data.records ?? []).map((vendor) => (
        <article className="ck-card overflow-hidden" key={String(vendor.id)}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div>
              <strong>{String(vendor.name)}</strong>
              <p className="mt-1 text-xs text-slate-500">
                {String(vendor.email ?? "No email")} -{" "}
                {vendor.eligible1099 ? "1099 eligible" : "Standard vendor"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Open balance</div>
              <div className="text-xl font-semibold">
                {formatCurrency(Number(vendor.balance))}
              </div>
            </div>
          </div>
          <div className="divide-y">
            {(vendor.bills as Value[]).map((bill) => (
              <div
                className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
                key={String(bill.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong>{String(bill.number ?? "Unnumbered bill")}</strong>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">
                      {String(bill.status)}
                    </span>
                    {Boolean(bill.posted) && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Posted
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Due {new Date(String(bill.dueDate)).toLocaleDateString()} -{" "}
                    {formatCurrency(Number(bill.balance))} remaining
                  </p>
                </div>
                <form action={manageBill}>
                  <input
                    name="organizationSlug"
                    type="hidden"
                    value={organizationSlug}
                  />
                  <input name="entityId" type="hidden" value={String(bill.id)} />
                  {!bill.posted ? (
                    <button
                      className="ck-button"
                      name="command"
                      type="submit"
                      value="POST"
                    >
                      Post to A/P
                    </button>
                  ) : bill.status !== "PAID" ? (
                    <button
                      className="ck-button"
                      name="command"
                      type="submit"
                      value="PAY"
                    >
                      Record payment
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-700">
                      Paid
                    </span>
                  )}
                </form>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function AccountingWorkbench({
  data,
  organizationSlug,
}: {
  data: Data;
  organizationSlug: string;
}) {
  const accounts = data.accounts ?? [];
  const periods = data.periods ?? [];
  const statements = data.statements ?? {};
  const entries = data.records ?? [];
  const totalDebits = (data.records ?? []).reduce(
    (sum, entry) => sum + Number(entry.debit ?? 0),
    0,
  );
  const totalCredits = (data.records ?? []).reduce(
    (sum, entry) => sum + Number(entry.credit ?? 0),
    0,
  );

  const activePeriod = periods.find((period) => period.status === "OPEN");
  const base = `/app/${organizationSlug}`;
  const exportBase = `/api/accounting/export?organizationSlug=${encodeURIComponent(organizationSlug)}`;
  const ribbonActions = [
    ["Ledger", "#ledger", BookOpenCheck],
    ["Trial balance", "#trial-balance", GitCompareArrows],
    ["Close", "#periods", LockKeyhole],
    ["Statements", "#statements", FileSpreadsheet],
    ["Excel bridge", "#excel-bridge", FileUp],
    ["Bank rec", `${base}/banking`, Landmark],
    ["A/R", `${base}/invoices`, CircleDollarSign],
    ["A/P", `${base}/vendors`, ReceiptText],
    ["Payments", `${base}/payments`, BadgeCheck],
    ["Expenses", `${base}/expenses`, ReceiptText],
    ["Audit", `${base}/audit`, ShieldCheck],
    ["Documents", `${base}/documents`, Download],
  ] as const;
  const exportReports = [
    ["Full accounting workbook", `${exportBase}&report=workbook&format=xlsx`, "XLSX"],
    ["Raw ledger detail", `${exportBase}&report=ledger&format=csv`, "CSV"],
    ["Trial balance", `${exportBase}&report=trial-balance&format=xlsx`, "XLSX"],
    ["Financial statements", `${exportBase}&report=statements&format=xlsx`, "XLSX"],
    ["Invoices and line items", `${exportBase}&report=invoices&format=xlsx`, "XLSX"],
    ["Payment register", `${exportBase}&report=payments&format=xlsx`, "XLSX"],
    ["Expense register", `${exportBase}&report=expenses&format=xlsx`, "XLSX"],
    ["Vendor balances", `${exportBase}&report=vendors&format=xlsx`, "XLSX"],
    ["Inventory and services", `${exportBase}&report=products&format=xlsx`, "XLSX"],
    ["Migration import template", `${exportBase}&report=import-template&format=xlsx`, "XLSX"],
  ] as const;

  return (
    <div className="space-y-4">
      <section className="ck-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {ribbonActions.map(([label, href, Icon]) => (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d8cbb8] bg-white px-3 text-xs font-semibold transition hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
              href={href}
              key={label}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-3 grid gap-3 border-t pt-3 text-xs text-slate-600 md:grid-cols-4">
          <div>
            <span className="font-semibold text-slate-900">Current period</span>
            <div>{String(activePeriod?.name ?? "No open period")}</div>
          </div>
          <div>
            <span className="font-semibold text-slate-900">Posting status</span>
            <div>
              {Math.abs(totalDebits - totalCredits) < 0.01
                ? "Balanced ledger"
                : "Control difference detected"}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-900">Review queue</span>
            <div>{entries.length} posted entries available</div>
          </div>
          <div>
            <span className="font-semibold text-slate-900">Close package</span>
            <div>Statements, audit trail, and exports linked above</div>
          </div>
        </div>
      </section>

      <section className="ck-card overflow-hidden" id="excel-bridge">
        <div className="grid gap-5 border-b p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="text-[#9b7420]" size={18} />
              Excel and CSV accounting bridge
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Move data both directions for migrations, accountant review,
              inventory updates, monthly close packs, and offline finance work.
              Clean imports update the books immediately; exceptions create a
              review task so Kira or a human can map unclear rows.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="ck-button"
                href={`${exportBase}&report=workbook&format=xlsx`}
              >
                <Download size={14} />
                Export close workbook
              </a>
              <a
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8cbb8] bg-white px-4 text-sm font-semibold transition hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
                href={`${exportBase}&report=import-template&format=xlsx`}
              >
                <FileSpreadsheet size={14} />
                Download import template
              </a>
            </div>
          </div>
          <form
            action={importAccountingSpreadsheet}
            className="rounded-2xl border border-[#e2d6c4] bg-[#fbf8f1] p-4"
          >
            <input name="organizationSlug" type="hidden" value={organizationSlug} />
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Import spreadsheet
              <input
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="ck-input mt-2 bg-white"
                name="file"
                required
                type="file"
              />
            </label>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <span>Charts, journals, invoices</span>
              <span>Payments, expenses, vendors</span>
              <span>Products, inventory, services</span>
              <span>CSV raw ledger imports</span>
            </div>
            <button className="ck-button mt-4 w-full justify-center" type="submit">
              <FileUp size={14} />
              Import and reconcile
            </button>
          </form>
        </div>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-5">
          {exportReports.map(([label, href, format]) => (
            <a
              className="group flex min-h-24 flex-col justify-between border-b border-r border-[#eadfce] p-4 transition hover:bg-[#fbf7ed]"
              href={href}
              key={label}
            >
              <span className="text-sm font-semibold text-slate-950">
                {label}
              </span>
              <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-[#e2d6c4] group-hover:text-[#8a6415]">
                <Download size={12} />
                {format}
              </span>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="ck-card h-fit overflow-hidden" id="trial-balance">
        <div className="border-b p-5">
          <div className="ck-eyebrow">Trial balance</div>
          <h3 className="mt-2 font-semibold">Chart of accounts</h3>
        </div>
        <div className="divide-y">
          {accounts.map((account) => (
            <div
              className="flex items-center justify-between p-4 text-sm"
              key={String(account.code)}
            >
              <div>
                <strong>
                  {String(account.code)} - {String(account.name)}
                </strong>
                <div className="mt-1 text-xs text-slate-500">
                  {String(account.type)}
                </div>
              </div>
              <span className="font-semibold">
                {formatCurrency(Number(account.balance))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div
          className={`ck-card grid gap-4 p-5 sm:grid-cols-3 ${Math.abs(totalDebits - totalCredits) < 0.01 ? "border-emerald-200" : "border-red-300"}`}
        >
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Posted debits
            </div>
            <div className="mt-2 text-xl font-semibold">
              {formatCurrency(totalDebits)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Posted credits
            </div>
            <div className="mt-2 text-xl font-semibold">
              {formatCurrency(totalCredits)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Control difference
            </div>
            <div className="mt-2 text-xl font-semibold">
              {formatCurrency(totalDebits - totalCredits)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="ck-card p-5" id="statements">
            <div className="flex items-center gap-2 font-semibold">
              <CircleDollarSign className="text-[#9b7420]" size={17} />
              Statement snapshot
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Assets", statements.assets],
                ["Liabilities", statements.liabilities],
                ["Equity", statements.equity],
                ["Income", statements.income],
                ["Expenses", statements.expenses],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-[#f8f5ef] p-3" key={String(label)}>
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    {String(label)}
                  </div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(Number(value ?? 0))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ck-card p-5" id="periods">
            <div className="flex items-center gap-2 font-semibold">
              <LockKeyhole className="text-[#9b7420]" size={17} />
              Accounting periods
            </div>
            <form action={manageAccountingPeriod} className="mt-4 grid gap-3">
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="command" type="hidden" value="CREATE" />
              <input className="ck-input" name="name" placeholder="June 2026" />
              <div className="grid grid-cols-2 gap-2">
                <input className="ck-input" name="startsOn" type="date" />
                <input className="ck-input" name="endsOn" type="date" />
              </div>
              <button className="ck-button" type="submit">
                Create period
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {periods.slice(0, 4).map((period) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f5ef] p-3 text-xs"
                  key={String(period.id)}
                >
                  <div>
                    <strong>{String(period.name)}</strong>
                    <div className="mt-1 text-slate-500">
                      {String(period.status)}
                    </div>
                  </div>
                  <form action={manageAccountingPeriod}>
                    <input
                      name="organizationSlug"
                      type="hidden"
                      value={organizationSlug}
                    />
                    <input
                      name="entityId"
                      type="hidden"
                      value={String(period.id)}
                    />
                    <button
                      className="ck-button ck-button-secondary !min-h-9"
                      name="command"
                      type="submit"
                      value={period.status === "LOCKED" ? "UNLOCK" : "LOCK"}
                    >
                      {period.status === "LOCKED" ? "Unlock" : "Lock"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="ck-card overflow-hidden" id="ledger">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Layers3 className="text-[#9b7420]" size={17} />
                General ledger
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Posted entries can be inspected, reversed with a reason, and
                traced through audit records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="ck-button ck-button-secondary !min-h-9"
                href={`${base}/audit`}
              >
                <ShieldCheck size={13} />
                Audit trail
              </Link>
              <Link
                className="ck-button ck-button-secondary !min-h-9"
                href={`${base}/reports`}
              >
                <ClipboardCheck size={13} />
                Reports
              </Link>
            </div>
          </div>
        {entries.map((entry) => {
          const lines = Array.isArray(entry.lines) ? (entry.lines as Value[]) : [];
          return (
          <article
            className="grid gap-4 border-b p-5 last:border-b-0 lg:grid-cols-[1fr_auto]"
            key={String(entry.id)}
          >
            <div>
              <div className="flex items-center gap-2">
                <BookOpenCheck className="text-[#9b7420]" size={17} />
                <strong>{String(entry.number)}</strong>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                  {String(entry.status)}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">
                {String(entry.description)}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {String(entry.source)} -{" "}
                {new Date(String(entry.date)).toLocaleDateString()}
              </p>
              <details className="mt-4 rounded-lg border bg-[#fbfaf7]">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                  Journal lines ({lines.length || 2})
                </summary>
                <div className="overflow-x-auto border-t">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#f3eee4] text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Account</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2">Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lines.length
                        ? lines
                        : [
                            {
                              account: "1100 - Accounts Receivable",
                              debit: entry.debit,
                              credit: 0,
                              memo: entry.description,
                            },
                            {
                              account: "4000 - Service Revenue",
                              debit: 0,
                              credit: entry.credit,
                              memo: entry.description,
                            },
                          ]
                      ).map((line, index) => (
                        <tr className="border-t" key={index}>
                          <td className="px-3 py-2">
                            {String(line.account ?? line.accountName ?? "Account")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(Number(line.debit ?? 0))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(Number(line.credit ?? 0))}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {String(line.memo ?? "Posted line")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
            <div className="text-right text-sm">
              <div>
                Debit <strong>{formatCurrency(Number(entry.debit))}</strong>
              </div>
              <div className="mt-1">
                Credit <strong>{formatCurrency(Number(entry.credit))}</strong>
              </div>
              {entry.status === "POSTED" && !entry.reversalOfId && (
                <form action={reverseJournalEntry} className="mt-3 flex gap-2">
                  <input
                    name="organizationSlug"
                    type="hidden"
                    value={organizationSlug}
                  />
                  <input
                    name="entityId"
                    type="hidden"
                    value={String(entry.id)}
                  />
                  <input
                    className="ck-input !min-h-9"
                    name="reason"
                    placeholder="Reversal reason"
                    required
                  />
                  <button
                    className="ck-button ck-button-secondary !min-h-9"
                    type="submit"
                  >
                    <RotateCcw size={13} />
                    Reverse
                  </button>
                </form>
              )}
            </div>
          </article>
        )})}
        </section>
      </section>
      </div>
    </div>
  );
}

export function FinanceWorkbench({
  module,
  data,
  organizationSlug,
}: {
  module: string;
  data: Data;
  organizationSlug: string;
}) {
  if (module === "payments")
    return <PaymentsWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "expenses")
    return <ExpensesWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "vendors")
    return <VendorsWorkbench data={data} organizationSlug={organizationSlug} />;
  if (module === "accounting")
    return (
      <AccountingWorkbench data={data} organizationSlug={organizationSlug} />
    );
  return null;
}
