"use client";

import "grapesjs/dist/css/grapes.min.css";

import { useEffect, useRef } from "react";
import grapesjs, { type Editor } from "grapesjs";

type GrapesProject = Record<string, unknown>;

const clearKeyBlocks = [
  {
    id: "ck-lead-form",
    label: "Lead capture",
    category: "ClearKey",
    content:
      '<section data-ck-block="lead-capture" data-ck-scopes="customers.write_leads forms.write_submissions" class="ck-site-block"><h2>Request a quote</h2><p>Tell us what you need and our team will follow up.</p><form><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="How can we help?"></textarea><button type="submit">Send request</button></form></section>',
  },
  {
    id: "ck-booking",
    label: "Booking request",
    category: "ClearKey",
    content:
      '<section data-ck-block="booking" data-ck-scopes="booking.write_requests services.read" class="ck-site-block"><h2>Book an appointment</h2><p>Let customers request time with your team.</p><a href="#contact">Request a time</a></section>',
  },
  {
    id: "ck-services",
    label: "Services list",
    category: "ClearKey",
    content:
      '<section data-ck-block="services" data-ck-scopes="services.read pricing.read" class="ck-site-block"><h2>Services</h2><div><article><h3>Featured service</h3><p>Describe a public-safe service from your catalog.</p></article></div></section>',
  },
  {
    id: "ck-inventory",
    label: "Inventory list",
    category: "ClearKey",
    content:
      '<section data-ck-block="inventory" data-ck-scopes="inventory.read pricing.read" class="ck-site-block"><h2>Available products</h2><p>Display public-safe inventory fields only.</p></section>',
  },
  {
    id: "ck-payment",
    label: "Payment button",
    category: "ClearKey",
    content:
      '<section data-ck-block="payment" data-ck-scopes="payments.create_checkout" class="ck-site-block"><h2>Pay securely</h2><p>Send customers into a protected checkout flow.</p><a href="#contact">Request payment link</a></section>',
  },
  {
    id: "ck-portal",
    label: "Portal login",
    category: "ClearKey",
    content:
      '<section data-ck-block="portal" data-ck-scopes="portal.create_login_link" class="ck-site-block"><h2>Customer portal</h2><p>Create a customer-safe portal login link.</p><a href="#contact">Request portal access</a></section>',
  },
];

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
        upload: false,
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

    clearKeyBlocks.forEach((block) => {
      editor.BlockManager.add(block.id, {
        category: block.category,
        content: block.content,
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
