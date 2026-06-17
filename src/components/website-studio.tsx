"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
  Bot,
  Braces,
  CalendarDays,
  CreditCard,
  Database,
  FileText,
  Globe2,
  ImagePlus,
  KeyRound,
  LayoutTemplate,
  LoaderCircle,
  MessageSquare,
  Package,
  Play,
  Send,
  Settings,
  Sparkles,
  Store,
  Workflow,
} from "lucide-react";
import {
  saveWebsitePage,
  updateWebsiteDataGrant,
} from "@/app/app/[organizationSlug]/actions";
import {
  clearKeySiteBlocks,
  GrapesJsSiteEditor,
} from "@/components/grapesjs-site-editor";
import { MarkdownMessage } from "@/components/markdown-message";

type SiteBlock = {
  _id?: string;
  type: string;
  title: string;
  body: string;
  action?: string;
  imageUrl?: string;
};
type SiteCode = { html: string; css: string; javascript: string };
type Asset = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  status: string;
};
type Automation = {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
};
type DataGrant = {
  id: string;
  websiteId: string;
  scope: string;
  active: boolean;
  updatedAt?: string;
  metadata?: Value;
};
type IntegrationStatus = Record<
  string,
  {
    configured?: boolean;
    connection?: Value | null;
    status?: string;
  }
>;
type Message = { role: "user" | "assistant"; content: string };
type Value = Record<string, unknown>;

const siteScopes = [
  ["business_profile.read", "Business profile", "Read public business name, contact details, brand basics, and overview copy."],
  ["locations.read", "Locations", "Display public business locations, service areas, and maps."],
  ["services.read", "Services", "Display tenant-approved service names and public descriptions."],
  ["inventory.read", "Inventory", "Display public product or inventory availability fields."],
  ["inventory.write_reservations", "Inventory reservations", "Create temporary product reservations from website checkout or quote flows."],
  ["pricing.read", "Pricing", "Display public prices selected for website use."],
  ["booking.read", "Booking availability", "Read public booking availability windows without exposing private calendars."],
  ["booking.write_requests", "Booking requests", "Create booking or appointment requests from public forms."],
  ["customers.write_leads", "Lead capture", "Create CRM leads or contacts from public website forms."],
  ["forms.write_submissions", "Form submissions", "Store validated public form submissions in the tenant inbox."],
  ["chat.write_sessions", "Website chat", "Open customer chat or handoff sessions without exposing private history."],
  ["chat.read_business_hours", "Chat availability", "Read public handoff and business-hour availability for website chat."],
  ["staff.read_public", "Public staff", "Display selected public staff profiles only."],
  ["reviews.read_public", "Reviews", "Display approved testimonials or review snippets."],
  ["payments.create_checkout", "Checkout links", "Create secure payment or checkout links server-side."],
  ["portal.create_login_link", "Portal login links", "Create customer-safe portal access links."],
] as const;

const websiteTools = [
  ["sites", Globe2, "Sites"],
  ["pages", FileText, "Pages"],
  ["builder", LayoutTemplate, "Builder"],
  ["blocks", Store, "Blocks"],
  ["data", Database, "Data connections"],
  ["forms", MessageSquare, "Forms"],
  ["services", Sparkles, "Services"],
  ["inventory", Package, "Inventory"],
  ["booking", CalendarDays, "Booking"],
  ["payments", CreditCard, "Payments"],
  ["domains", Globe2, "Domains"],
  ["publishing", Play, "Publishing"],
  ["permissions", KeyRound, "Permissions"],
  ["assets", ImagePlus, "Assets"],
  ["ai", Bot, "Kira sandbox"],
  ["automations", Workflow, "Automations"],
  ["settings", Settings, "Settings"],
] as const;

const bindingTools = [
  ["Lead form", "POST /api/public/{tenant}/submit", "customers.write_leads + forms.write_submissions"],
  ["Booking request", "POST /api/public/{tenant}/submit", "booking.read + booking.write_requests"],
  ["Services list", "GET /api/public/site-data?block=services", "services.read + pricing.read"],
  ["Inventory list", "GET /api/public/site-data?block=inventory", "inventory.read + pricing.read"],
  ["Payment button", "POST /api/stripe/invoice-checkout", "payments.create_checkout"],
  ["Portal login", "POST /api/tenants/resolve-by-slug", "portal.create_login_link"],
] as const;

