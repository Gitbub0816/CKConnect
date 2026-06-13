"use client";

import { useState } from "react";
import { Check, Globe2, Monitor, Palette, Smartphone } from "lucide-react";

const palettes = [
  ["ClearKey", "#1f6feb", "#14b8a6", "#f3f6fb"],
  ["Copper", "#a4492d", "#d69e5b", "#fbf7f2"],
  ["Evergreen", "#176b4d", "#8cb369", "#f2f7f3"],
  ["Midnight", "#635bff", "#22d3ee", "#0c1222"],
];

export function AppearanceStudio({ organizationSlug }: { organizationSlug: string }) {
  const [selected, setSelected] = useState(0);
  const [radius, setRadius] = useState(14);
  const [headline, setHeadline] = useState("Service that feels personal.");
  const palette = palettes[selected];

  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appearance studio</h1>
          <p className="mt-1 text-sm text-slate-500">Design every public client touchpoint from one theme system.</p>
        </div>
        <button className="ck-button"><Check size={15} />Publish theme</button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="ck-card p-5">
          <div className="flex items-center gap-2 font-semibold"><Palette size={17} />Brand system</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Applied to portals, forms, invoices, booking, payment, and hosted pages.</p>

          <label className="mt-6 block text-xs font-semibold text-slate-600">Theme palette</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {palettes.map(([name, primary, accent, background], index) => (
              <button
                className={`rounded-xl border p-3 text-left ${selected === index ? "border-blue-500 ring-2 ring-blue-100" : ""}`}
                key={name}
                onClick={() => setSelected(index)}
              >
                <div className="mb-3 flex gap-1.5">
                  {[primary, accent, background].map((color) => <span className="size-5 rounded-full border" key={color} style={{ background: color }} />)}
                </div>
                <span className="text-sm font-medium">{name}</span>
              </button>
            ))}
          </div>

          <label className="mt-6 block text-xs font-semibold text-slate-600">Portal headline</label>
          <input className="ck-input mt-2" onChange={(event) => setHeadline(event.target.value)} value={headline} />

          <label className="mt-6 flex justify-between text-xs font-semibold text-slate-600">
            <span>Corner radius</span><span>{radius}px</span>
          </label>
          <input className="mt-3 w-full accent-blue-600" max="24" min="0" onChange={(event) => setRadius(Number(event.target.value))} type="range" value={radius} />

          <div className="mt-6 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">Heading font<select className="ck-input mt-2"><option>Geist</option><option>Inter</option><option>Manrope</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Density<select className="ck-input mt-2"><option>Comfortable</option><option>Compact</option><option>Spacious</option></select></label>
          </div>
        </section>

        <section className="ck-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Monitor size={16} />Live endpoint preview</div>
            <div className="flex rounded-lg border p-1 text-slate-500"><Monitor className="rounded bg-slate-100 p-1" size={24} /><Smartphone className="p-1" size={24} /></div>
          </div>
          <div className="min-h-[620px] p-5 md:p-8" style={{ background: palette[3] }}>
            <div className="mx-auto max-w-4xl overflow-hidden border bg-white shadow-xl" style={{ borderRadius: radius }}>
              <nav className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3 font-semibold">
                  <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: palette[1] }}>HS</span>
                  Harbor Services
                </div>
                <div className="hidden gap-5 text-xs text-slate-500 sm:flex"><span>Services</span><span>About</span><span>Portal</span></div>
              </nav>
              <div className="grid gap-9 px-6 py-14 md:grid-cols-[1.1fr_.9fr] md:px-10">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: palette[1] }}>Welcome to our client hub</div>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight">{headline}</h2>
                  <p className="mt-4 text-sm leading-6 text-slate-500">Book appointments, review documents, pay invoices, and stay connected with our team.</p>
                  <div className="mt-7 flex gap-2">
                    <button className="ck-button" style={{ background: palette[1], borderRadius: Math.max(4, radius - 4) }}>Book a service</button>
                    <button className="ck-button ck-button-secondary" style={{ borderRadius: Math.max(4, radius - 4) }}>Client portal</button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {["Schedule an appointment", "Pay an invoice", "Send us a message"].map((item) => (
                    <div className="flex items-center gap-3 border bg-slate-50 p-4" key={item} style={{ borderRadius: Math.max(6, radius - 2) }}>
                      <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: palette[2] }}><Globe2 size={16} /></span>
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <footer className="border-t bg-slate-50 px-6 py-4 text-xs text-slate-500">
                Hosted securely by ClearKey Connect · /p/{organizationSlug}
              </footer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
