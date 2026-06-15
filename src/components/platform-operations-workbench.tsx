"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Download, FileUp, RefreshCw, ShieldAlert } from "lucide-react";
import {
  replayWebhook,
  runIntegrationSync,
  updateBooking,
  updateEndpointSubmission,
} from "@/app/app/[organizationSlug]/actions";

type Value = Record<string, unknown>;
type Data = { records?: Value[]; webhooks?: Value[] };

function DocumentsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return;
    setStatus("Preparing secure upload...");
    const request = await fetch("/api/documents/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationSlug, fileName: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }),
    });
    const signed = await request.json();
    if (!request.ok) return setStatus(signed.error ?? "Upload could not be prepared.");
    const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
    if (!uploaded.ok) return setStatus("Object storage rejected the upload.");
    await fetch("/api/documents/upload", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationSlug, fileId: signed.fileId }) });
    setStatus("Upload complete. Security scan is pending.");
    router.refresh();
  }
  return <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
    <form action={upload} className="ck-card h-fit p-5">
      <div className="flex items-center gap-2 font-semibold"><FileUp className="text-[#9b7420]" size={18}/>Private document vault</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Files upload directly to private R2 storage through a short-lived signed URL. Metadata, versions, retention, and scan state remain tenant scoped.</p>
      <input className="ck-input mt-5 py-2" name="file" required type="file"/>
      <button className="ck-button mt-4 w-full" type="submit">Upload securely</button>
      {status && <p className="mt-3 text-xs text-slate-600">{status}</p>}
    </form>
    <section className="space-y-3">{(data.records ?? []).map((file) => <article className="ck-card flex flex-wrap items-center justify-between gap-4 p-5" key={String(file.id)}>
      <div><div className="flex items-center gap-2"><strong>{String(file.name)}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{String(file.status)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${file.scanStatus === "CLEAN" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{String(file.scanStatus)}</span></div><p className="mt-2 text-xs text-slate-500">{String(file.type)} - {(Number(file.size) / 1024).toFixed(1)} KB - version {String(file.version)}</p></div>
      {file.status === "AVAILABLE" && <a className="ck-button ck-button-secondary" href={String(file.downloadUrl)}><Download size={14}/>Download</a>}
    </article>)}</section>
  </div>;
}

function BookingsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-3">{(data.records ?? []).map((booking) => <article className="ck-card grid gap-4 p-5 lg:grid-cols-[1fr_420px]" key={String(booking.id)}>
    <div><div className="flex items-center gap-2"><CalendarCheck className="text-[#9b7420]" size={18}/><strong>{String(booking.title)}</strong><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">{String(booking.status)}</span></div><p className="mt-2 text-sm text-slate-500">{String(booking.customer)} - {String(booking.email ?? "No email")}</p><p className="mt-2 text-sm font-semibold">{new Date(String(booking.startsAt)).toLocaleString()} to {new Date(String(booking.endsAt)).toLocaleTimeString()}</p><p className="mt-2 text-xs text-slate-500">{String(booking.notes ?? "No notes")}</p></div>
    <form action={updateBooking} className="flex flex-wrap items-end gap-3 rounded-lg border bg-slate-50 p-4"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(booking.id)}/><label className="min-w-44 flex-1 text-xs font-semibold">Appointment state<select className="ck-input mt-2" defaultValue={String(booking.status)} name="status">{["SCHEDULED","CONFIRMED","COMPLETED","CANCELED"].map((status) => <option key={status}>{status}</option>)}</select></label><button className="ck-button" type="submit">Update appointment</button></form>
  </article>)}</div>;
}

function SubmissionsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-3">{(data.records ?? []).map((submission) => {
    const payload = (submission.payload ?? {}) as Value;
    const fields = Object.entries(payload).filter(([key]) => key !== "organizationSlug");
    return <article className="ck-card grid gap-4 p-5 xl:grid-cols-[1fr_420px]" key={String(submission.id)}>
      <div>
        <div className="flex items-center gap-2"><ShieldAlert className="text-[#9b7420]" size={18}/><strong>{String(submission.type)}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{String(submission.status)}</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {fields.map(([key, value]) => <div className="rounded-lg bg-[#f8f5ef] p-3" key={key}><div className="text-[10px] font-bold uppercase text-slate-500">{key.replaceAll("_", " ")}</div><div className="mt-1 text-sm font-semibold">{String(value)}</div></div>)}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#8b6914]">View raw JSON</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-200">{JSON.stringify(submission.payload, null, 2)}</pre>
        </details>
        <p className="mt-2 text-xs text-slate-500">Received {new Date(String(submission.createdAt)).toLocaleString()}</p>
      </div>
      <form action={updateEndpointSubmission} className="grid gap-3 rounded-lg border bg-slate-50 p-4"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(submission.id)}/><label className="text-xs font-semibold">Triage state<select className="ck-input mt-2" defaultValue={String(submission.status)} name="status">{["NEW","IN_REVIEW","RESOLVED","SPAM"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="text-xs font-semibold">Create follow-up task<input className="ck-input mt-2" name="followUp" placeholder="Call customer, quote job, or review spam signal"/></label><label className="text-xs font-semibold">Due date<input className="ck-input mt-2" name="dueAt" type="date"/></label><button className="ck-button" type="submit">Save triage</button></form>
    </article>;
  })}</div>;
}

function IntegrationsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="grid gap-4 2xl:grid-cols-[1fr_1fr]">
    <section className="space-y-3">{(data.records ?? []).map((integration) => {
      const coverage = (integration.coverage ?? {}) as Value;
      const runs = (integration.runs as Value[]) ?? [];
      return <article className="ck-card overflow-hidden" key={String(integration.id)}>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2"><strong>{String(integration.provider)}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${integration.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{String(integration.status)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${integration.health === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{String(integration.health)}</span></div>
            <p className="mt-2 text-xs text-slate-500">{String(integration.direction)} sync - last successful contact {integration.lastSyncAt ? new Date(String(integration.lastSyncAt)).toLocaleString() : "never"}</p>
          </div>
          <form action={runIntegrationSync}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(integration.id)}/><button className="ck-button ck-button-secondary" type="submit"><RefreshCw size={14}/>Run sync check</button></form>
        </div>
        {Boolean(integration.lastError) && <p className="mx-5 rounded-xl bg-red-50 p-3 text-xs text-red-700">{String(integration.lastError)}</p>}
        <div className="grid gap-px border-t bg-slate-200 lg:grid-cols-[260px_1fr]">
          <div className="bg-[#f8f5ef] p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entity coverage</div>
            <div className="mt-3 flex flex-wrap gap-2">{["contacts","accounts","invoices","products","payments"].map((key) => <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${coverage[key] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`} key={key}>{key}</span>)}</div>
          </div>
          <div className="bg-white p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent sync runs</div>
            <div className="mt-3 space-y-2">{runs.map((run) => <div className="grid gap-2 rounded-lg bg-[#f8f5ef] p-3 text-xs sm:grid-cols-[1fr_auto]" key={String(run.id)}><span>{String(run.status)} - {String(run.direction)} - {run.startedAt ? new Date(String(run.startedAt)).toLocaleString() : ""}</span><span>{String(run.processed)} processed / {String(run.failed)} failed</span>{Boolean(run.error) && <p className="text-red-700 sm:col-span-2">{String(run.error)}</p>}</div>)}{!runs.length && <p className="text-xs text-slate-500">No sync runs recorded yet.</p>}</div>
          </div>
        </div>
      </article>;
    })}</section>
    <section className="ck-card h-fit overflow-hidden"><div className="border-b p-5"><h3 className="font-semibold">Webhook delivery queue</h3><p className="mt-1 text-xs text-slate-500">Idempotent provider events, retry attempts, and operator-requested replay.</p></div><div className="divide-y">{(data.webhooks ?? []).map((event) => <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={String(event.id)}><div><strong className="text-sm">{String(event.provider)} - {String(event.type)}</strong><p className="mt-1 text-xs text-slate-500">{String(event.status)} - {String(event.attempts)} attempt(s) - {new Date(String(event.createdAt)).toLocaleString()}</p>{Boolean(event.error) && <p className="mt-1 text-xs text-red-600">{String(event.error)}</p>}</div>{event.status === "FAILED" && <form action={replayWebhook}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(event.id)}/><button className="ck-button ck-button-secondary" type="submit"><RefreshCw size={14}/>Queue replay</button></form>}</div>)}</div></section>
  </div>;
}

export function PlatformOperationsWorkbench({ module, data, organizationSlug }: { module: string; data: Data; organizationSlug: string }) {
  if (module === "documents") return <DocumentsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "bookings") return <BookingsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "submissions") return <SubmissionsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "integrations") return <IntegrationsWorkbench data={data} organizationSlug={organizationSlug}/>;
  return null;
}
