"use client";

import "grapesjs/dist/css/grapes.min.css";

import { useEffect, useRef } from "react";
import grapesjs, { type Editor } from "grapesjs";

type GrapesProject = Record<string, unknown>;

export type ClearKeySiteBlockDefinition = {
  type: string;
  label: string;
  category: string;
  requiredScopes: string[];
  description: string;
  defaultSettings: Record<string, string | boolean>;
  fallback: string;
};

export const clearKeySiteBlocks: ClearKeySiteBlockDefinition[] = [
  {
    type: "ck-lead-form",
    label: "Lead capture",
    category: "ClearKey",
    requiredScopes: ["customers.write_leads", "forms.write_submissions"],
    description: "Creates CRM leads and form-inbox submissions.",
    defaultSettings: { title: "Request a quote", submitLabel: "Send request" },
    fallback: "Lead capture requires approved CRM lead and form submission scopes.",
  },
  {
    type: "ck-booking",
    label: "Booking request",
    category: "ClearKey",
    requiredScopes: ["booking.read", "booking.write_requests", "services.read"],
    description: "Reads public availability and creates booking requests.",
    defaultSettings: { title: "Book an appointment", duration: "60" },
    fallback: "Booking is unavailable until booking scopes are approved.",
  },
  {
    type: "ck-services",
    label: "Services list",
    category: "ClearKey",
    requiredScopes: ["services.read", "pricing.read"],
    description: "Displays approved service catalog records and prices.",
    defaultSettings: { title: "Services", source: "public-services" },
    fallback: "Approve service and pricing scopes to render live services.",
  },
  {
    type: "ck-inventory",
    label: "Inventory list",
    category: "ClearKey",
    requiredScopes: ["inventory.read", "pricing.read"],
    description: "Displays selected public inventory with stock-safe fields.",
    defaultSettings: { title: "Available products", showQuantity: false },
    fallback: "Approve inventory and pricing scopes to render live products.",
  },
  {
    type: "ck-payment",
    label: "Payment button",
    category: "ClearKey",
    requiredScopes: ["payments.create_checkout"],
    description: "Creates server-side checkout links for selected invoices or offers.",
    defaultSettings: { title: "Pay securely", buttonLabel: "Continue to checkout" },
    fallback: "Checkout is unavailable until payment scope is approved.",
  },
  {
    type: "ck-portal",
    label: "Portal login",
    category: "ClearKey",
    requiredScopes: ["portal.create_login_link"],
    description: "Creates customer-safe portal login links.",
    defaultSettings: { title: "Customer portal", buttonLabel: "Open portal" },
    fallback: "Portal login is unavailable until portal link scope is approved.",
  },
  {
    type: "ck-chat",
    label: "Chat widget",
    category: "ClearKey",
    requiredScopes: ["chat.write_sessions", "chat.read_business_hours"],
    description: "Starts website chat sessions and respects handoff availability.",
    defaultSettings: { title: "Chat with us", handoff: true },
    fallback: "Chat is unavailable until website chat scopes are approved.",
  },
  {
    type: "ck-staff",
    label: "Staff/team",
    category: "ClearKey",
    requiredScopes: ["staff.read_public"],
    description: "Displays selected public team profiles.",
    defaultSettings: { title: "Meet the team" },
    fallback: "Approve public staff scope to render team profiles.",
  },
  {
    type: "ck-gallery",
    label: "Gallery",
    category: "ClearKey",
    requiredScopes: [],
    description: "Displays uploaded site assets from the tenant asset library.",
    defaultSettings: { title: "Gallery" },
    fallback: "Upload assets to use this block.",
  },
  {
    type: "ck-business-hours",
    label: "Business hours",
    category: "ClearKey",
    requiredScopes: ["business_profile.read"],
    description: "Displays public business profile and hours.",
    defaultSettings: { title: "Hours" },
    fallback: "Approve business profile scope to render hours.",
  },
  {
    type: "ck-location",
    label: "Location/map",
    category: "ClearKey",
    requiredScopes: ["locations.read"],
    description: "Displays public location and service-area records.",
    defaultSettings: { title: "Find us" },
    fallback: "Approve location scope to render map data.",
  },
];

