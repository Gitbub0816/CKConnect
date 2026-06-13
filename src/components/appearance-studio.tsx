"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, CopyPlus, Eye, Palette, Trash2 } from "lucide-react";
import { publishAppearance } from "@/app/app/[organizationSlug]/actions";

type Theme = {
  primaryColor: string; accentColor: string; surfaceColor: string; backgroundColor: string; textColor: string;
  headingFont: string; bodyFont: string; borderRadius: number; density: string; darkMode: boolean;
  logoUrl: string | null; coverImageUrl: string | null; portalHeadline: string | null; portalSubhead: string | null;
};
type Block = { type: string; id?: string; eyebrow?: string; title?: string; body?: string; quote?: string; attribution?: string; action?: string; primaryAction?: string; secondaryAction?: string; layout?: string; items?: Array<Record<string, string>>; steps?: Array<Record<string, string>> };
type NavItem = { label: string; href: string };

const blockTypes = ["hero", "serviceGrid", "stats", "portfolio", "process", "testimonial", "team", "resourceLinks", "cta"];
const presets = [
  ["ClearKey Gold", "#c9a033", "#504a44", "#f5f0e8", "#1c1917"],
  ["Warm Copper", "#c56a2d", "#183a37", "#f7f1e8", "#172321"],
  ["Creative Coral", "#e55d47", "#7c5cff", "#fff7f2", "#251c2b"],
  ["Coastal Teal", "#2f7f78", "#d7a852", "#edf7f5", "#153733"],
  ["Modern Ink", "#111827", "#8b5cf6", "#f3f4f6", "#111827"],
] as const;

