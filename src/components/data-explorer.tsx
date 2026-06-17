"use client";

import { useEffect, useMemo, useState } from "react";
import { BookmarkPlus, Filter, Search, Trash2, X } from "lucide-react";

const detailRouteModules = new Set(["contacts", "leads", "deals", "accounts", "invoices"]);

type RecordValue = Record<string, unknown>;
type SavedView = { id: string; name: string; query: string; field: string; value: string };

function readable(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replaceAll("_", " ");
}

export function DataExplorer({ module, records, organizationSlug }: { module: string; records: RecordValue[]; organizationSlug?: string }) {
  const storageKey = `ckconnect.views.${module}`;
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [viewName, setViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const columns = useMemo(() => records[0] ? Object.keys(records[0]).filter((key) => !["id","transactions","detail","recordHash"].includes(key)).slice(0,8) : [], [records]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setSavedViews(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as SavedView[]);
      } catch {
        setSavedViews([]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  const filtered = useMemo(() => records.filter((record) => {
    const searchMatch = !query || Object.values(record).some((value) => readable(value).toLowerCase().includes(query.toLowerCase()));
    const fieldMatch = field === "all" || !filterValue || readable(record[field]).toLowerCase().includes(filterValue.toLowerCase());
    return searchMatch && fieldMatch;
  }), [records, query, field, filterValue]);

  const saveView = () => {
    if (!viewName.trim()) return;
    const next = [...savedViews, { id: crypto.randomUUID(), name: viewName.trim(), query, field, value: filterValue }];
    setSavedViews(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setViewName("");
  };
  const removeView = (id: string) => {
    const next = savedViews.filter((view) => view.id !== id);
    setSavedViews(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return <section className="ck-card overflow-hidden">
    <div className="flex flex-wrap items-center gap-3 border-b p-4">
      <label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input className="ck-input !pl-9" onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${module.replaceAll("-"," ")}...`} value={query}/></label>
      <button className={`ck-button ck-button-secondary ${showFilters ? "!border-amber-500" : ""}`} onClick={() => setShowFilters((value) => !value)} type="button"><Filter size={14}/>Filter</button>
      <button className={`ck-button ck-button-secondary ${showViews ? "!border-amber-500" : ""}`} onClick={() => setShowViews((value) => !value)} type="button"><BookmarkPlus size={14}/>Saved views</button>
      {(query || filterValue) && <button aria-label="Clear filters" className="grid size-9 place-items-center rounded border" onClick={() => { setQuery(""); setField("all"); setFilterValue(""); }} type="button"><X size={14}/></button>}
    </div>
    {showFilters && <div className="grid gap-3 border-b bg-[#f8f5ef] p-4 sm:grid-cols-2"><label className="text-xs font-semibold">Field<select className="ck-input mt-2" onChange={(event) => setField(event.target.value)} value={field}><option value="all">All fields</option>{columns.map((column) => <option key={column} value={column}>{column.replaceAll(/([A-Z])/g," $1")}</option>)}</select></label><label className="text-xs font-semibold">Contains<input className="ck-input mt-2" onChange={(event) => setFilterValue(event.target.value)} value={filterValue}/></label></div>}
    {showViews && <div className="border-b bg-[#f8f5ef] p-4"><div className="flex flex-wrap gap-2"><input className="ck-input max-w-xs" onChange={(event) => setViewName(event.target.value)} placeholder="Name this view" value={viewName}/><button className="ck-button" onClick={saveView} type="button">Save current view</button></div><div className="mt-3 flex flex-wrap gap-2">{savedViews.map((view) => <div className="flex items-center rounded border bg-white" key={view.id}><button className="px-3 py-2 text-xs font-semibold" onClick={() => { setQuery(view.query); setField(view.field); setFilterValue(view.value); }} type="button">{view.name}</button><button aria-label={`Delete ${view.name}`} className="border-l p-2 text-red-600" onClick={() => removeView(view.id)} type="button"><Trash2 size={13}/></button></div>)}{!savedViews.length && <span className="text-xs text-slate-500">No saved views yet.</span>}</div></div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-[#f8f5ef] text-[10px] uppercase tracking-[.12em] text-slate-500"><tr>{columns.map((column) => <th className="border-b px-4 py-3 font-bold" key={column}>{column.replaceAll(/([A-Z])/g," $1")}</th>)}</tr></thead><tbody>{filtered.map((record,index) => {
      const detailHref = organizationSlug && detailRouteModules.has(module) && record.id ? `/app/${organizationSlug}/${module}/${String(record.id)}` : null;
      return <tr className="cursor-pointer transition hover:bg-amber-50/45" key={String(record.id ?? index)} onClick={detailHref ? () => { window.location.href = detailHref; } : undefined}>{columns.map((column,position) => <td className={`border-b px-4 py-4 ${position === 0 ? "font-semibold text-[#755714]" : ""}`} key={column}>{position === 0 && detailHref ? <a className="hover:underline" href={detailHref}>{readable(record[column])}</a> : readable(record[column])}</td>)}</tr>;
    })}</tbody></table>{!filtered.length && <div className="p-12 text-center text-sm text-slate-500">No records match this view.</div>}</div>
    <div className="border-t px-4 py-3 text-xs text-slate-500">{filtered.length} of {records.length} records</div>
  </section>;
}
