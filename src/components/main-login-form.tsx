"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Building2, LoaderCircle } from "lucide-react";

export function MainLoginForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/tenants/resolve-by-code?code=${encodeURIComponent(code)}`);
    const result = await response.json() as { ok: boolean; tenant?: { slug: string }; error?: string };
    if (result.ok && result.tenant) return window.location.assign(`/c/${result.tenant.slug}/login`);
    setError(result.error ?? "Unknown company code.");
    setLoading(false);
  }
  return <form className="mt-8" onSubmit={submit}>
    <label className="text-xs font-bold uppercase tracking-[.14em] text-slate-600">Company code</label>
    <div className="relative mt-2"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input autoCapitalize="characters" autoFocus className="ck-input !min-h-12 !pl-10 uppercase tracking-[.12em]" onChange={(event) => setCode(event.target.value)} placeholder="Enter your company code" required value={code}/></div>
    <button className="ck-button mt-4 w-full !min-h-12" disabled={loading} type="submit">{loading ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowRight size={17}/>}Continue securely</button>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
    <p className="mt-5 text-xs leading-5 text-slate-500">Your company code selects the workspace. It is not a password and never grants access by itself.</p>
  </form>;
}
