import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { MainLoginForm } from "@/components/main-login-form";

export default function LoginPage() {
  return <main className="grid min-h-screen bg-[#f4efe6] lg:grid-cols-[1fr_520px]">
    <section className="hidden bg-[#1c1917] p-16 text-white lg:flex lg:flex-col lg:justify-between">
      <Link className="flex items-center gap-3 font-semibold" href="/"><span className="grid size-10 place-items-center rounded-lg bg-[#c9a033] text-sm font-black text-[#211b0d]">CK</span>ClearKey Connect</Link>
      <div><div className="ck-eyebrow !text-amber-300">One secure operating system</div><h1 className="ck-display mt-5 max-w-2xl text-6xl leading-[.95]">Run the business without stitching the business together.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-400">CRM, accounting, workforce, scheduling, websites, domains, email, payments, and reporting in one tenant-aware suite.</p></div>
      <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15}/>Authentication powered by Clerk. Access verified server-side.</div>
    </section>
    <section className="grid place-items-center p-7"><div className="w-full max-w-sm"><div className="lg:hidden"><span className="grid size-11 place-items-center rounded-lg bg-[#c9a033] font-black">CK</span></div><div className="ck-eyebrow mt-10 lg:mt-0">Workspace sign in</div><h2 className="mt-3 text-3xl font-semibold tracking-tight">Find your organization</h2><p className="mt-3 text-sm leading-6 text-slate-500">Enter the company code supplied by your administrator.</p><MainLoginForm/><p className="mt-8 text-center text-xs text-slate-500">Need help? Contact your company administrator or ClearKey support.</p></div></section>
  </main>;
}