function componentFor(block: ClearKeySiteBlockDefinition) {
  const scopes = block.requiredScopes.join(" ");
  return {
    attributes: {
      "data-ck-block": block.type,
      "data-ck-fallback": block.fallback,
      "data-ck-scopes": scopes,
      "data-ck-settings": JSON.stringify(block.defaultSettings),
    },
    components: [
      { tagName: "span", content: "ClearKey dynamic block" },
      { tagName: "h2", content: block.label },
      { tagName: "p", content: block.description },
      {
        attributes: { "data-ck-preview": "fallback" },
        tagName: "div",
        content: block.fallback,
      },
    ],
    tagName: "section",
    type: block.type,
  };
}

export function GrapesJsSiteEditor({
  initialCss,
  initialHtml,
  initialProject,
  onChange,
}: {
  initialCss: string;
  initialHtml: string;
  initialProject?: GrapesProject;
  onChange: (value: {
    css: string;
    html: string;
    project: GrapesProject;
  }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;
    const editor = grapesjs.init({
      assetManager: {
        custom: true,
      },
      blockManager: {
        appendTo: ".ck-grapes-blocks",
      },
      canvas: {
        styles: [],
      },
      container: containerRef.current,
      deviceManager: {
        devices: [
          { id: "desktop", name: "Desktop", width: "" },
          { id: "tablet", name: "Tablet", width: "768px" },
          { id: "mobile", name: "Mobile", width: "390px" },
        ],
      },
      fromElement: false,
      height: "760px",
      panels: { defaults: [] },
      selectorManager: { componentFirst: true },
      storageManager: false,
      style: initialCss,
      components:
        initialHtml ||
        '<section class="ck-site-hero"><h1>Your business, online</h1><p>Use ClearKey blocks to connect forms, booking, services, payments, and customer workflows.</p><a href="#contact">Get started</a></section>',
    });

    editor.Css.addRules(`
      body { font-family: Inter, system-ui, sans-serif; margin: 0; color: #111827; }
      section { padding: 72px 8vw; }
      .ck-site-hero { background: #111827; color: white; min-height: 520px; display: grid; align-content: center; }
      .ck-site-hero h1 { max-width: 760px; font-size: clamp(42px, 8vw, 82px); line-height: .95; margin: 0; }
      .ck-site-hero p { max-width: 620px; font-size: 18px; line-height: 1.7; color: rgba(255,255,255,.72); }
      a, button { display: inline-flex; border: 0; border-radius: 999px; background: #5B5FCF; color: white; padding: 12px 18px; font-weight: 700; text-decoration: none; }
      input, textarea { width: 100%; box-sizing: border-box; margin: 8px 0; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px; font: inherit; }
      .ck-site-block { border-top: 1px solid #e5e7eb; background: #fff; }
      .ck-site-block h2 { font-size: 34px; margin: 0 0 12px; }
      .ck-site-block p { max-width: 680px; line-height: 1.7; color: #4b5563; }
    `);

    clearKeySiteBlocks.forEach((block) => {
      editor.DomComponents.addType(block.type, {
        model: {
          defaults: {
            attributes: {
              "data-ck-block": block.type,
              "data-ck-scopes": block.requiredScopes.join(" "),
              "data-ck-settings": JSON.stringify(block.defaultSettings),
            },
            droppable: false,
            editable: false,
            traits: [
              {
                label: "Title",
                name: "title",
                type: "text",
              },
              {
                label: "Data source",
                name: "dataSource",
                type: "text",
              },
            ],
          },
        },
      });
      editor.BlockManager.add(block.type, {
        attributes: {
          title: `${block.label}: ${block.requiredScopes.length ? block.requiredScopes.join(", ") : "No data scope required"}`,
        },
        category: block.category,
        content: componentFor(block),
        label: block.label,
      });
    });

    if (initialProject && Object.keys(initialProject).length) {
      editor.loadProjectData(initialProject);
    }

    const emit = () => {
      onChange({
        css: editor.getCss() ?? "",
        html: editor.getHtml() ?? "",
        project: editor.getProjectData() as GrapesProject,
      });
    };
    editor.on("component:update component:add component:remove style:update", emit);
    emit();
    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [initialCss, initialHtml, initialProject, onChange]);

  return (
    <div className="grid min-h-[760px] overflow-hidden rounded-xl border bg-white lg:grid-cols-[230px_1fr]">
      <aside className="ck-grapes-blocks min-h-0 overflow-y-auto border-r bg-slate-50 p-3" />
      <div ref={containerRef} />
    </div>
  );
}