export function AppearanceStudio({
  organizationSlug,
  initialTheme,
  initialBlocks,
  initialNavigation,
}: {
  organizationSlug: string;
  initialTheme: Theme;
  initialBlocks: Block[];
  initialNavigation: NavItem[];
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [navigation, setNavigation] = useState(initialNavigation);
  const [selected, setSelected] = useState(0);
  const block = blocks[selected];
  const updateTheme = (key: keyof Theme, value: string | number | boolean) => setTheme((current) => ({ ...current, [key]: value }));
  const updateBlock = (key: keyof Block, value: string) => setBlocks((current) => current.map((item, index) => index === selected ? { ...item, [key]: value } : item));
  const move = (direction: -1 | 1) => {
    const target = selected + direction;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((current) => { const next = [...current]; [next[selected], next[target]] = [next[target], next[selected]]; return next; });
    setSelected(target);
  };
  const remove = () => {
    if (blocks.length === 1) return;
    setBlocks((current) => current.filter((_, index) => index !== selected));
    setSelected(Math.max(0, selected - 1));
  };
  const add = (type: string) => {
    const next: Block = type === "hero" ? { type, eyebrow: "Your promise", title: "A clear, confident headline.", body: "Explain what makes this organization useful and distinct.", primaryAction: "Get started", layout: "split" }
      : type === "cta" ? { type, title: "Ready to begin?", body: "Give visitors one clear next action.", action: "Contact us" }
      : { type, title: `New ${type.replace(/([A-Z])/g, " $1").toLowerCase()} section`, body: "Edit this section's content.", items: [] };
    setBlocks((current) => [...current, next]);
    setSelected(blocks.length);
  };

  return (
    <form action={publishAppearance} className="p-5 lg:p-7">
      <input name="organizationSlug" type="hidden" value={organizationSlug}/>
      <input name="navigationJson" type="hidden" value={JSON.stringify(navigation)}/>
      <input name="blocksJson" type="hidden" value={JSON.stringify(blocks)}/>
      <input name="darkMode" type="hidden" value={String(theme.darkMode)}/>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="ck-eyebrow">Endpoint composer</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Appearance & pages</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Own every visual token, navigation item, section, message, order, and public endpoint version.</p></div>
        <div className="flex gap-2"><a className="ck-button ck-button-secondary" href={`/p/${organizationSlug}`} target="_blank"><Eye size={15}/>Open published page</a><button className="ck-button !min-h-11" type="submit"><Check size={15}/>Publish new version</button></div>
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-[330px_360px_1fr]">
        <section className="ck-card overflow-hidden">
          <div className="border-b p-5"><div className="flex items-center gap-2 font-semibold"><Palette size={17}/>Brand system</div><p className="mt-1 text-xs leading-5 text-slate-500">These tokens apply across every public block.</p></div>
          <div className="space-y-5 p-5">
            <div><label className="text-xs font-semibold text-slate-600">Presets</label><div className="mt-2 grid gap-2">{presets.map(([name, primary, accent, background, text]) => <button className="flex items-center justify-between rounded-lg border p-3 text-left" key={name} onClick={() => setTheme((current) => ({ ...current, primaryColor: primary, accentColor: accent, backgroundColor: background, textColor: text }))} type="button"><span className="text-xs font-semibold">{name}</span><span className="flex gap-1">{[primary, accent, background].map((color) => <i className="size-4 rounded-full border" key={color} style={{ background: color }}/>)}</span></button>)}</div></div>
            {(["primaryColor","accentColor","backgroundColor","surfaceColor","textColor"] as const).map((key) => <label className="grid grid-cols-[1fr_44px] items-center gap-3 text-xs font-semibold capitalize text-slate-600" key={key}>{key.replace("Color","")}<input className="h-9 w-11 cursor-pointer rounded border bg-white p-1" name={key} onChange={(event) => updateTheme(key,event.target.value)} type="color" value={theme[key]}/></label>)}
            <label className="block text-xs font-semibold text-slate-600">Heading font<select className="ck-input mt-2" name="headingFont" onChange={(event) => updateTheme("headingFont",event.target.value)} value={theme.headingFont}><option>Cormorant Garamond</option><option>Geist</option><option>Manrope</option><option>Inter</option><option>Georgia</option></select></label>
            <label className="block text-xs font-semibold text-slate-600">Body font<select className="ck-input mt-2" name="bodyFont" onChange={(event) => updateTheme("bodyFont",event.target.value)} value={theme.bodyFont}><option>Geist</option><option>Inter</option><option>Manrope</option><option>Arial</option></select></label>
            <label className="block text-xs font-semibold text-slate-600">Logo URL<input className="ck-input mt-2" name="logoUrl" onChange={(event) => updateTheme("logoUrl",event.target.value)} value={theme.logoUrl ?? ""}/></label>
            <label className="block text-xs font-semibold text-slate-600">Cover image URL<input className="ck-input mt-2" name="coverImageUrl" onChange={(event) => updateTheme("coverImageUrl",event.target.value)} value={theme.coverImageUrl ?? ""}/></label>
            <label className="block text-xs font-semibold text-slate-600">Radius: {theme.borderRadius}px<input className="mt-3 w-full accent-amber-600" max="40" min="0" name="borderRadius" onChange={(event) => updateTheme("borderRadius",Number(event.target.value))} type="range" value={theme.borderRadius}/></label>
            <label className="block text-xs font-semibold text-slate-600">Density<select className="ck-input mt-2" name="density" onChange={(event) => updateTheme("density",event.target.value)} value={theme.density}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
            <button className={`w-full rounded-lg border p-3 text-left text-xs font-semibold ${theme.darkMode ? "bg-slate-900 text-white" : ""}`} onClick={() => updateTheme("darkMode",!theme.darkMode)} type="button">Dark mode {theme.darkMode ? "enabled" : "disabled"}</button>
          </div>
        </section>

        <section className="ck-card overflow-hidden">
          <div className="border-b p-5"><div className="font-semibold">Page structure</div><p className="mt-1 text-xs text-slate-500">Add, edit, reorder, or remove blocks.</p></div>
          <div className="p-4">
            <div className="space-y-2">{blocks.map((item,index) => <button className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${selected === index ? "border-amber-500 bg-amber-50" : ""}`} key={`${item.type}-${index}`} onClick={() => setSelected(index)} type="button"><span><strong className="block text-xs uppercase tracking-wide">{item.type.replace(/([A-Z])/g," $1")}</strong><small className="mt-1 block max-w-56 truncate text-slate-500">{item.title ?? item.quote ?? "Content block"}</small></span><span className="text-xs text-slate-400">0{index+1}</span></button>)}</div>
            <div className="mt-3 grid grid-cols-3 gap-2"><button className="ck-button ck-button-secondary" onClick={() => move(-1)} type="button"><ArrowUp size={14}/></button><button className="ck-button ck-button-secondary" onClick={() => move(1)} type="button"><ArrowDown size={14}/></button><button className="ck-button ck-button-secondary !text-red-600" onClick={remove} type="button"><Trash2 size={14}/></button></div>
            <div className="mt-6 border-t pt-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><CopyPlus size={14}/>Add block</div><div className="flex flex-wrap gap-1.5">{blockTypes.map((type) => <button className="rounded border bg-slate-50 px-2 py-1.5 text-[10px] font-semibold uppercase" key={type} onClick={() => add(type)} type="button">{type.replace(/([A-Z])/g," $1")}</button>)}</div></div>
            <div className="mt-6 border-t pt-4"><div className="text-xs font-semibold">Navigation</div>{navigation.map((item,index) => <div className="mt-2 grid grid-cols-2 gap-2" key={index}><input className="ck-input" onChange={(event) => setNavigation((current) => current.map((nav,i) => i === index ? {...nav,label:event.target.value}:nav))} value={item.label}/><input className="ck-input" onChange={(event) => setNavigation((current) => current.map((nav,i) => i === index ? {...nav,href:event.target.value}:nav))} value={item.href}/></div>)}<button className="mt-2 text-xs font-semibold text-amber-800" onClick={() => setNavigation((current) => [...current,{label:"New link",href:"#section"}])} type="button">+ Add navigation item</button></div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="ck-card p-5">
            <div className="font-semibold">Selected block content</div>
            {block ? <div className="mt-4 grid gap-4">
              {["eyebrow","title","body","quote","attribution","primaryAction","secondaryAction","action"].map((key) => (key in block || ["title","body"].includes(key)) && <label className="text-xs font-semibold capitalize text-slate-600" key={key}>{key.replace(/([A-Z])/g," $1")} {["body","quote"].includes(key) ? <textarea className="ck-input mt-2 min-h-24 py-3" onChange={(event) => updateBlock(key as keyof Block,event.target.value)} value={String(block[key as keyof Block] ?? "")}/> : <input className="ck-input mt-2" onChange={(event) => updateBlock(key as keyof Block,event.target.value)} value={String(block[key as keyof Block] ?? "")}/>}</label>)}
              {block.type === "hero" && <label className="text-xs font-semibold text-slate-600">Hero layout<select className="ck-input mt-2" onChange={(event) => updateBlock("layout",event.target.value)} value={block.layout ?? "split"}><option value="split">Split</option><option value="editorial">Editorial</option><option value="calm">Calm</option></select></label>}
            </div> : null}
          </div>
          <div className="ck-card overflow-hidden">
            <div className="border-b p-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Live composition preview</div>
            <div className="p-5" style={{ background: theme.backgroundColor }}>
              <div className="mx-auto min-h-[620px] max-w-4xl overflow-hidden border shadow-xl" style={{ background: theme.surfaceColor, color: theme.textColor, borderRadius: theme.borderRadius }}>
                <div className="flex items-center justify-between border-b px-6 py-4"><div className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center text-white" style={{ background: theme.primaryColor, borderRadius: Math.max(2,theme.borderRadius-6) }}>ID</span>{organizationSlug.replaceAll("-"," ")}</div><div className="flex gap-4 text-[10px] font-bold uppercase">{navigation.slice(0,4).map((item) => <span key={item.label}>{item.label}</span>)}</div></div>
                <div className="px-8 py-16 text-center"><div className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: theme.primaryColor }}>{blocks[0]?.eyebrow ?? "Your promise"}</div><h2 className="mx-auto mt-4 max-w-2xl text-5xl font-semibold leading-none" style={{ fontFamily: theme.headingFont }}>{blocks[0]?.title ?? theme.portalHeadline}</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-6 opacity-60">{blocks[0]?.body ?? theme.portalSubhead}</p><button className="mt-7 px-5 py-3 text-sm font-semibold text-white" style={{ background: theme.primaryColor, borderRadius: Math.max(2,theme.borderRadius-5) }}>{blocks[0]?.primaryAction ?? "Get started"}</button></div>
                <div className="grid grid-cols-3 gap-px bg-slate-200">{blocks.slice(1,4).map((item,index) => <div className="min-h-40 p-5" key={index} style={{background:theme.surfaceColor}}><div className="text-[9px] font-bold uppercase" style={{color:theme.primaryColor}}>{item.type}</div><div className="mt-8 font-semibold" style={{fontFamily:theme.headingFont}}>{item.title ?? item.quote}</div></div>)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <input name="portalHeadline" type="hidden" value={theme.portalHeadline ?? blocks[0]?.title ?? ""}/>
      <input name="portalSubhead" type="hidden" value={theme.portalSubhead ?? blocks[0]?.body ?? ""}/>
    </form>
  );
}
