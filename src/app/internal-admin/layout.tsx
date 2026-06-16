export const dynamic = "force-dynamic";

import Link from "next/link";
import { Activity, Building2, Headphones, ScrollText, ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/admin-authorization";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  return <div className="grid min-h-screen bg-slate-950 text-slate-100 lg:grid-cols-[250px_1fr]">
    <aside className="border-r border-white/10 bg-black/30 p-5"><div className="text-xs font-bold uppercase tracking-[.18em] text-amber-400">ClearKey internal</div><h1 className="mt-2 text-xl font-semibold">Admin Control Center</h1><p className="mt-1 text-xs text-slate-500">{admin.email} · {admin.adminRole}</p><nav className="mt-8 space-y-1">{[[Building2,"Tenants","/internal-admin"],[Headphones,"Support","/internal-admin#support"],[ScrollText,"Audit logs","/internal-admin#audit"],[ShieldCheck,"Security","/internal-admin#security"],[Activity,"System health","/internal-admin#health"]].map(([Icon,label,href]) => { const I = Icon as typeof Building2; return <Link className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white" href={String(href)} key={String(label)}><I size={16}/>{String(label)}</Link>; })}</nav></aside>
    <main className="min-w-0 bg-[#f2f4f7] text-slate-950">{children}</main>
  </div>;
}
