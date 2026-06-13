import { notFound } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { resolveTenantBySlug } from "@/lib/tenant";

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();
  return <main className="grid min-h-screen place-items-center bg-[#f4efe6] p-6">
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-white shadow-[0_30px_90px_rgba(54,40,20,.16)] md:grid-cols-[320px_1fr]">
      <section className="bg-[#1c1917] p-8 text-white"><div className="grid size-12 place-items-center rounded-lg text-lg font-black text-white" style={{ background: tenant.theme?.primaryColor ?? "#c9a033" }}>{tenant.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</div><div className="mt-10 text-xs uppercase tracking-[.16em] text-amber-300">Secure organization access</div><h1 className="mt-3 text-3xl font-semibold">{tenant.name}</h1><p className="mt-4 text-sm leading-6 text-slate-400">Only verified members of this organization can enter its ClearKey workspace.</p></section>
      <section className="grid place-items-center p-6 md:p-10"><SignIn forceRedirectUrl={`/c/${tenant.slug}`} routing="hash"/></section>
    </div>
  </main>;
}
