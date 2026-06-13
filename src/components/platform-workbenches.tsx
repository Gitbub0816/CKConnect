"use client";

import { useState } from "react";
import { BadgeCheck, Globe2, LayoutTemplate, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  saveReportQuery,
  saveWebsitePage,
  updateMembershipAccess,
  updateTenantSettings,
  updateTenantControls,
  verifyDomainNow,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type Value = Record<string, unknown>;
type Data = { records?: Value[]; queryReports?: Value[]; websites?: Value[]; theme?: Value | null; modules?: Value | null; tenantSettings?: Value | null; organization?: Value | null; permissionCatalog?: string[] };

function ReportsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
    <form action={saveReportQuery} className="ck-card h-fit p-5">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/>
      <div className="flex items-center gap-2 font-semibold"><LayoutTemplate className="text-[#9b7420]" size={18}/>Query builder</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Build tenant-scoped reports from approved business datasets. Raw SQL is intentionally unavailable.</p>
      <div className="mt-5 grid gap-4">
        <label className="text-xs font-semibold text-slate-600">Report name<input className="ck-input mt-2" name="name" placeholder="Monthly receivables by status" required/></label>
        <label className="text-xs font-semibold text-slate-600">Dataset<select className="ck-input mt-2" name="dataset"><option value="invoices">Invoices</option><option value="deals">Deals</option><option value="expenses">Expenses</option><option value="customers">Customers</option></select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Calculation<select className="ck-input mt-2" name="metric"><option value="count">Count</option><option value="sum">Sum</option><option value="average">Average</option></select></label><label className="text-xs font-semibold text-slate-600">Value field<select className="ck-input mt-2" name="valueField"><option value="balanceDue">Balance due</option><option value="total">Invoice total</option><option value="amount">Amount</option><option value="annualRevenue">Annual revenue</option></select></label></div>
        <label className="text-xs font-semibold text-slate-600">Group by<select className="ck-input mt-2" name="groupBy"><option value="month">Month</option><option value="status">Status</option><option value="stage">Deal stage</option><option value="source">Source</option><option value="industry">Industry</option><option value="none">No grouping</option></select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Filter field<select className="ck-input mt-2" name="filterField"><option value="none">None</option><option value="status">Status</option><option value="stage">Stage</option><option value="source">Source</option><option value="industry">Industry</option></select></label><label className="text-xs font-semibold text-slate-600">Equals<input className="ck-input mt-2" name="filterValue"/></label></div>
        <label className="flex items-center gap-2 text-xs font-semibold"><input name="shared" type="checkbox"/>Share with the organization</label>
        <button className="ck-button" type="submit"><Plus size={14}/>Save and run report</button>
      </div>
    </form>
    <section className="space-y-4">
      {(data.queryReports ?? []).map((report) => <article className="ck-card overflow-hidden" key={String(report.id)}>
        <div className="flex items-center justify-between border-b p-5"><div><h3 className="font-semibold">{String(report.name)}</h3><p className="mt-1 text-xs text-slate-500">{String((report.definition as Value).dataset)} · {String((report.definition as Value).metric)} · grouped by {String((report.definition as Value).groupBy)}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">{report.shared ? "Shared" : "Private"}</span></div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{(report.rows as Value[]).map((row) => <div className="bg-white p-5" key={String(row.group)}><div className="text-xs font-semibold text-slate-500">{String(row.group)}</div><div className="mt-2 text-2xl font-semibold">{["invoices","deals","expenses","customers"].includes(String((report.definition as Value).dataset)) && (report.definition as Value).metric !== "count" ? formatCurrency(Number(row.value)) : Number(row.value).toLocaleString()}</div><div className="mt-1 text-xs text-slate-400">{Number(row.records)} source records</div></div>)}</div>
      </article>)}
      {!(data.queryReports ?? []).length && <div className="ck-card p-10 text-center text-sm text-slate-500">Create the first reusable report from the query builder.</div>}
    </section>
  </div>;
}

function TeamWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const permissions = data.permissionCatalog ?? [];
  return <div className="space-y-4">{(data.records ?? []).map((member) => <form action={updateMembershipAccess} className="ck-card grid gap-5 p-5 xl:grid-cols-[260px_180px_1fr_auto]" key={String(member.id)}>
    <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="membershipId" type="hidden" value={String(member.id)}/>
    <div><div className="flex items-center gap-2"><ShieldCheck className="text-[#9b7420]" size={17}/><strong>{String(member.name)}</strong></div><div className="mt-2 text-xs text-slate-500">{String(member.email)}</div><div className="mt-1 text-xs text-slate-400">Licensed since {new Date(String(member.joinedAt)).toLocaleDateString()}</div></div>
    <label className="text-xs font-semibold text-slate-600">Role<select className="ck-input mt-2" defaultValue={String(member.role)} name="role">{["OWNER","ADMIN","MANAGER","SALES","ACCOUNTING","SUPPORT","READ_ONLY","PORTAL_USER"].map((role) => <option key={role}>{role}</option>)}</select></label>
    <fieldset><legend className="text-xs font-semibold text-slate-600">Granular permissions</legend><div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border bg-slate-50 p-3 lg:grid-cols-3">{permissions.map((permission) => <label className="flex items-center gap-2 text-[11px]" key={permission}><input defaultChecked={(member.permissions as string[]).includes(permission) || (member.permissions as string[]).includes("*")} name="permissions" type="checkbox" value={permission}/>{permission}</label>)}</div></fieldset>
    <button className="ck-button self-end" type="submit"><BadgeCheck size={14}/>Save access</button>
  </form>)}</div>;
}

const moduleOptions = ["crm","cases","campaigns","accounting","banking","payroll","websites","domains","automations","reports","marketing","managedEmail"];

function SettingsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const theme = data.theme ?? {};
  const modules = data.modules ?? {};
  const tenantSettings = data.tenantSettings ?? {};
  const profile = (tenantSettings.profileJson as Value | undefined) ?? {};
  const security = (tenantSettings.securityJson as Value | undefined) ?? {};
  const booking = (tenantSettings.bookingJson as Value | undefined) ?? {};
  const portal = (tenantSettings.portalJson as Value | undefined) ?? {};
  return <div className="space-y-4"><section className="ck-card p-5"><div className="ck-eyebrow">Workspace identifiers</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Public tenant ID",data.organization?.publicId],["Organization code",data.organization?.orgCode],["Tenant slug",data.organization?.slug],["Currency / timezone",`${String(data.organization?.currency)} / ${String(data.organization?.timezone)}`]].map(([label,value]) => <div className="rounded-lg bg-slate-50 p-3" key={String(label)}><div className="text-[10px] font-bold uppercase text-slate-500">{String(label)}</div><div className="mt-1 break-all font-mono text-xs">{String(value ?? "")}</div></div>)}</div></section>
  <form action={updateTenantSettings} className="grid gap-4 xl:grid-cols-2"><input name="organizationSlug" type="hidden" value={organizationSlug}/><section className="ck-card p-5"><div className="ck-eyebrow">Business profile</div><h3 className="mt-2 text-xl font-semibold">Shared public defaults</h3><div className="mt-5 grid gap-4"><label className="text-xs font-semibold">Support email<input className="ck-input mt-2" defaultValue={String(profile.supportEmail ?? "")} name="supportEmail" type="email"/></label><label className="text-xs font-semibold">Billing email<input className="ck-input mt-2" defaultValue={String(profile.billingEmail ?? "")} name="billingEmail" type="email"/></label><label className="text-xs font-semibold">Main phone<input className="ck-input mt-2" defaultValue={String(profile.mainPhone ?? "")} name="mainPhone"/></label></div></section><section className="ck-card p-5"><div className="ck-eyebrow">Security policy</div><h3 className="mt-2 text-xl font-semibold">Workspace access controls</h3><div className="mt-5 grid gap-4"><label className="flex items-center gap-3 text-sm font-semibold"><input defaultChecked={Boolean(security.requireMfa)} name="requireMfa" type="checkbox"/>Require MFA</label><label className="flex items-center gap-3 text-sm font-semibold"><input defaultChecked={Boolean(security.requirePasskeys)} name="requirePasskeys" type="checkbox"/>Require passkeys</label><label className="text-xs font-semibold">Session timeout (minutes)<input className="ck-input mt-2" defaultValue={Number(security.sessionTimeoutMinutes ?? 480)} max="1440" min="15" name="sessionTimeoutMinutes" type="number"/></label><label className="flex items-center gap-3 text-sm font-semibold"><input defaultChecked={Boolean(booking.enabled)} name="bookingEnabled" type="checkbox"/>Public booking enabled</label><label className="flex items-center gap-3 text-sm font-semibold"><input defaultChecked={Boolean(portal.enabled)} name="portalEnabled" type="checkbox"/>Customer portal enabled</label></div><button className="ck-button mt-5" type="submit">Save profile and security</button></section></form>
  <form action={updateTenantControls} className="grid gap-4 xl:grid-cols-2">
    <input name="organizationSlug" type="hidden" value={organizationSlug}/>
    <section className="ck-card p-5"><div className="ck-eyebrow">Console identity</div><h3 className="mt-2 text-xl font-semibold">Employee workspace</h3><div className="mt-5 grid gap-4"><label className="text-xs font-semibold text-slate-600">Header/title<input className="ck-input mt-2" defaultValue={String(theme.consoleTitle ?? "")} name="consoleTitle" placeholder="Northstar Operations"/></label><label className="text-xs font-semibold text-slate-600">Console logo URL<input className="ck-input mt-2" defaultValue={String(theme.consoleLogoUrl ?? "")} name="consoleLogoUrl"/></label><label className="text-xs font-semibold text-slate-600">Background image URL<input className="ck-input mt-2" defaultValue={String(theme.consoleBackgroundImageUrl ?? "")} name="consoleBackgroundImageUrl"/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Primary color<input className="mt-2 h-10 w-full rounded border p-1" defaultValue={String(theme.consolePrimaryColor ?? "#c9a033")} name="consolePrimaryColor" type="color"/></label><label className="text-xs font-semibold text-slate-600">Sidebar color<input className="mt-2 h-10 w-full rounded border p-1" defaultValue={String(theme.consoleSidebarColor ?? "#1c1917")} name="consoleSidebarColor" type="color"/></label></div></div></section>
    <section className="ck-card p-5"><div className="ck-eyebrow">Payment identity</div><h3 className="mt-2 text-xl font-semibold">Customer payment page</h3><div className="mt-5 grid gap-4"><label className="text-xs font-semibold text-slate-600">Payment header/title<input className="ck-input mt-2" defaultValue={String(theme.paymentTitle ?? "")} name="paymentTitle" placeholder="Secure payment center"/></label><label className="text-xs font-semibold text-slate-600">Payment logo URL<input className="ck-input mt-2" defaultValue={String(theme.paymentLogoUrl ?? "")} name="paymentLogoUrl"/></label><label className="text-xs font-semibold text-slate-600">Background image URL<input className="ck-input mt-2" defaultValue={String(theme.paymentBackgroundImageUrl ?? "")} name="paymentBackgroundImageUrl"/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Action color<input className="mt-2 h-10 w-full rounded border p-1" defaultValue={String(theme.paymentPrimaryColor ?? "#c9a033")} name="paymentPrimaryColor" type="color"/></label><label className="text-xs font-semibold text-slate-600">Header color<input className="mt-2 h-10 w-full rounded border p-1" defaultValue={String(theme.paymentHeaderColor ?? "#1c1917")} name="paymentHeaderColor" type="color"/></label></div></div></section>
    <section className="ck-card p-5 xl:col-span-2"><div className="ck-eyebrow">Feature policy</div><h3 className="mt-2 text-xl font-semibold">Enabled workspace modules</h3><p className="mt-2 text-sm text-slate-500">Disabled modules disappear from navigation and cannot be opened by standard licensees.</p><div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{moduleOptions.map((module) => <label className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm font-semibold capitalize" key={module}><input defaultChecked={modules[module] !== false} name="enabledModules" type="checkbox" value={module}/>{module.replaceAll(/([A-Z])/g, " $1")}</label>)}</div><button className="ck-button mt-5" type="submit">Save tenant controls</button></section>
  </form></div>;
}

type SiteBlock = { type: string; title: string; body: string; action?: string };

function WebsiteWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  const website = data.websites?.[0];
  const page = (website?.pages as Value[] | undefined)?.[0];
  const initial = (((page?.content as Value | undefined)?.blocks as SiteBlock[] | undefined) ?? [{ type: "hero", title: "A better business starts here", body: "Describe the customer promise and the next action.", action: "Get started" }]);
  const [blocks, setBlocks] = useState(initial);
  if (!website || !page) return <div className="ck-card p-10 text-center text-sm text-slate-500">Create a website to open the visual page builder.</div>;
  const update = (index: number, key: keyof SiteBlock, value: string) => setBlocks((current) => current.map((block, position) => position === index ? { ...block, [key]: value } : block));
  return <form action={saveWebsitePage}>
    <input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="websiteId" type="hidden" value={String(website.id)}/><input name="pageId" type="hidden" value={String(page.id)}/><input name="blocksJson" type="hidden" value={JSON.stringify(blocks)}/>
    <div className="grid gap-4 2xl:grid-cols-[360px_1fr]">
      <section className="ck-card p-5"><div className="flex items-center gap-2 font-semibold"><Globe2 className="text-[#9b7420]" size={18}/>Page settings</div><div className="mt-5 grid gap-4"><label className="text-xs font-semibold text-slate-600">Page title<input className="ck-input mt-2" defaultValue={String(page.title)} name="title"/></label><label className="text-xs font-semibold text-slate-600">Path<input className="ck-input mt-2" defaultValue={String(page.path)} name="path"/></label><label className="text-xs font-semibold text-slate-600">SEO title<input className="ck-input mt-2" defaultValue={String((page.seo as Value)?.title ?? page.title)} name="seoTitle"/></label><label className="text-xs font-semibold text-slate-600">SEO description<textarea className="ck-input mt-2 min-h-20 py-3" defaultValue={String((page.seo as Value)?.description ?? "")} name="seoDescription"/></label></div><div className="mt-5 flex gap-2"><button className="ck-button ck-button-secondary flex-1" type="submit">Save draft</button><button className="ck-button flex-1" name="publish" type="submit" value="on">Publish page</button></div></section>
      <section className="space-y-4">
        <div className="ck-card p-5"><div className="flex items-center justify-between"><div><div className="ck-eyebrow">Page canvas</div><h3 className="mt-2 font-semibold">{String(website.hostname)}</h3></div><button className="ck-button ck-button-secondary" onClick={() => setBlocks((current) => [...current, { type: "content", title: "New section", body: "Write the section content.", action: "Learn more" }])} type="button"><Plus size={14}/>Add section</button></div><div className="mt-5 space-y-3">{blocks.map((block, index) => <article className="rounded-lg border bg-slate-50 p-4" key={`${block.type}-${index}`}><div className="flex items-center justify-between"><select className="ck-input !w-auto" onChange={(event) => update(index, "type", event.target.value)} value={block.type}><option value="hero">Hero</option><option value="content">Content</option><option value="services">Services</option><option value="testimonial">Testimonial</option><option value="cta">Call to action</option><option value="payment">Payment widget</option><option value="booking">Booking widget</option><option value="form">Contact form</option><option value="portal">Customer portal widget</option></select><button className="text-red-600" onClick={() => setBlocks((current) => current.filter((_, position) => position !== index))} type="button"><Trash2 size={16}/></button></div><input className="ck-input mt-3" onChange={(event) => update(index, "title", event.target.value)} value={block.title}/><textarea className="ck-input mt-3 min-h-20 py-3" onChange={(event) => update(index, "body", event.target.value)} value={block.body}/><input className="ck-input mt-3" onChange={(event) => update(index, "action", event.target.value)} placeholder="Button label" value={block.action ?? ""}/></article>)}</div></div>
        <div className="ck-card overflow-hidden"><div className="border-b p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Responsive preview</div><div className="bg-slate-100 p-5"><div className="mx-auto max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">{blocks.map((block, index) => <section className={`${block.type === "hero" ? "bg-slate-900 px-10 py-20 text-white" : "border-t px-10 py-12"}`} key={index}><span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{block.type}</span><h2 className="mt-3 text-3xl font-semibold">{block.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 opacity-70">{block.body}</p>{block.action && <button className="mt-5 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950">{block.action}</button>}</section>)}</div></div></div>
      </section>
    </div>
  </form>;
}

