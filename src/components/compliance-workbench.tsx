import {
  BadgeCheck,
  Brain,
  ClipboardCheck,
  FileClock,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  createDataSubjectRequest,
  seedComplianceProgram,
  updateComplianceControl,
} from "@/app/app/[organizationSlug]/actions";

type Value = Record<string, unknown>;

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function ComplianceWorkbench({
  data,
  organizationSlug,
}: {
  data: Record<string, unknown>;
  organizationSlug: string;
}) {
  const controls = (data.controls ?? []) as Value[];
  const requests = (data.requests ?? []) as Value[];
  const vendors = (data.vendors ?? []) as Value[];
  const activities = (data.activities ?? []) as Value[];
  const evidence = (data.evidence ?? []) as Value[];
  const aiEvents = (data.aiEvents ?? []) as Value[];
  const frameworks = ["SOC2", "ISO27001", "GDPR", "EU_AI_ACT"];

  return (
    <div className="space-y-4">
      <section className="ck-card overflow-hidden">
        <div className="grid gap-4 border-b p-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="text-[#9b7420]" size={18} />
              Compliance operating system
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              This workspace maps product controls to SOC 2, ISO 27001, GDPR,
              and EU AI Act readiness. Certification still requires policies,
              evidence review, vendor paperwork, legal counsel, and an external
              auditor.
            </p>
          </div>
          <form action={seedComplianceProgram}>
            <input name="organizationSlug" type="hidden" value={organizationSlug} />
            <button className="ck-button" type="submit">
              <ClipboardCheck size={14} />
              Seed baseline controls
            </button>
          </form>
        </div>
        <div className="grid divide-y lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {frameworks.map((framework) => {
            const scoped = controls.filter((control) => control.framework === framework);
            const ready = scoped.filter((control) => control.status === "IMPLEMENTED").length;
            return (
              <div className="p-5" key={framework}>
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
                  {framework.replaceAll("_", " ")}
                </div>
                <div className="mt-2 text-2xl font-semibold">{ready}/{scoped.length}</div>
                <p className="mt-1 text-xs text-slate-500">implemented controls</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="ck-card overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Control register</h2>
          </div>
          <div className="divide-y">
            {controls.map((control) => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1fr_300px]" key={String(control.id)}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{String(control.framework)}</Pill>
                    <Pill tone={control.status === "IMPLEMENTED" ? "success" : control.status === "EXCEPTION" ? "danger" : "warning"}>
                      {String(control.status)}
                    </Pill>
                    <span className="text-xs font-semibold text-slate-500">{String(control.controlId)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{String(control.title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{String(control.implementation ?? "")}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Evidence {Number(control.evidenceCount)} - Owner {String(control.owner ?? "Unassigned")}
                  </p>
                </div>
                <form action={updateComplianceControl} className="rounded-lg border bg-slate-50 p-4">
                  <input name="organizationSlug" type="hidden" value={organizationSlug} />
                  <input name="entityId" type="hidden" value={String(control.id)} />
                  <label className="text-xs font-semibold text-slate-600">
                    Review status
                    <select className="ck-input mt-2" defaultValue={String(control.status)} name="status">
                      {["IMPLEMENTED", "NEEDS_REVIEW", "EXCEPTION", "PLANNED", "DEPRECATED"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block text-xs font-semibold text-slate-600">
                    Owner
                    <input className="ck-input mt-2" defaultValue={String(control.owner ?? "")} name="owner" />
                  </label>
                  <label className="mt-3 block text-xs font-semibold text-slate-600">
                    Review note
                    <textarea className="ck-input mt-2 min-h-20 py-3" name="notes" />
                  </label>
                  <button className="ck-button mt-3 w-full" type="submit">
                    <BadgeCheck size={14} />
                    Save review
                  </button>
                </form>
              </article>
            ))}
            {!controls.length && (
              <div className="p-10 text-center text-sm text-slate-500">
                Seed the baseline to create the first controls.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <form action={createDataSubjectRequest} className="ck-card p-5">
            <div className="flex items-center gap-2 font-semibold">
              <Scale className="text-[#9b7420]" size={18} />
              Privacy rights intake
            </div>
            <input name="organizationSlug" type="hidden" value={organizationSlug} />
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Requester email
              <input className="ck-input mt-2" name="requesterEmail" required type="email" />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Requester name
              <input className="ck-input mt-2" name="requesterName" />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Request type
              <select className="ck-input mt-2" name="requestType">
                {["ACCESS", "DELETE", "RECTIFY", "PORTABILITY", "RESTRICT", "OBJECT"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <button className="ck-button mt-4 w-full" type="submit">
              <FileClock size={14} />
              Open DSAR
            </button>
          </form>

          <section className="ck-card p-5">
            <h3 className="font-semibold">Open privacy requests</h3>
            <div className="mt-4 space-y-2">
              {requests.slice(0, 5).map((request) => (
                <div className="rounded-lg border bg-white p-3 text-xs" key={String(request.id)}>
                  <div className="flex justify-between gap-3">
                    <strong>{String(request.requestType)}</strong>
                    <Pill tone={request.completedAt ? "success" : "warning"}>{String(request.status)}</Pill>
                  </div>
                  <p className="mt-1 text-slate-500">{String(request.requesterEmail)}</p>
                  <p className="mt-1 text-slate-500">Due {new Date(String(request.dueAt)).toLocaleDateString()}</p>
                </div>
              ))}
              {!requests.length && <p className="text-xs text-slate-500">No DSARs are open.</p>}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel icon={<ShieldCheck size={18} />} title="Vendor assessments" records={vendors} fields={["vendorName", "service", "riskLevel", "dpaStatus"]} />
        <Panel icon={<ClipboardCheck size={18} />} title="Processing activities" records={activities} fields={["name", "legalBasis", "retentionClass", "status"]} />
        <Panel icon={<FileClock size={18} />} title="Evidence" records={evidence} fields={["title", "evidenceType", "sourceType", "collectedAt"]} />
      </section>

      <section className="ck-card p-5">
        <div className="flex items-center gap-2 font-semibold">
          <Brain className="text-[#9b7420]" size={18} />
          AI governance events
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {aiEvents.map((event) => (
            <div className="rounded-lg border bg-white p-4 text-sm" key={String(event.id)}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill>{String(event.riskCategory)}</Pill>
                <Pill tone={event.humanReviewed ? "success" : "warning"}>
                  {event.humanReviewed ? "Reviewed" : "Needs review"}
                </Pill>
              </div>
              <h3 className="mt-3 font-semibold">{String(event.feature)}</h3>
              <p className="mt-1 text-xs text-slate-500">{String(event.model ?? "No model recorded")}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{String(event.transparencyNotice ?? "No transparency notice captured.")}</p>
            </div>
          ))}
          {!aiEvents.length && (
            <p className="rounded-lg bg-[#f8f5ef] p-4 text-sm text-slate-500">
              No AI governance events have been recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Panel({
  icon,
  title,
  records,
  fields,
}: {
  icon: React.ReactNode;
  title: string;
  records: Value[];
  fields: string[];
}) {
  return (
    <section className="ck-card p-5">
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-[#9b7420]">{icon}</span>
        {title}
      </div>
      <div className="mt-4 space-y-2">
        {records.slice(0, 6).map((record) => (
          <div className="rounded-lg border bg-white p-3 text-xs" key={String(record.id)}>
            {fields.map((field) => (
              <div className="flex justify-between gap-3 py-0.5" key={field}>
                <span className="text-slate-500">{field.replaceAll(/([A-Z])/g, " $1")}</span>
                <strong className="text-right">{String(record[field] ?? "None")}</strong>
              </div>
            ))}
          </div>
        ))}
        {!records.length && <p className="text-xs text-slate-500">No records yet.</p>}
      </div>
    </section>
  );
}
