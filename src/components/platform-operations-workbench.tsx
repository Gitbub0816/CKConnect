"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Download, FileUp, Hash, Link2, RefreshCw, Send, ShieldAlert, Unplug } from "lucide-react";
import {
  replayWebhook,
  promoteEndpointSubmission,
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
        <div className="flex flex-wrap items-center gap-2"><ShieldAlert className="text-[#9b7420]" size={18}/><strong>{String(submission.type)}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{String(submission.status)}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">{Number(submission.routeScore)} route score</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            ["Name", submission.name || "Unknown"],
            ["Email", submission.email || "Missing"],
            ["Phone", submission.phone || "Missing"],
            ["Age", `${Number(submission.ageHours)}h`],
          ].map(([label, value]) => <div className="rounded-lg border bg-white p-3" key={String(label)}><div className="text-[10px] font-bold uppercase text-slate-400">{String(label)}</div><div className="mt-1 truncate text-sm font-semibold">{String(value)}</div></div>)}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {fields.map(([key, value]) => <div className="rounded-lg bg-[#f8f5ef] p-3" key={key}><div className="text-[10px] font-bold uppercase text-slate-500">{key.replaceAll("_", " ")}</div><div className="mt-1 text-sm font-semibold">{String(value)}</div></div>)}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#8b6914]">View raw JSON</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-200">{JSON.stringify(submission.payload, null, 2)}</pre>
        </details>
        <p className="mt-2 text-xs text-slate-500">Received {new Date(String(submission.createdAt)).toLocaleString()}</p>
      </div>
      <div className="grid gap-3">
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Promote submission</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["CREATE_LEAD", "Create lead"],
              ["CREATE_CASE", "Create case"],
              ["SAVE_CONTACT", "Save contact"],
            ].map(([command, label]) => <form action={promoteEndpointSubmission} key={command}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(submission.id)}/><button className="ck-button ck-button-secondary w-full" name="command" type="submit" value={command}>{label}</button></form>)}
          </div>
        </div>
        <form action={updateEndpointSubmission} className="grid gap-3 rounded-lg border bg-slate-50 p-4"><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(submission.id)}/><label className="text-xs font-semibold">Triage state<select className="ck-input mt-2" defaultValue={String(submission.status)} name="status">{["NEW","IN_REVIEW","RESOLVED","SPAM"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="text-xs font-semibold">Create follow-up task<input className="ck-input mt-2" name="followUp" placeholder="Call customer, quote job, or review spam signal"/></label><label className="text-xs font-semibold">Due date<input className="ck-input mt-2" name="dueAt" type="date"/></label><button className="ck-button" type="submit">Save triage</button></form>
      </div>
    </article>;
  })}</div>;
}

function IntegrationsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const router = useRouter();
  const integrations = useMemo(() => data.records ?? [], [data.records]);
  const slack = integrations.find((item) => String(item.provider) === "SLACK");
  const slackSettings = (slack?.settings ?? {}) as Value;
  const slackNotifications = (slackSettings.notifications ?? {}) as Value;
  const [channels, setChannels] = useState<Array<{ id: string; name: string; private?: boolean }>>([]);
  const [channelId, setChannelId] = useState(String(slackSettings.defaultChannelId ?? ""));
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    newLead: Boolean(slackNotifications.newLead ?? true),
    newBooking: Boolean(slackNotifications.newBooking ?? true),
    invoicePaid: Boolean(slackNotifications.invoicePaid ?? true),
    invoiceOverdue: Boolean(slackNotifications.invoiceOverdue ?? true),
    customerMessage: Boolean(slackNotifications.customerMessage ?? true),
    lowInventory: Boolean(slackNotifications.lowInventory ?? true),
    kiraAutomation: Boolean(slackNotifications.kiraAutomation ?? true),
  });
  const [slackStatus, setSlackStatus] = useState("");
  const slackActive = slack?.status === "ACTIVE";
  const providerCounts = useMemo(() => ({
    active: integrations.filter((item) => item.status === "ACTIVE").length,
    needsWork: integrations.filter((item) => ["ERROR", "REAUTH_REQUIRED", "MISSING_ENV"].includes(String(item.status))).length,
    ready: integrations.filter((item) => item.status === "READY_TO_CONNECT").length,
  }), [integrations]);

  useEffect(() => {
    if (!slackActive) return;
    let cancelled = false;
    fetch(`/api/integrations/slack/channels?organizationSlug=${encodeURIComponent(organizationSlug)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload: { channels?: Array<{ id: string; name: string; private?: boolean }> }) => {
        if (!cancelled) setChannels(payload.channels ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlackStatus("Slack is connected, but channels could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [organizationSlug, slackActive]);

  async function sendSlackTest() {
    if (!channelId) return setSlackStatus("Choose a Slack channel first.");
    setSlackStatus("Sending Slack test message...");
    const response = await fetch("/api/integrations/slack/test-message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationSlug,
        channelId,
        message: "ClearKey Connect is ready to send workspace alerts into Slack.",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSlackStatus(response.ok ? "Slack test message sent." : String(payload.error ?? "Slack test failed."));
  }

  async function saveSlackSettings() {
    const channel = channels.find((item) => item.id === channelId);
    setSlackStatus("Saving Slack routing...");
    const response = await fetch("/api/integrations/slack/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationSlug,
        defaultChannelId: channelId,
        defaultChannelName: channel?.name ?? "",
        notifications,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSlackStatus(response.ok ? "Slack routing saved." : String(payload.error ?? "Slack settings could not be saved."));
    if (response.ok) router.refresh();
  }

  async function disconnectSlack() {
    setSlackStatus("Disconnecting Slack...");
    const response = await fetch("/api/integrations/slack/disconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationSlug }),
    });
    setSlackStatus(response.ok ? "Slack disconnected." : "Slack disconnect failed.");
    router.refresh();
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid gap-px bg-slate-200 md:grid-cols-3">
        <div className="bg-white px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active providers</div>
          <div className="mt-1 text-2xl font-semibold">{providerCounts.active}</div>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ready to connect</div>
          <div className="mt-1 text-2xl font-semibold">{providerCounts.ready}</div>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Needs work</div>
          <div className="mt-1 text-2xl font-semibold">{providerCounts.needsWork}</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="border-y px-5 py-3">Provider</th>
              <th className="border-y px-5 py-3">State</th>
              <th className="border-y px-5 py-3">Coverage</th>
              <th className="border-y px-5 py-3">Last contact</th>
              <th className="border-y px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => {
              const coverage = (integration.coverage ?? {}) as Value;
              const isSlack = integration.provider === "SLACK";
              const connected = integration.status === "ACTIVE";
              return <tr className="align-top hover:bg-slate-50/80" key={String(integration.provider)}>
                <td className="border-b px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${isSlack ? "bg-[#4A154B] text-white" : "bg-slate-100 text-slate-700"}`}>
                      {isSlack ? <Hash size={18}/> : <Link2 size={18}/>}
                    </div>
                    <div>
                      <div className="font-semibold">{String(integration.label ?? integration.provider)}</div>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{String(integration.description ?? "")}</p>
                    </div>
                  </div>
                </td>
                <td className="border-b px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${connected ? "bg-emerald-50 text-emerald-700" : integration.status === "MISSING_ENV" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{String(integration.status).replaceAll("_", " ")}</span>
                  <div className="mt-2 text-xs text-slate-500">{String(integration.health ?? "UNKNOWN").replaceAll("_", " ")}</div>
                </td>
                <td className="border-b px-5 py-4">
                  <div className="flex max-w-sm flex-wrap gap-1.5">
                    {["contacts","accounts","invoices","products","payments","collaboration"].map((key) => (
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${coverage[key] ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`} key={key}>{key}</span>
                    ))}
                  </div>
                </td>
                <td className="border-b px-5 py-4 text-xs text-slate-600">
                  {integration.lastSyncAt ? new Date(String(integration.lastSyncAt)).toLocaleString() : "Never"}
                  {Boolean(integration.lastError) && <p className="mt-1 text-red-600">{String(integration.lastError)}</p>}
                </td>
                <td className="border-b px-5 py-4 text-right">
                  {isSlack && integration.status !== "ACTIVE" ? (
                    <a className="ck-button inline-flex" href={`/api/integrations/slack/install?organizationSlug=${encodeURIComponent(organizationSlug)}`}>
                      <Link2 size={14}/>Connect Slack
                    </a>
                  ) : !integration.virtual ? (
                    <form action={runIntegrationSync}>
                      <input name="organizationSlug" type="hidden" value={organizationSlug}/>
                      <input name="entityId" type="hidden" value={String(integration.id)}/>
                      <button className="ck-button ck-button-secondary inline-flex" type="submit"><RefreshCw size={14}/>Sync check</button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-400">Configure secrets</span>
                  )}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Slack workspace integration</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Route Connect events into channels, expose slash commands, and keep notification preferences tenant-scoped.</p>
            </div>
            {slackActive ? <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14}/>Connected</span> : null}
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 lg:grid-cols-[260px_1fr]">
          <div className="bg-slate-50 p-5 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Workspace</div>
            <div className="mt-2 font-semibold">{String(slackSettings.teamName ?? "Not connected")}</div>
            <div className="mt-1 text-xs text-slate-500">{String(slackSettings.teamId ?? "Connect Slack to capture team metadata.")}</div>
            <div className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Default channel</div>
            <div className="mt-2 font-semibold">{String(slackSettings.defaultChannelName ?? "Select after install")}</div>
          </div>
          <div className="bg-white p-5">
            {!slackActive ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">Install ClearKey in Slack</div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Connect uses OAuth, stores bot credentials encrypted, verifies events with Slack signatures, and never exposes workspace tokens to the browser.</p>
                </div>
                <a className="ck-button" href={`/api/integrations/slack/install?organizationSlug=${encodeURIComponent(organizationSlug)}`}><Link2 size={15}/>Connect Slack</a>
              </div>
            ) : (
              <div className="grid gap-5">
                <label className="text-sm font-semibold">Alert channel
                  <select className="ck-input mt-2" value={channelId} onChange={(event) => setChannelId(event.target.value)}>
                    <option value="">Choose a Slack channel</option>
                    {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}{channel.private ? " (private)" : ""}</option>)}
                  </select>
                </label>
                <div className="grid gap-px overflow-hidden rounded-xl border bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["newLead", "New leads"],
                    ["newBooking", "Bookings"],
                    ["invoicePaid", "Invoice paid"],
                    ["invoiceOverdue", "Invoice overdue"],
                    ["customerMessage", "Customer messages"],
                    ["lowInventory", "Low inventory"],
                    ["kiraAutomation", "Kira automations"],
                  ].map(([key, label]) => (
                    <label className="flex items-center gap-2 bg-white px-4 py-3 text-sm font-semibold" key={key}>
                      <input checked={notifications[key]} onChange={(event) => setNotifications((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox"/>
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="ck-button" onClick={saveSlackSettings} type="button"><CheckCircle2 size={15}/>Save Slack routing</button>
                  <button className="ck-button" onClick={sendSlackTest} type="button"><Send size={15}/>Send test message</button>
                  <button className="ck-button ck-button-secondary" onClick={disconnectSlack} type="button"><Unplug size={15}/>Disconnect</button>
                </div>
                {slackStatus && <p className="text-sm text-slate-600">{slackStatus}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Webhook delivery queue</h3>
          <p className="mt-1 text-xs text-slate-500">Idempotent provider events, retries, and replay.</p>
        </div>
        <div className="max-h-[420px] overflow-auto">
          {(data.webhooks ?? []).map((event) => <div className="grid gap-3 border-b px-5 py-4 text-sm" key={String(event.id)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong>{String(event.provider)} - {String(event.type)}</strong>
                <p className="mt-1 text-xs text-slate-500">{String(event.status)} - {String(event.attempts)} attempt(s) - {new Date(String(event.createdAt)).toLocaleString()}</p>
                {Boolean(event.error) && <p className="mt-1 text-xs text-red-600">{String(event.error)}</p>}
              </div>
              {event.status === "FAILED" && <form action={replayWebhook}>
                <input name="organizationSlug" type="hidden" value={organizationSlug}/>
                <input name="entityId" type="hidden" value={String(event.id)}/>
                <button className="ck-button ck-button-secondary !px-3 !py-2 text-xs" type="submit"><RefreshCw size={13}/>Replay</button>
              </form>}
            </div>
          </div>)}
          {!(data.webhooks ?? []).length && <div className="px-5 py-10 text-sm text-slate-500">No webhook events have been captured yet.</div>}
        </div>
      </div>
    </section>
  </div>;
}

export function PlatformOperationsWorkbench({ module, data, organizationSlug }: { module: string; data: Data; organizationSlug: string }) {
  if (module === "documents") return <DocumentsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "bookings") return <BookingsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "submissions") return <SubmissionsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "integrations") return <IntegrationsWorkbench data={data} organizationSlug={organizationSlug}/>;
  return null;
}
