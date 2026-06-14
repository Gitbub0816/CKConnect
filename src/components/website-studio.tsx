"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  Braces,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  LoaderCircle,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { saveWebsitePage } from "@/app/app/[organizationSlug]/actions";

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
type Message = { role: "user" | "assistant"; content: string };
type Value = Record<string, unknown>;

const blockOptions = [
  "hero",
  "content",
  "services",
  "testimonial",
  "cta",
  "payment",
  "booking",
  "form",
  "portal",
];

export function WebsiteStudio({
  organizationSlug,
  website,
  page,
  assets,
  automations,
}: {
  organizationSlug: string;
  website: Value;
  page: Value;
  assets: Asset[];
  automations: Automation[];
}) {
  const content = (page.content as Value | undefined) ?? {};
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
  const [blocks, setBlocks] = useState(() =>
    initialBlocks.map((block, index) => ({
      ...block,
      _id: block._id ?? `${String(page.id)}-${index}`,
    })),
  );
  const [code, setCode] = useState(initialCode);
  const [tab, setTab] = useState<
    "design" | "code" | "assets" | "ai" | "automations"
  >("design");
  const [dragged, setDragged] = useState<number | null>(null);
  const [assetList, setAssetList] = useState(assets);
  const [uploadStatus, setUploadStatus] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I know this site, its pages, available business data, and enabled automations. Ask for a page, conversion review, code, or workflow.",
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

  const update = (index: number, key: keyof SiteBlock, value: string) =>
    setBlocks((current) =>
      current.map((block, position) =>
        position === index ? { ...block, [key]: value } : block,
      ),
    );

  const dropAt = (target: number) => {
    if (dragged === null || dragged === target) return;
    setBlocks((current) => {
      const next = [...current];
      const [moving] = next.splice(dragged, 1);
      next.splice(target, 0, moving);
      return next;
    });
    setDragged(null);
  };

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
      <div className="grid gap-4 2xl:grid-cols-[320px_1fr]">
        <section className="ck-card h-fit p-5">
          <div className="flex items-center gap-2 font-semibold">
            <LayoutTemplate className="text-[#9b7420]" size={18} />
            Page settings
          </div>
          <div className="mt-5 grid gap-4">
            <label className="text-xs font-semibold text-slate-600">
              Page title
              <input
                className="ck-input mt-2"
                defaultValue={String(page.title)}
                name="title"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Path
              <input
                className="ck-input mt-2"
                defaultValue={String(page.path)}
                name="path"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              SEO title
              <input
                className="ck-input mt-2"
                defaultValue={String((page.seo as Value)?.title ?? page.title)}
                name="seoTitle"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              SEO description
              <textarea
                className="ck-input mt-2 min-h-20 py-3"
                defaultValue={String((page.seo as Value)?.description ?? "")}
                name="seoDescription"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              className="ck-button ck-button-secondary flex-1"
              type="submit"
            >
              Save draft
            </button>
            <button
              className="ck-button flex-1"
              name="publish"
              type="submit"
              value="on"
            >
              Publish
            </button>
          </div>
          <div className="mt-5 rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            <strong className="text-white">{String(website.hostname)}</strong>
            <br />
            Custom code runs in a sandboxed frame without same-origin access.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">
            {(
              [
                ["design", LayoutTemplate, "Visual canvas"],
                ["code", Braces, "Code canvas"],
                ["assets", ImagePlus, "Files & assets"],
                ["ai", Bot, "AI site expert"],
                ["automations", Workflow, "AI automations"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${tab === value ? "bg-slate-950 text-white" : "hover:bg-slate-100"}`}
                key={value}
                onClick={() => setTab(value)}
                type="button"
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === "design" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <div className="ck-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="ck-eyebrow">Drag and drop</div>
                    <h3 className="mt-2 font-semibold">Page structure</h3>
                  </div>
                  <button
                    className="ck-button ck-button-secondary"
                    onClick={() =>
                      setBlocks((current) => [
                        ...current,
                        {
                          _id: crypto.randomUUID(),
                          type: "content",
                          title: "New section",
                          body: "Write the section content.",
                          action: "Learn more",
                        },
                      ])
                    }
                    type="button"
                  >
                    <Plus size={14} />
                    Add section
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {blocks.map((block, index) => (
                    <article
                      className="rounded-lg border bg-slate-50 p-4"
                      draggable
                      key={block._id}
                      onDragEnd={() => setDragged(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDragged(index)}
                      onDrop={() => dropAt(index)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical
                          className="cursor-grab text-slate-400"
                          size={18}
                        />
                        <select
                          className="ck-input !w-auto"
                          onChange={(event) =>
                            update(index, "type", event.target.value)
                          }
                          value={block.type}
                        >
                          {blockOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <button
                          aria-label="Remove section"
                          className="ml-auto text-red-600"
                          onClick={() =>
                            setBlocks((current) =>
                              current.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <input
                        className="ck-input mt-3"
                        onChange={(event) =>
                          update(index, "title", event.target.value)
                        }
                        value={block.title}
                      />
                      <textarea
                        className="ck-input mt-3 min-h-20 py-3"
                        onChange={(event) =>
                          update(index, "body", event.target.value)
                        }
                        value={block.body}
                      />
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <input
                          className="ck-input"
                          onChange={(event) =>
                            update(index, "action", event.target.value)
                          }
                          placeholder="Button label"
                          value={block.action ?? ""}
                        />
                        <input
                          className="ck-input"
                          onChange={(event) =>
                            update(index, "imageUrl", event.target.value)
                          }
                          placeholder="Asset or image URL"
                          value={block.imageUrl ?? ""}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <VisualPreview blocks={blocks} />
            </div>
          )}

          {tab === "code" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="ck-card p-5">
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
              <section className="ck-card overflow-hidden">
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
              <section className="ck-card h-fit p-5">
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
              <section className="ck-card overflow-hidden">
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
              <section className="ck-card overflow-hidden">
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
              <section className="ck-card p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="text-amber-700" size={17} />
                  Design an automation
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Switch the AI site expert to automation mode. It will use the
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
      </div>
    </form>
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

function VisualPreview({ blocks }: { blocks: SiteBlock[] }) {
  return (
    <div className="ck-card h-fit overflow-hidden">
      <div className="border-b p-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        Responsive visual preview
      </div>
      <div className="bg-slate-100 p-5">
        <div className="mx-auto overflow-hidden rounded-xl bg-white shadow-xl">
          {blocks.map((block, index) => (
            <section
              className={`${block.type === "hero" ? "bg-slate-900 px-10 py-20 text-white" : "border-t px-10 py-12"}`}
              key={index}
            >
              {block.imageUrl && (
                <div
                  aria-label=""
                  className="mb-5 h-48 w-full rounded-lg bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url("${block.imageUrl}")` }}
                />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                {block.type}
              </span>
              <h2 className="mt-3 text-3xl font-semibold">{block.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70">
                {block.body}
              </p>
              {block.action && (
                <span className="mt-5 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950">
                  {block.action}
                </span>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
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
      <section className="ck-card overflow-hidden">
        <div className="border-b p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="text-amber-700" size={18} />
            OpenAI site expert
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tenant-aware guidance with persisted conversation history and
            audited model calls.
          </p>
        </div>
        <div className="max-h-[560px] space-y-3 overflow-y-auto bg-[#f8f5ef] p-5">
          {messages.map((message, index) => (
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-4 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-slate-950 text-white" : "border bg-white"}`}
              key={index}
            >
              {message.content}
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
            placeholder="Build a high-converting service page, audit accessibility, generate code, or design a follow-up workflow..."
            value={prompt}
          />
          <button
            className="ck-button mt-3"
            disabled={aiBusy || !prompt.trim()}
            onClick={onAsk}
            type="button"
          >
            <Send size={14} />
            Ask site expert
          </button>
        </div>
      </section>
      <aside className="ck-card h-fit p-5">
        <div className="text-xs font-semibold">Expert mode</div>
        <div className="mt-3 grid gap-2">
          {(
            [
              ["chat", "Review and advise"],
              ["generate-page", "Generate and apply page"],
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
          Generated page and code suggestions apply to the draft canvas. They
          are not public until Save or Publish is selected.
        </p>
      </aside>
    </div>
  );
}
