import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CreditCard,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";

const capabilities = [
  { icon: Users, title: "CRM", copy: "Leads, accounts, contacts, deals, cases, campaigns, tasks, and automation." },
  { icon: BookOpenCheck, title: "Accounting", copy: "A real double-entry ledger, invoicing, bills, expenses, banking, and reporting." },
  { icon: CreditCard, title: "Payments", copy: "SaaS billing and connected-account customer payments through Stripe." },
  { icon: Palette, title: "Client experiences", copy: "Branded portals, payment links, booking pages, forms, and hosted endpoints." },
  { icon: BarChart3, title: "Operations", copy: "Dashboards, custom fields, workflows, inventory, files, and scheduled work." },
  { icon: ShieldCheck, title: "Controls", copy: "Tenant isolation, granular permissions, audit trails, and integration health." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0e1728] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-500 text-sm shadow-lg shadow-blue-500/25">CK</span>
          ClearKey Connect
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm text-slate-300 hover:text-white" href="/sign-in">Sign in</Link>
          <Link className="ck-button" href="/sign-up">Start building <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
            One operating system for small business
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.045em] sm:text-7xl">
            Run the relationship and the books.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            ClearKey Connect brings CRM, invoicing, payments, scheduling, service, and trustworthy accounting into one customizable platform.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="ck-button !min-h-12 !px-5" href="/sign-up">Create your workspace <ArrowRight size={16} /></Link>
            <Link className="ck-button ck-button-secondary !min-h-12 !border-white/15 !bg-white/5 !text-white hover:!bg-white/10" href="/p/demo">
              View client endpoint
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[.055] p-3 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="rounded-[18px] border border-white/10 bg-[#f3f6fb] p-4 text-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Friday overview</div>
                <div className="text-lg font-semibold">Good morning, Caleb</div>
              </div>
              <div className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">New invoice</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Revenue $84,240", "Open pipeline $126k", "Outstanding $12,830", "Net income $31,090"].map((item, index) => (
                <div className="rounded-xl border border-slate-200 bg-white p-4" key={item}>
                  <div className="text-xs text-slate-500">{item.split(" ")[0]}</div>
                  <div className="mt-2 text-xl font-semibold">{item.substring(item.indexOf(" ") + 1)}</div>
                  <div className={`mt-3 h-1.5 rounded-full ${index === 2 ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${58 + index * 9}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-5 flex justify-between text-sm font-semibold"><span>Revenue and expenses</span><span className="text-slate-400">Last 6 months</span></div>
              <div className="flex h-32 items-end gap-3">
                {[36, 52, 47, 70, 62, 88].map((height, index) => (
                  <div className="flex flex-1 items-end gap-1" key={height}>
                    <div className="w-1/2 rounded-t bg-blue-500" style={{ height: `${height}%` }} />
                    <div className="w-1/2 rounded-t bg-teal-400" style={{ height: `${Math.max(20, height - 22 + index)}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[.025]">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-16 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, copy }) => (
            <article className="rounded-2xl border border-white/10 bg-white/[.035] p-6" key={title}>
              <Icon className="text-blue-300" size={22} />
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
