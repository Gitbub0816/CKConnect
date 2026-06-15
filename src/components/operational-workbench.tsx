import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Mail,
  Play,
  ReceiptText,
  Sparkles,
  UserRoundCheck,
  Workflow,
} from "lucide-react";
import {
  addEntityNote,
  changeDealStage,
  completeTask,
  convertLead,
  resolveBankTransaction,
  runAutomation,
  sendInvoice,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type RecordValue = Record<string, unknown>;
type WorkbenchData = {
  records?: RecordValue[];
  accounts?: RecordValue[];
  openInvoices?: { id: string; label: string; balance: number }[];
  reconciliations?: RecordValue[];
};

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${styles[tone]}`}>{children}</span>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="ck-card p-10 text-center"><Sparkles className="mx-auto text-[#9b7420]" size={24}/><h3 className="mt-4 font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p></div>;
}

function LeadWorkbench({ records, organizationSlug }: { records: RecordValue[]; organizationSlug: string }) {
  const active = records.filter((record) => record.status !== "CONVERTED");
  if (!active.length) return <EmptyState title="Qualification queue is clear" body="New inquiries will appear here with scoring, source, and recommended action."/>;
  return <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
    <section className="space-y-3">
      {active.map((lead) => <article className="ck-card grid gap-5 p-5 lg:grid-cols-[1fr_220px]" key={String(lead.id)}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={Number(lead.score) >= 80 ? "danger" : "warning"}>{String(lead.priority)}</StatusPill>
            <span className="text-xs text-slate-500">{String(lead.source ?? "Unknown source")}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{String(lead.name)}</h3>
          <p className="mt-1 text-sm text-slate-500">{String(lead.company ?? "Individual prospect")} · {String(lead.email ?? lead.phone ?? "No contact method")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lead score</div><div className="mt-1 text-xl font-semibold">{Number(lead.score)}</div></div>
            <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Potential value</div><div className="mt-1 text-xl font-semibold">{formatCurrency(Number(lead.value))}</div></div>
            <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended</div><div className="mt-1 text-sm font-semibold">{String(lead.recommendation)}</div></div>
          </div>
        </div>
        <form action={convertLead} className="rounded-lg border bg-slate-50 p-4">
          <input name="organizationSlug" type="hidden" value={organizationSlug}/>
          <input name="entityId" type="hidden" value={String(lead.id)}/>
          <div className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheck className="text-[#9b7420]" size={17}/>Convert lead</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Creates or links the company and contact, transfers attribution, and records the conversion timeline.</p>
          <label className="mt-4 flex items-center gap-2 text-xs font-medium"><input defaultChecked name="createDeal" type="checkbox"/>Create an opportunity</label>
          <button className="ck-button mt-4 w-full" type="submit">Convert and continue <ArrowRight size={14}/></button>
        </form>
      </article>)}
    </section>
    <aside className="ck-card h-fit p-5">
      <div className="ck-eyebrow">Qualification policy</div>
      <h3 className="mt-3 text-xl font-semibold">From inquiry to owned revenue</h3>
      <ol className="mt-5 space-y-4 text-sm">
        {["Verify contact and company identity", "Confirm need, timing, and expected value", "Convert into linked account, contact, and opportunity", "Create a next step with an accountable owner"].map((step, index) => <li className="flex gap-3" key={step}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f0dfaa] text-xs font-bold">{index + 1}</span><span className="pt-0.5 text-slate-600">{step}</span></li>)}
      </ol>
    </aside>
  </div>;
}

const stages = ["PROSPECTING", "QUALIFICATION", "NEEDS_ANALYSIS", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"] as const;

function DealWorkbench({ records, organizationSlug }: { records: RecordValue[]; organizationSlug: string }) {
  return <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
    <section className="space-y-3">
      {records.map((deal) => <article className="ck-card p-5" key={String(deal.id)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusPill tone={deal.risk === "ON_TRACK" ? "success" : "danger"}>{String(deal.risk)}</StatusPill>
              <span className="text-xs text-slate-500">{String(deal.stage).replaceAll("_", " ")}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{String(deal.name)}</h3>
            <p className="mt-1 text-sm text-slate-500">{String(deal.account ?? "No account")} · {String(deal.contact ?? "No primary contact")}</p>
          </div>
          <div className="text-right"><div className="text-2xl font-semibold">{formatCurrency(Number(deal.amount))}</div><div className="mt-1 text-xs text-slate-500">{Number(deal.probability)}% weighted · {formatCurrency(Number(deal.amount) * Number(deal.probability) / 100)}</div></div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#c9a033]" style={{ width: `${Number(deal.probability)}%` }}/></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg bg-[#f8f5ef] p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current commitment</div><div className="mt-2 text-sm font-semibold">{String(deal.nextStep ?? "No next step is assigned")}</div><div className="mt-2 text-xs text-slate-500">{deal.daysToClose === null ? "No close date" : `${Number(deal.daysToClose)} days to expected close`}</div></div>
          <form action={changeDealStage} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <input name="organizationSlug" type="hidden" value={organizationSlug}/>
            <input name="entityId" type="hidden" value={String(deal.id)}/>
            <label className="text-xs font-semibold text-slate-600">Move to<select className="ck-input mt-2" defaultValue={String(deal.stage)} name="stage">{stages.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600">Required next step<input className="ck-input mt-2" defaultValue={String(deal.nextStep ?? "")} name="nextStep" placeholder="Owner commitment"/></label>
            <button className="ck-button" type="submit">Update</button>
          </form>
        </div>
      </article>)}
    </section>
    <aside className="ck-card h-fit overflow-hidden">
      <div className="border-b p-5"><div className="ck-eyebrow">Forecast discipline</div><h3 className="mt-2 font-semibold">Stage gates</h3></div>
      <div className="divide-y text-sm">{stages.slice(0, 6).map((stage, index) => <div className="flex items-center justify-between px-5 py-3" key={stage}><span>{stage.replaceAll("_", " ")}</span><strong>{[10,25,45,65,80,100][index]}%</strong></div>)}</div>
      <p className="border-t bg-amber-50 p-4 text-xs leading-5 text-amber-900">Closing a deal as won automatically creates a linked draft invoice so sales handoff becomes a finance workflow.</p>
    </aside>
  </div>;
}

function AccountWorkbench({ accounts, organizationSlug }: { accounts: RecordValue[]; organizationSlug: string }) {
  if (!accounts.length) return <EmptyState title="No customer records yet" body="Convert a qualified lead or create an account to establish a shared commercial record."/>;
  return <div className="space-y-4">{accounts.map((account) => {
    const contacts = account.contacts as RecordValue[];
    const deals = account.deals as RecordValue[];
    const invoices = account.invoices as RecordValue[];
    const cases = account.cases as RecordValue[];
    return <details className="ck-card group overflow-hidden" key={String(account.id)}>
      <summary className="grid cursor-pointer list-none gap-5 p-5 lg:grid-cols-[1.2fr_repeat(4,.6fr)] lg:items-center">
        <div><div className="flex items-center gap-2"><Building2 className="text-[#9b7420]" size={18}/><StatusPill tone={Number(account.health) >= 85 ? "success" : "warning"}>{Number(account.health)} health</StatusPill></div><h3 className="mt-3 text-lg font-semibold">{String(account.name)}</h3><p className="mt-1 text-xs text-slate-500">{String(account.type)} · {String(account.industry ?? "Uncategorized")}</p></div>
        <div><div className="text-[10px] font-bold uppercase text-slate-500">Lifetime value</div><div className="mt-1 font-semibold">{formatCurrency(Number(account.lifetimeValue))}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-slate-500">Open pipeline</div><div className="mt-1 font-semibold">{formatCurrency(Number(account.openPipeline))}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-slate-500">Receivable</div><div className="mt-1 font-semibold">{formatCurrency(Number(account.receivable))}</div></div>
        <div className="text-right text-xs font-semibold text-[#8b6914]">Open account 360 <ArrowRight className="inline transition group-open:rotate-90" size={14}/></div>
      </summary>
      <div className="grid gap-px border-t bg-slate-200 xl:grid-cols-4">
        {[
          ["Contacts", contacts, (item: RecordValue) => `${item.name} · ${item.title ?? item.email ?? "Contact"}`],
          ["Opportunities", deals, (item: RecordValue) => `${item.name} · ${formatCurrency(Number(item.amount))} · ${String(item.stage).replaceAll("_", " ")}`],
          ["Invoices", invoices, (item: RecordValue) => `${item.number} · ${formatCurrency(Number(item.balance))} due · ${item.status}`],
          ["Service cases", cases, (item: RecordValue) => `${item.number} · ${item.subject} · ${item.status}`],
        ].map(([title, items, render]) => <section className="bg-white p-5" key={String(title)}><h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{String(title)}</h4><div className="mt-4 space-y-3">{(items as RecordValue[]).slice(0, 5).map((item) => <div className="rounded-lg bg-[#f8f5ef] p-3 text-xs leading-5" key={String(item.id)}>{(render as (item: RecordValue) => string)(item)}</div>)}{!(items as RecordValue[]).length && <p className="text-xs text-slate-400">No related records.</p>}</div></section>)}
      </div>
      <form action={addEntityNote} className="grid gap-3 border-t bg-[#f8f5ef] p-5 md:grid-cols-[180px_1fr_auto] md:items-end">
        <input name="organizationSlug" type="hidden" value={organizationSlug}/>
        <input name="relatedType" type="hidden" value="CrmAccount"/>
        <input name="relatedId" type="hidden" value={String(account.id)}/>
        <label className="text-xs font-semibold text-slate-600">Note type<select className="ck-input mt-2" name="noteType"><option value="GENERAL">General</option><option value="CALL">Call</option><option value="MEETING">Meeting</option><option value="RISK">Risk</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Account note<input className="ck-input mt-2" name="body" placeholder="Add relationship context, next commitment, or risk note"/></label>
        <button className="ck-button" type="submit">Save note</button>
      </form>
    </details>;
  })}</div>;
}

function InvoiceWorkbench({ records, organizationSlug }: { records: RecordValue[]; organizationSlug: string }) {
  return <div className="space-y-4">{records.map((invoice) => {
    const items = invoice.items as RecordValue[];
    const actionable = !["PAID", "VOID"].includes(String(invoice.status));
    return <article className="ck-card overflow-hidden" key={String(invoice.id)}>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><StatusPill tone={invoice.collectionState === "OVERDUE" ? "danger" : invoice.collectionState === "SETTLED" ? "success" : "warning"}>{String(invoice.collectionState)}</StatusPill>{invoice.posted ? <StatusPill tone="success">Posted to ledger</StatusPill> : <StatusPill>Unposted</StatusPill>}</div>
          <h3 className="mt-3 text-lg font-semibold">{String(invoice.number)} · {String(invoice.customer ?? "Direct customer")}</h3>
          <p className="mt-1 text-sm text-slate-500">{String(invoice.contact ?? "No billing contact")} · due {invoice.dueDate ? new Date(String(invoice.dueDate)).toLocaleDateString() : "not set"}</p>
        </div>
        <div className="text-right"><div className="text-[10px] font-bold uppercase text-slate-500">Balance due</div><div className="mt-1 text-2xl font-semibold">{formatCurrency(Number(invoice.balance))}</div><div className="mt-1 text-xs text-slate-500">of {formatCurrency(Number(invoice.total))}</div></div>
      </div>
      <div className="grid gap-px border-t bg-slate-200 lg:grid-cols-[1fr_320px]">
        <div className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Line items</div><div className="mt-3 divide-y">{items.map((item, index) => <div className="flex justify-between py-3 text-sm" key={`${String(item.description)}-${index}`}><span>{String(item.description)} <span className="text-slate-400">× {Number(item.quantity)}</span></span><strong>{formatCurrency(Number(item.total))}</strong></div>)}</div></div>
        <div className="bg-[#f8f5ef] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><ReceiptText className="text-[#9b7420]" size={17}/>Collection controls</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{invoice.email ? `Billing contact: ${invoice.email}` : "Add a billing contact email before sending."}</p>
          {actionable && <form action={sendInvoice} className="mt-4"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(invoice.id)}/><button className="ck-button w-full" disabled={!invoice.email} type="submit"><Mail size={14}/>{invoice.status === "DRAFT" ? "Post and send invoice" : "Queue reminder"}</button></form>}
          {Boolean(invoice.publicTokenId) && <Link className="ck-button ck-button-secondary mt-2 w-full" href={`/pay/${String(invoice.publicTokenId)}`}>Open payment page <ArrowRight size={14}/></Link>}
        </div>
      </div>
    </article>;
  })}</div>;
}

function BankingWorkbench({ data, organizationSlug }: { data: WorkbenchData; organizationSlug: string }) {
  const accounts = data.records ?? [];
  const invoices = data.openInvoices ?? [];
  const transactions: RecordValue[] = accounts.flatMap((account) => (account.transactions as RecordValue[]).map((transaction) => ({ ...transaction, accountName: account.name })));
  return <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
    <aside className="space-y-3">{accounts.map((account) => <article className="ck-card p-5" key={String(account.id)}><div className="flex items-center justify-between"><CircleDollarSign className="text-[#9b7420]" size={19}/><StatusPill tone={account.status === "CONNECTED" ? "success" : "warning"}>{String(account.status)}</StatusPill></div><h3 className="mt-5 font-semibold">{String(account.name)}</h3><p className="mt-1 text-xs text-slate-500">{String(account.institution)} ···· {String(account.mask)}</p><div className="mt-5 text-2xl font-semibold">{formatCurrency(Number(account.bookBalance))}</div><div className="mt-1 text-xs text-slate-500">{formatCurrency(Number(account.availableBalance))} available</div></article>)}</aside>
    <section className="space-y-3">
      {transactions.map((transaction) => <article className="ck-card grid gap-4 p-5 lg:grid-cols-[1fr_360px]" key={String(transaction.id)}>
        <div><div className="flex items-center gap-2"><StatusPill tone={transaction.status === "MATCHED" ? "success" : "warning"}>{String(transaction.status)}</StatusPill><span className="text-xs text-slate-500">{String(transaction.accountName)}</span></div><h3 className="mt-3 font-semibold">{String(transaction.description)}</h3><div className="mt-2 flex gap-5 text-sm"><strong className={Number(transaction.amount) >= 0 ? "text-emerald-700" : "text-slate-900"}>{formatCurrency(Number(transaction.amount))}</strong><span className="text-slate-500">{transaction.date ? new Date(String(transaction.date)).toLocaleDateString() : ""}</span></div></div>
        {transaction.status !== "MATCHED" ? <form action={resolveBankTransaction} className="grid gap-3 rounded-lg border bg-slate-50 p-4">
          <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(transaction.id)}/>
          <label className="text-xs font-semibold text-slate-600">Resolve as<select className="ck-input mt-2" defaultValue={String(transaction.suggestedResolution)} name="resolution"><option value="EXPENSE">Expense and ledger posting</option><option value="PAYMENT">Customer payment</option></select></label>
          <label className="text-xs font-semibold text-slate-600">Apply payment to<select className="ck-input mt-2" defaultValue="" name="invoiceId"><option value="">Choose when resolving a payment</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Category<input className="ck-input mt-2" defaultValue={String(transaction.category ?? "Uncategorized")} name="category"/></label>
          <button className="ck-button" type="submit"><BadgeCheck size={14}/>Resolve and post</button>
        </form> : <div className="grid place-items-center rounded-lg bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-800"><BadgeCheck className="mb-2" size={20}/>Matched to {String(transaction.category ?? "accounting record")}</div>}
      </article>)}
    </section>
  </div>;
}

function AutomationWorkbench({ records, organizationSlug }: { records: RecordValue[]; organizationSlug: string }) {
  return <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
    <section className="space-y-4">{records.map((rule) => {
      const runs = rule.runs as RecordValue[];
      return <article className="ck-card overflow-hidden" key={String(rule.id)}>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
          <div><div className="flex items-center gap-2"><StatusPill tone={rule.active ? "success" : "neutral"}>{rule.active ? "Active" : "Paused"}</StatusPill><span className="text-xs text-slate-500">{String(rule.trigger).replaceAll("_", " ")}</span></div><h3 className="mt-3 text-lg font-semibold">{String(rule.name)}</h3><p className="mt-1 text-xs text-slate-500">Last execution: {rule.lastRunAt ? new Date(String(rule.lastRunAt)).toLocaleString() : "Never"}</p></div>
          <form action={runAutomation}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(rule.id)}/><button className="ck-button" type="submit"><Play size={14}/>Run now</button></form>
        </div>
        <div className="grid gap-px border-t bg-slate-200 lg:grid-cols-2">
          <section className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workflow definition</div><div className="mt-4 space-y-3 text-sm"><div className="flex gap-3"><Workflow className="shrink-0 text-[#9b7420]" size={17}/><div><strong>When</strong><p className="mt-1 text-xs text-slate-500">{String(rule.trigger).replaceAll("_", " ")}</p></div></div><div className="flex gap-3"><CircleAlert className="shrink-0 text-[#9b7420]" size={17}/><div><strong>If</strong><p className="mt-1 text-xs text-slate-500">{JSON.stringify(rule.conditions)}</p></div></div><div className="flex gap-3"><Mail className="shrink-0 text-[#9b7420]" size={17}/><div><strong>Then</strong><p className="mt-1 text-xs text-slate-500">{JSON.stringify(rule.actions)}</p></div></div></div></section>
          <section className="bg-[#f8f5ef] p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Execution history</div><div className="mt-3 space-y-2">{runs.map((run) => <div className="flex items-center justify-between rounded-lg bg-white p-3 text-xs" key={String(run.id)}><div><strong>{String(run.status)}</strong><div className="mt-1 text-slate-500">{run.startedAt ? new Date(String(run.startedAt)).toLocaleString() : ""}</div></div><StatusPill tone={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>{String(run.status)}</StatusPill></div>)}{!runs.length && <p className="text-xs text-slate-400">No executions yet.</p>}</div></section>
        </div>
      </article>;
    })}</section>
    <aside className="ck-card h-fit p-5"><Clock3 className="text-[#9b7420]" size={20}/><h3 className="mt-4 text-xl font-semibold">Automation that leaves evidence</h3><p className="mt-3 text-sm leading-6 text-slate-500">Every execution stores its trigger, action results, failures, timestamps, and audit event. Overdue invoice rules now update collection state and create outbound email jobs instead of displaying static configuration.</p></aside>
  </div>;
}

function TaskWorkbench({ records, organizationSlug }: { records: RecordValue[]; organizationSlug: string }) {
  const open = records.filter((task) => task.status !== "COMPLETED");
  const completed = records.filter((task) => task.status === "COMPLETED");
  return <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
    <section className="space-y-3">
      {open.map((task) => {
        const overdue = task.dueAt && new Date(String(task.dueAt)) < new Date();
        return <article className="ck-card flex flex-wrap items-center justify-between gap-5 p-5" key={String(task.id)}>
          <div className="flex gap-4"><div className={`grid size-11 shrink-0 place-items-center rounded-lg ${overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}><Clock3 size={18}/></div><div><div className="flex items-center gap-2"><StatusPill tone={overdue ? "danger" : "warning"}>{overdue ? "Overdue" : String(task.priority)}</StatusPill><span className="text-xs text-slate-500">{String(task.relatedType ?? "General")}</span></div><h3 className="mt-2 font-semibold">{String(task.title)}</h3><p className="mt-1 text-xs text-slate-500">{task.dueAt ? `Due ${new Date(String(task.dueAt)).toLocaleString()}` : "No due date"}</p></div></div>
          <form action={completeTask}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(task.id)}/><button className="ck-button" type="submit"><BadgeCheck size={14}/>Complete</button></form>
        </article>;
      })}
      {!open.length && <EmptyState title="Work queue is clear" body="New follow-ups, approvals, and automation-generated tasks will appear here."/>}
    </section>
    <aside className="ck-card h-fit p-5"><div className="ck-eyebrow">Throughput</div><div className="mt-3 text-3xl font-semibold">{completed.length}</div><p className="mt-1 text-sm text-slate-500">completed tasks in this workspace</p><div className="my-5 border-t"/><p className="text-xs leading-5 text-slate-500">Completing work writes a timestamped audit event and immediately updates the command center.</p></aside>
  </div>;
}

export function OperationalWorkbench({ module, data, organizationSlug }: { module: string; data: WorkbenchData; organizationSlug: string }) {
  if (module === "leads") return <LeadWorkbench organizationSlug={organizationSlug} records={data.records ?? []}/>;
  if (module === "deals") return <DealWorkbench organizationSlug={organizationSlug} records={data.records ?? []}/>;
  if (module === "accounts") return <AccountWorkbench accounts={data.accounts ?? []} organizationSlug={organizationSlug}/>;
  if (module === "invoices") return <InvoiceWorkbench organizationSlug={organizationSlug} records={data.records ?? []}/>;
  if (module === "banking") return <BankingWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "automations") return <AutomationWorkbench organizationSlug={organizationSlug} records={data.records ?? []}/>;
  if (module === "tasks") return <TaskWorkbench organizationSlug={organizationSlug} records={data.records ?? []}/>;
  return null;
}