function DomainsWorkbench({ data, organizationSlug }: { data: Data; organizationSlug: string }) {
  return <div className="space-y-4">{(data.records ?? []).map((domain) => <article className="ck-card overflow-hidden" key={String(domain.id)}>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><div className="flex items-center gap-2"><Globe2 className="text-[#9b7420]" size={18}/><h3 className="font-semibold">{String(domain.hostname)}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{String(domain.status)}</span></div><p className="mt-2 text-xs text-slate-500">Ownership TXT: <code>{String(domain.verificationName)}</code> = <code>{String(domain.verificationToken)}</code></p></div><form action={verifyDomainNow}><input name="organizationSlug" type="hidden" value={organizationSlug}/><input name="entityId" type="hidden" value={String(domain.id)}/><button className="ck-button" type="submit"><Play size={14}/>Validate live DNS</button></form></div>
    <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">{(domain.checks as Value[]).map((check) => <div className="bg-white p-4" key={String(check.key)}><div className="flex items-center justify-between"><strong className="text-sm uppercase">{String(check.key)}</strong><span className={`size-2.5 rounded-full ${check.status === "HEALTHY" ? "bg-emerald-500" : check.status === "INVALID" ? "bg-red-500" : "bg-amber-500"}`}/></div><div className="mt-3 break-all text-xs text-slate-500">{String(check.value)}</div><div className="mt-2 text-[10px] font-bold uppercase text-slate-400">{String(check.status)}</div></div>)}{!(domain.checks as Value[]).length && <div className="bg-white p-5 text-sm text-slate-500 sm:col-span-2 lg:col-span-4">Run live validation to inspect ownership, web, MX, SPF, DKIM, DMARC, and SSL.</div>}</div>
  </article>)}</div>;
}

export function PlatformWorkbench({ module, data, organizationSlug }: { module: string; data: Data; organizationSlug: string }) {
  if (module === "reports") return <ReportsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "team") return <TeamWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "settings") return <SettingsWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "websites") return <WebsiteWorkbench data={data} organizationSlug={organizationSlug}/>;
  if (module === "domains") return <DomainsWorkbench data={data} organizationSlug={organizationSlug}/>;
  return null;
}
