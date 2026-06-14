import { BadgeCheck, CalendarClock, CirclePause, Mail, Megaphone, Send, ShieldCheck, TimerReset, UserCheck } from "lucide-react";
import {
  advancePayrollRun,
  approveTimeEntry,
  composeEmail,
  executeCampaign,
  reviewTimeOff,
  updateCalendarCommitment,
  updateCaseWorkflow,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type Value = Record<string, unknown>;
type Data = {
  records?: Value[];
  contacts?: Value[];
  connection?: Value | null;
  runs?: Value[];
  time?: Value[];
  timeOff?: Value[];
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[tone]}`}>{children}</span>;
}

function CaseWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-4">{(data.records ?? []).map((item) => <article className="ck-card grid gap-5 p-5 xl:grid-cols-[1fr_420px]" key={String(item.id)}>
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={["URGENT", "HIGH"].includes(String(item.priority)) ? "danger" : "warning"}>{String(item.priority)}</Pill>
        <Pill tone={item.status === "CLOSED" ? "success" : "neutral"}>{String(item.status)}</Pill>
        <span className="text-xs text-slate-500">{String(item.number)}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{String(item.subject)}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{String(item.description ?? "No issue description was provided.")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Customer</div><div className="mt-1 text-sm font-semibold">{String(item.customer ?? "Unlinked")}</div></div>
        <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Contact</div><div className="mt-1 text-sm font-semibold">{String(item.contact ?? "Unlinked")}</div></div>
        <div className="rounded-lg bg-[#f8f5ef] p-3"><div className="text-[10px] font-bold uppercase text-slate-500">Age</div><div className="mt-1 text-sm font-semibold">{Number(item.ageHours)} hours</div></div>
      </div>
    </div>
    <form action={updateCaseWorkflow} className="rounded-lg border bg-slate-50 p-4">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(item.id)}/>
      <label className="text-xs font-semibold text-slate-600">Next case state<select className="ck-input mt-2" defaultValue={String(item.status)} name="status">{["NEW","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"].map((status) => <option key={status}>{status}</option>)}</select></label>
      <label className="mt-3 block text-xs font-semibold text-slate-600">Resolution or customer-facing update<textarea className="ck-input mt-2 min-h-24 py-3" defaultValue={String(item.resolution ?? "")} name="resolution" placeholder="Required to resolve or close the case."/></label>
      <button className="ck-button mt-3 w-full" type="submit"><BadgeCheck size={14}/>Update case workflow</button>
    </form>
  </article>)}</div>;
}

function CampaignWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-4">{(data.records ?? []).map((campaign) => <article className="ck-card overflow-hidden" key={String(campaign.id)}>
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_repeat(3,130px)]">
      <div><div className="flex items-center gap-2"><Megaphone className="text-[#9b7420]" size={18}/><Pill tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{String(campaign.status)}</Pill></div><h3 className="mt-3 text-lg font-semibold">{String(campaign.name)}</h3><p className="mt-1 text-sm text-slate-500">{String(campaign.type)} campaign · {String(campaign.audience)}</p></div>
      <div><div className="text-[10px] font-bold uppercase text-slate-500">Audience</div><div className="mt-2 text-xl font-semibold">{Number(campaign.members).toLocaleString()}</div></div>
      <div><div className="text-[10px] font-bold uppercase text-slate-500">Response rate</div><div className="mt-2 text-xl font-semibold">{Number(campaign.responseRate).toFixed(1)}%</div></div>
      <div><div className="text-[10px] font-bold uppercase text-slate-500">Conversion rate</div><div className="mt-2 text-xl font-semibold">{Number(campaign.conversionRate).toFixed(1)}%</div></div>
    </div>
    <form action={executeCampaign} className="grid gap-3 border-t bg-[#f8f5ef] p-5 lg:grid-cols-[180px_1fr_1.4fr_auto] lg:items-end">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(campaign.id)}/>
      <label className="text-xs font-semibold text-slate-600">Audience<select className="ck-input mt-2" name="audience"><option value="ALL_CONTACTS">All emailable contacts</option><option value="CUSTOMERS">Customers</option><option value="PROSPECTS">Prospects</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Subject<input className="ck-input mt-2" name="subject" placeholder="Campaign subject"/></label>
      <label className="text-xs font-semibold text-slate-600">Message<input className="ck-input mt-2" name="body" placeholder="Campaign message"/></label>
      <div className="flex gap-2"><button className="ck-button" name="command" type="submit" value="LAUNCH"><Send size={14}/>Launch</button><button className="ck-button ck-button-secondary" name="command" type="submit" value={campaign.status === "ACTIVE" ? "PAUSE" : "COMPLETE"}><CirclePause size={14}/>{campaign.status === "ACTIVE" ? "Pause" : "Complete"}</button></div>
    </form>
  </article>)}</div>;
}

function CalendarWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-3">{(data.records ?? []).map((event) => <article className="ck-card grid gap-5 p-5 xl:grid-cols-[1fr_520px]" key={String(event.id)}>
    <div><div className="flex items-center gap-2"><CalendarClock className="text-[#9b7420]" size={18}/><Pill tone={event.status === "COMPLETED" ? "success" : event.status === "CANCELED" ? "danger" : "warning"}>{String(event.status)}</Pill></div><h3 className="mt-3 text-lg font-semibold">{String(event.title)}</h3><p className="mt-1 text-sm text-slate-500">{new Date(String(event.startsAt)).toLocaleDateString()} · {String(event.timeRange)} · {String(event.location ?? "No location")}</p><p className="mt-3 text-xs text-slate-500">{Number(event.attendees)} attendee(s) · {String(event.type)}</p></div>
    <form action={updateCalendarCommitment} className="grid gap-3 rounded-lg border bg-slate-50 p-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(event.id)}/>
      <label className="text-xs font-semibold text-slate-600">Follow-up commitment<input className="ck-input mt-2" name="followUp" placeholder="Send recap and proposal"/></label>
      <label className="text-xs font-semibold text-slate-600">Due<input className="ck-input mt-2" name="dueAt" type="date"/></label>
      <div className="flex gap-2"><button className="ck-button" name="command" type="submit" value="CREATE_FOLLOW_UP"><TimerReset size={14}/>Create task</button><button className="ck-button ck-button-secondary" name="command" type="submit" value="COMPLETE">Complete</button><button className="ck-button ck-button-secondary" name="command" type="submit" value="CANCEL">Cancel</button></div>
    </form>
  </article>)}</div>;
}

function EmailWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
    <form action={composeEmail} className="ck-card h-fit p-5">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/>
      <div className="flex items-center gap-2 font-semibold"><Mail className="text-[#9b7420]" size={18}/>Compose operational email</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Messages are tenant-scoped, auditable, and queued for MailerSend when configured.</p>
      <div className="mt-5 grid gap-4">
        <label className="text-xs font-semibold text-slate-600">Recipient<select className="ck-input mt-2" name="recipientEmail" required><option value="">Choose a contact</option>{(data.contacts ?? []).map((contact) => <option key={String(contact.id)} value={String(contact.email)}>{String(contact.name)} · {String(contact.email)}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Recipient name<input className="ck-input mt-2" name="recipientName"/></label>
        <label className="text-xs font-semibold text-slate-600">Subject<input className="ck-input mt-2" name="subject" required/></label>
        <label className="text-xs font-semibold text-slate-600">Message<textarea className="ck-input mt-2 min-h-36 py-3" name="body" required/></label>
        <button className="ck-button" type="submit"><Send size={14}/>Queue message</button>
      </div>
    </form>
    <section className="space-y-3">{(data.records ?? []).map((message) => <article className="ck-card flex flex-wrap items-center justify-between gap-4 p-5" key={String(message.id)}><div><div className="flex items-center gap-2"><Pill tone={message.status === "DELIVERED" ? "success" : message.status === "FAILED" ? "danger" : "warning"}>{String(message.status)}</Pill><span className="text-xs text-slate-500">{String(message.email)}</span></div><h3 className="mt-3 font-semibold">{String(message.subject)}</h3><p className="mt-1 text-xs text-slate-500">To {String(message.recipient)} · {message.sentAt ? new Date(String(message.sentAt)).toLocaleString() : "Not sent yet"}</p></div>{Boolean(message.relatedType) && <span className="rounded-lg bg-[#f8f5ef] px-3 py-2 text-xs font-semibold">{String(message.relatedType)}</span>}</article>)}</section>
  </div>;
}

function PayrollWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const connection = data.connection;
  return <div className="space-y-4">
    <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-3">{(data.runs ?? []).map((run) => <article className="ck-card grid gap-5 p-5 lg:grid-cols-[1fr_auto]" key={String(run.id)}><div><div className="flex items-center gap-2"><ShieldCheck className="text-[#9b7420]" size={18}/><Pill tone={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>{String(run.status)}</Pill></div><h3 className="mt-3 text-lg font-semibold">{String(run.period)}</h3><p className="mt-1 text-sm text-slate-500">Check date {new Date(String(run.checkDate)).toLocaleDateString()} · {Number(run.employeeCount)} employee(s)</p><div className="mt-4 flex flex-wrap gap-5 text-sm"><span>Gross <strong>{formatCurrency(Number(run.grossPay))}</strong></span><span>Net <strong>{formatCurrency(Number(run.netPay))}</strong></span><span>Employer cost <strong>{formatCurrency(Number(run.employerCost))}</strong></span></div></div><form action={advancePayrollRun} className="flex items-end gap-2"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(run.id)}/>{run.status === "NEEDS_APPROVAL" && <button className="ck-button" name="command" type="submit" value="APPROVE"><UserCheck size={14}/>Approve payroll</button>}{run.status === "APPROVED" && <button className="ck-button" name="command" type="submit" value="SUBMIT"><Send size={14}/>Submit to provider</button>}</form></article>)}</div>
      <aside className="ck-card h-fit p-5"><div className="ck-eyebrow">Provider control</div><h3 className="mt-2 text-xl font-semibold">{String(connection?.provider ?? "Not connected")}</h3><p className="mt-2 text-sm text-slate-500">{String(connection?.mode ?? "Choose embedded or connected payroll")} · {String(connection?.status ?? "DISCONNECTED")}</p><div className="mt-5 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-amber-900">ClearKey owns approvals, evidence, and accounting handoff. Tax calculation, filing, remittance, and direct deposit remain with the configured payroll provider.</div></aside>
    </section>
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="ck-card overflow-hidden"><div className="border-b p-5"><h3 className="font-semibold">Submitted time</h3></div><div className="divide-y">{(data.time ?? []).map((entry) => <div className="flex items-center justify-between gap-4 p-5" key={String(entry.id)}><div><strong>{String(entry.employee)}</strong><p className="mt-1 text-xs text-slate-500">{new Date(String(entry.date)).toLocaleDateString()} · {Number(entry.regular)} regular · {Number(entry.overtime)} overtime</p></div>{entry.status === "SUBMITTED" ? <form action={approveTimeEntry}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(entry.id)}/><button className="ck-button" type="submit">Approve time</button></form> : <Pill tone="success">{String(entry.status)}</Pill>}</div>)}</div></div>
      <div className="ck-card overflow-hidden"><div className="border-b p-5"><h3 className="font-semibold">Time-off decisions</h3></div><div className="divide-y">{(data.timeOff ?? []).map((request) => <div className="flex items-center justify-between gap-4 p-5" key={String(request.id)}><div><strong>{String(request.employee)}</strong><p className="mt-1 text-xs text-slate-500">{String(request.type)} · {Number(request.hours)} hours · {new Date(String(request.startsOn)).toLocaleDateString()}</p></div>{request.status === "PENDING" ? <form action={reviewTimeOff} className="flex gap-2"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(request.id)}/><button className="ck-button" name="decision" type="submit" value="APPROVED">Approve</button><button className="ck-button ck-button-secondary" name="decision" type="submit" value="DENIED">Deny</button></form> : <Pill tone={request.status === "APPROVED" ? "success" : "danger"}>{String(request.status)}</Pill>}</div>)}</div></div>
    </section>
  </div>;
}

export function ServiceWorkbench({ module, data, organizationSlug }: { module: string; data: Data; organizationSlug: string }) {
  if (module === "cases") return <CaseWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "campaigns") return <CampaignWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "calendar") return <CalendarWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "email") return <EmailWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "payroll") return <PayrollWorkbench data={data} organizationSlug={organizationSlug}/>;
  return null;
}