export function WebsiteStudio({
  organizationSlug,
  website,
  page,
  assets,
  automations,
  dataGrants,
  integrationStatus,
}: {
  organizationSlug: string;
  website: Value;
  page: Value;
  assets: Asset[];
  automations: Automation[];
  dataGrants: DataGrant[];
  integrationStatus?: IntegrationStatus;
}) {
  const content = (page.content as Value | undefined) ?? {};
  const websiteConfig = (website.config as Value | undefined) ?? {};
  const deployment = (websiteConfig.lastDeployment as Value | undefined) ?? {};
  const publication = (websiteConfig.publication as Value | undefined) ?? {};
  const edgeMirror = (publication.edgeMirror as Value | undefined) ?? {};
  const edgeMirrored = edgeMirror.mirrored === true;
  const liveUrl = `https://${String(website.hostname)}`;
  const initialBlocks = (content.blocks as SiteBlock[] | undefined) ?? [
    {
      type: "hero",
      title: "A better business starts here",
      body: "Describe the customer promise and the next action.",
      action: "Get started",
    },
  ];
  const initialCode = (content.code as SiteCode | undefined) ?? {
    html: "",
    css: "",
    javascript: "",
  };
  const initialGrapesProject =
    (content.grapesProject as Value | undefined) ?? {};
  const [blocks, setBlocks] = useState(() =>
    initialBlocks.map((block, index) => ({
      ...block,
      _id: block._id ?? `${String(page.id)}-${index}`,
    })),
  );
  const [code, setCode] = useState(initialCode);
  const [grapesProject, setGrapesProject] = useState(initialGrapesProject);
  const [tab, setTab] = useState<
    | "sites"
    | "pages"
    | "builder"
    | "blocks"
    | "code"
    | "data"
    | "forms"
    | "services"
    | "inventory"
    | "booking"
    | "payments"
    | "domains"
    | "publishing"
    | "permissions"
    | "assets"
    | "ai"
    | "automations"
    | "settings"
  >("builder");
  const [assetList, setAssetList] = useState(assets);
  const [uploadStatus, setUploadStatus] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I can build sandbox drafts for this site. Describe the page or change, choose Generate sandbox draft, then review the draft canvas before saving or publishing.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [aiMode, setAiMode] = useState<"chat" | "generate-page" | "automation">(
    "chat",
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestedAutomation, setSuggestedAutomation] = useState<Value | null>(
    null,
  );
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>html,body{margin:0;min-height:100%;font-family:system-ui}${code.css}</style></head><body>${code.html}<script>${code.javascript}<\/script></body></html>`,
    [code],
  );
  const grantedScopes = useMemo(
    () =>
      new Set(
        dataGrants
          .filter((grant) => grant.websiteId === website.id && grant.active)
          .map((grant) => grant.scope),
      ),
    [dataGrants, website.id],
  );
  const handleGrapesChange = useCallback(
    (value: { css: string; html: string; project: Value }) => {
      setCode((current) => ({
        ...current,
        css: value.css,
        html: value.html,
      }));
      setGrapesProject(value.project);
    },
    [],
  );

  async function uploadAsset(file: File) {
    if (!file?.size) return;
    setUploadStatus("Preparing secure R2 upload...");
    const request = await fetch("/api/documents/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationSlug,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        relatedType: "WEBSITE_PAGE",
        relatedId: String(page.id),
      }),
    });
    const signed = await request.json();
    if (!request.ok)
      return setUploadStatus(signed.error ?? "Upload could not be prepared.");
    const uploaded = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!uploaded.ok)
      return setUploadStatus("Object storage rejected the upload.");
    const completed = await fetch("/api/documents/upload", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationSlug, fileId: signed.fileId }),
    });
    if (!completed.ok)
      return setUploadStatus(
        "The upload completed but metadata finalization failed.",
      );
    const next = {
      id: signed.fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      status: "AVAILABLE",
      url: `/api/public/site-assets/${signed.fileId}`,
    };
    setAssetList((current) => [next, ...current]);
    setUploadStatus("Asset uploaded and linked to this page.");
  }

  async function askAi() {
    if (!prompt.trim() || aiBusy) return;
    const userMessage = prompt.trim();
    setPrompt("");
    setMessages((current) => [
      ...current,
      { role: "user", content: userMessage },
    ]);
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai/site-expert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          websiteId: website.id,
          conversationId,
          message: userMessage,
          mode: aiMode,
          currentBlocks: blocks,
          currentCode: code,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "The site expert could not respond.");
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.answer },
      ]);
      if (Array.isArray(result.suggestedBlocks))
        setBlocks(
          result.suggestedBlocks.map((block: SiteBlock) => ({
            ...block,
            _id: crypto.randomUUID(),
          })),
        );
      if (result.suggestedCode)
        setCode((current) => ({ ...current, ...result.suggestedCode }));
      if (result.suggestedAutomation)
        setSuggestedAutomation(result.suggestedAutomation);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "The site expert failed.",
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <form action={saveWebsitePage}>
      <input name="organizationSlug" type="hidden" value={organizationSlug} />
      <input name="websiteId" type="hidden" value={String(website.id)} />
      <input name="pageId" type="hidden" value={String(page.id)} />
      <input name="blocksJson" type="hidden" value={JSON.stringify(blocks)} />
      <input name="codeHtml" type="hidden" value={code.html} />
      <input name="codeCss" type="hidden" value={code.css} />
      <input name="codeJs" type="hidden" value={code.javascript} />
      <input name="grapesJson" type="hidden" value={JSON.stringify(grapesProject)} />
      <input name="title" type="hidden" value={String(page.title)} />
      <input name="path" type="hidden" value={String(page.path)} />
      <input
        name="seoTitle"
        type="hidden"
        value={String((page.seo as Value)?.title ?? page.title)}
      />
      <input
        name="seoDescription"
        type="hidden"
        value={String((page.seo as Value)?.description ?? "")}
      />
      <div className="min-h-[calc(100vh-190px)] overflow-hidden border bg-white">
        <div className="grid min-h-[calc(100vh-190px)] grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className="border-r bg-slate-950 text-white">
            <div className="border-b border-white/10 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Website console
              </div>
              <div className="mt-1 truncate text-sm font-semibold">
                {String(website.hostname)}
              </div>
            </div>
            <nav className="max-h-[calc(100vh-270px)] overflow-y-auto p-2">
              {websiteTools.map(([value, Icon, label]) => (
                <button
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold ${tab === value ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                  key={value}
                  onClick={() => setTab(value)}
                  type="button"
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 overflow-y-auto bg-slate-50">
            <header className="flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {tab}
                </div>
                <h2 className="text-lg font-semibold">ClearKey site workspace</h2>
              </div>
              <div className="flex gap-2">
                <button className="ck-button ck-button-secondary" type="submit">
                  Save draft
                </button>
                <button
                  className="ck-button"
                  name="publish"
                  type="submit"
                  value="on"
                >
                  Publish
                </button>
              </div>
            </header>
            <section className="p-5">

          {tab === "builder" && (
            <div className="border bg-white">
              <section className="overflow-hidden">
                <div className="border-b p-5">
                  <div className="ck-eyebrow">Native GrapesJS editor</div>
                  <h3 className="mt-2 font-semibold">Site builder workspace</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Drag ClearKey blocks into the page. Blocks that use tenant
                    data require explicit approved scopes before publication can
                    safely serve dynamic data.
                  </p>
                </div>
                <GrapesJsSiteEditor
                  initialCss={code.css}
                  initialHtml={code.html}
                  initialProject={grapesProject}
                  onChange={handleGrapesChange}
                />
              </section>
            </div>
          )}

          {tab === "sites" && (
            <WorkspaceTable
              columns={["Host", "Status", "Published", "Runtime"]}
              rows={[
                [
                  String(website.hostname),
                  String(website.status),
                  String(deployment.createdAt ?? website.publishedAt ?? "Not published"),
                  edgeMirrored ? "Cloudflare edge mirror" : "Database runtime",
                ],
              ]}
              title="Tenant sites"
            />
          )}

          {tab === "pages" && (
            <WorkspaceTable
              columns={["Title", "Path", "Status", "SEO"]}
              rows={[
                [
                  String(page.title),
                  String(page.path),
                  String(page.status ?? "DRAFT"),
                  String((page.seo as Value)?.title ?? page.title),
                ],
              ]}
              title="Pages"
            />
          )}

          {tab === "blocks" && (
            <WorkspaceTable
              columns={["Component", "Required scopes", "Binding", "Fallback"]}
              rows={clearKeySiteBlocks.map((block) => [
                block.label,
                block.requiredScopes.join(", ") || "None",
                block.description,
                block.fallback,
              ])}
              title="ClearKey block registry"
            />
          )}

          {tab === "data" && (
            <WorkspaceTable
              columns={["Provider", "Configured", "Connection", "Honest action"]}
              rows={Object.entries(integrationStatus ?? {}).map(([provider, status]) => [
                provider,
                status.configured ? "Yes" : "No",
                String(status.connection?.status ?? status.status ?? "Not connected"),
                status.configured ? "Use provider-specific connect flow" : "Disabled: missing Vercel env",
              ])}
              title="Data connections"
            />
          )}

          {["forms", "services", "inventory", "booking", "payments"].includes(tab) && (
            <WorkspaceTable
              columns={["Surface", "Backend", "Scope gate"]}
              rows={bindingTools.filter(([name]) => {
                const lower = name.toLowerCase();
                return tab === "forms"
                  ? lower.includes("lead")
                  : tab === "services"
                    ? lower.includes("services")
                    : tab === "inventory"
                      ? lower.includes("inventory")
                      : tab === "booking"
                        ? lower.includes("booking")
                        : lower.includes("payment");
              })}
              title={`${tab[0].toUpperCase()}${tab.slice(1)} bindings`}
            />
          )}

          {tab === "domains" && (
            <WorkspaceTable
              columns={["Hostname", "Purpose", "Status"]}
              rows={[
                [String(website.hostname), "Primary hosted runtime", String(website.status)],
                [`${organizationSlug}.cksites.dev`, "Wildcard tenant runtime", "Resolved by Vercel alias"],
              ]}
              title="Domains"
            />
          )}

          {tab === "publishing" && (
            <WorkspaceTable
              columns={["Step", "Current state", "Action"]}
              rows={[
                ["Draft", "Editable in builder", "Save draft"],
                ["Publish", String(website.status), "Publish button runs server action"],
                ["Version", String(deployment.version ?? "Pending"), "Stored in website publication manifest"],
                ["Rollback", "Not available in this build", "Disabled until version restore endpoint is added"],
              ]}
              title="Publishing"
            />
          )}

          {tab === "settings" && (
            <div className="border bg-white p-5">
              <div className="text-sm font-semibold">Page and SEO settings</div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Page title
                  <input className="ck-input mt-2" defaultValue={String(page.title)} name="title" />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Path
                  <input className="ck-input mt-2" defaultValue={String(page.path)} name="path" />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  SEO title
                  <input className="ck-input mt-2" defaultValue={String((page.seo as Value)?.title ?? page.title)} name="seoTitle" />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  SEO description
                  <textarea className="ck-input mt-2 min-h-20 py-3" defaultValue={String((page.seo as Value)?.description ?? "")} name="seoDescription" />
                </label>
              </div>
            </div>
          )}

          {tab === "permissions" && (
            <section className="overflow-hidden border bg-white">
              <div className="border-b p-5">
                <div className="ck-eyebrow">OAuth-style website grants</div>
                <h3 className="mt-2 font-semibold">Website data permissions</h3>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                  This site can only use tenant data that an authorized user
                  explicitly approves. Grants are scoped, tenant-bound,
                  revocable, and audited.
                </p>
              </div>
              <div className="divide-y">
                {siteScopes.map(([scope, label, detail]) => {
                  const active = grantedScopes.has(scope);
                  return (
                    <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={scope}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{label}</strong>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {active ? "APPROVED" : "NOT GRANTED"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{scope}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="ck-button ck-button-secondary"
                          formAction={updateWebsiteDataGrant}
                          name="grantAction"
                          type="submit"
                          value={`${scope}|APPROVE`}
                        >
                          Approve
                        </button>
                        <button
                          className="ck-button ck-button-secondary"
                          disabled={!active}
                          formAction={updateWebsiteDataGrant}
                          name="grantAction"
                          type="submit"
                          value={`${scope}|REVOKE`}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "code" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="border bg-white p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Braces size={17} />
                  Sandboxed code canvas
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Add advanced HTML, CSS, and JavaScript without exposing the
                  parent console, cookies, or tenant credentials.
                </p>
                <div className="mt-4 grid gap-3">
                  <CodeField
                    label="HTML"
                    value={code.html}
                    onChange={(value) =>
                      setCode((current) => ({ ...current, html: value }))
                    }
                  />
                  <CodeField
                    label="CSS"
                    value={code.css}
                    onChange={(value) =>
                      setCode((current) => ({ ...current, css: value }))
                    }
                  />
                  <CodeField
                    label="JavaScript"
                    value={code.javascript}
                    onChange={(value) =>
                      setCode((current) => ({ ...current, javascript: value }))
                    }
                  />
                </div>
              </section>
              <section className="overflow-hidden border bg-white">
                <div className="border-b p-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Isolated preview
                </div>
                <iframe
                  className="h-[720px] w-full bg-white"
                  sandbox="allow-forms allow-scripts"
                  srcDoc={srcDoc}
                  title="Custom website code preview"
                />
              </section>
            </div>
          )}

          {tab === "assets" && (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <section className="h-fit border bg-white p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <ImagePlus size={17} />
                  Upload site asset
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Images, fonts, CSS, JavaScript, JSON, and documents upload
                  directly to tenant-scoped R2.
                </p>
                <input
                  className="ck-input mt-4 py-3"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAsset(file);
                  }}
                  type="file"
                />
                {uploadStatus && (
                  <p className="mt-3 text-xs text-slate-500">{uploadStatus}</p>
                )}
              </section>
              <section className="overflow-hidden border bg-white">
                <div className="border-b p-5">
                  <h3 className="font-semibold">Page asset library</h3>
                </div>
                <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
                  {assetList.map((asset) => (
                    <article className="bg-white p-4" key={asset.id}>
                      <div className="text-xs font-semibold">{asset.name}</div>
                      <div className="mt-1 text-[10px] uppercase text-slate-400">
                        {asset.type} · {Math.ceil(asset.size / 1024)} KB
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="text-xs font-semibold text-amber-800"
                          onClick={() =>
                            navigator.clipboard.writeText(asset.url)
                          }
                          type="button"
                        >
                          Copy URL
                        </button>
                        <a
                          className="text-xs font-semibold text-slate-500"
                          href={asset.url}
                          target="_blank"
                        >
                          Open
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === "ai" && (
            <AiPanel
              aiBusy={aiBusy}
              aiMode={aiMode}
              messages={messages}
              onAsk={askAi}
              prompt={prompt}
              setAiMode={setAiMode}
              setPrompt={setPrompt}
            />
          )}

          {tab === "automations" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <section className="overflow-hidden border bg-white">
                <div className="border-b p-5">
                  <div className="flex items-center gap-2 font-semibold">
                    <Workflow size={17} />
                    Site-aware automations
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Current workflows that can react to forms, bookings,
                    payments, and customer portal activity.
                  </p>
                </div>
                <div className="divide-y">
                  {automations.map((automation) => (
                    <div
                      className="flex items-center justify-between p-4"
                      key={automation.id}
                    >
                      <div>
                        <strong className="text-sm">{automation.name}</strong>
                        <p className="mt-1 text-xs text-slate-500">
                          {automation.trigger}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${automation.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {automation.active ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="border bg-white p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="text-amber-700" size={17} />
                  Design an automation
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Switch Kira to automation mode. It will use the
                  current site structure and available business events.
                </p>
                <button
                  className="ck-button mt-4 w-full"
                  onClick={() => {
                    setAiMode("automation");
                    setTab("ai");
                    setPrompt(
                      "Design an automation for this website that improves customer response and follow-through.",
                    );
                  }}
                  type="button"
                >
                  <Play size={14} />
                  Open automation copilot
                </button>
                {suggestedAutomation && (
                  <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-[11px] text-emerald-300">
                    {JSON.stringify(suggestedAutomation, null, 2)}
                  </pre>
                )}
              </section>
            </div>
          )}
            </section>
          </main>
          <aside className="border-l bg-white">
            <div className="border-b p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Inspector
              </div>
              <div className="mt-1 text-sm font-semibold">Page context</div>
            </div>
            <div className="space-y-5 p-4 text-sm">
              <dl className="grid gap-3 text-xs">
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Hostname</dt>
                  <dd className="mt-1 break-all text-slate-900">{String(website.hostname)}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Runtime</dt>
                  <dd className="mt-1 text-slate-900">{edgeMirrored ? "Cloudflare edge mirror" : "Database live"}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Last publish</dt>
                  <dd className="mt-1 text-slate-900">{String(deployment.createdAt ?? website.publishedAt ?? "Not published")}</dd>
                </div>
              </dl>
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-slate-700">Requested data access</div>
                <div className="mt-3 max-h-72 overflow-y-auto divide-y border">
                  {siteScopes.map(([scope, label]) => (
                    <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" key={scope}>
                      <span>{label}</span>
                      <span className={grantedScopes.has(scope) ? "font-bold text-emerald-700" : "text-slate-400"}>
                        {grantedScopes.has(scope) ? "Approved" : "No"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                className="inline-flex text-xs font-semibold text-amber-800"
                href={liveUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open live site
              </a>
            </div>
          </aside>
        </div>
      </div>
    </form>
  );
}

function WorkspaceTable({
  columns,
  rows,
  title,
}: {
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
  title: string;
}) {
  return (
    <div className="overflow-hidden border bg-white">
      <div className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="border-b px-4 py-3 font-bold" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <tr className="bg-white" key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td className="max-w-[360px] px-4 py-3 align-top text-slate-700" key={cellIndex}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={columns.length}>
                  No records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <textarea
        className="mt-2 min-h-44 w-full rounded-lg border bg-slate-950 p-4 font-mono text-xs leading-5 text-emerald-200 outline-none focus:border-amber-500"
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        value={value}
      />
    </label>
  );
}

function AiPanel({
  messages,
  prompt,
  setPrompt,
  aiMode,
  setAiMode,
  aiBusy,
  onAsk,
}: {
  messages: Message[];
  prompt: string;
  setPrompt: (value: string) => void;
  aiMode: "chat" | "generate-page" | "automation";
  setAiMode: (value: "chat" | "generate-page" | "automation") => void;
  aiBusy: boolean;
  onAsk: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <section className="overflow-hidden border bg-white">
        <div className="border-b p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="text-amber-700" size={18} />
            Kira website sandbox
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Build or revise draft pages in an isolated canvas, then publish only
            after review.
          </p>
        </div>
        <div className="max-h-[560px] space-y-3 overflow-y-auto bg-[#f8f5ef] p-5">
          {messages.map((message, index) => (
            <div
              className={`max-w-[85%] rounded-xl p-4 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-slate-950 text-white" : "border bg-white text-slate-700"}`}
              key={index}
            >
              <MarkdownMessage content={message.content} />
            </div>
          ))}
          {aiBusy && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={15} />
              Reviewing the live site context...
            </div>
          )}
        </div>
        <div className="border-t p-4">
          <textarea
            className="ck-input min-h-28 py-3"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Build a high-converting service page, redesign the hero, generate sandboxed code, or design a follow-up workflow..."
            value={prompt}
          />
          <button
            className="ck-button mt-3"
            disabled={aiBusy || !prompt.trim()}
            onClick={onAsk}
            type="button"
          >
            <Send size={14} />
            Run Kira
          </button>
        </div>
      </section>
      <aside className="h-fit border bg-white p-5">
        <div className="text-xs font-semibold">Expert mode</div>
        <div className="mt-3 grid gap-2">
          {(
            [
              ["chat", "Review and advise"],
              ["generate-page", "Generate sandbox draft"],
              ["automation", "Design automation"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={`rounded-lg border p-3 text-left text-xs font-semibold ${aiMode === value ? "border-amber-500 bg-amber-50" : ""}`}
              key={value}
              onClick={() => setAiMode(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Kira applies generated page sections and code to this draft canvas.
          Nothing becomes public until you press Save draft or Publish.
        </p>
      </aside>
    </div>
  );
}
