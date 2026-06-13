import Image from "next/image";
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CreditCard,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const capabilities = [
  { icon: Users, title: "Relationships, understood", copy: "CRM, pipeline, service, and every customer conversation in one useful record." },
  { icon: BookOpenCheck, title: "Books you can trust", copy: "Purpose-built double-entry accounting, billing, expenses, banking, payroll, and reporting." },
  { icon: CreditCard, title: "Money in motion", copy: "Invoices, subscriptions, payment links, and connected-account payments through Stripe." },
  { icon: Palette, title: "Your brand, everywhere", copy: "Give each organization its own portal, forms, booking pages, domains, colors, type, and voice." },
  { icon: BarChart3, title: "Operations in focus", copy: "Dashboards, workflows, inventory, files, approvals, and scheduled work without tool sprawl." },
  { icon: ShieldCheck, title: "Control by design", copy: "Tenant isolation, granular access, signed endpoints, and tamper-evident audit history." },
];

const proof = [
  ["One system", "CRM, finance, service, and operations share the same source of truth."],
  ["Client-ready", "Every workspace can publish a tailored, branded endpoint for its customers."],
  ["Built to endure", "A modular foundation that grows from the first invoice to complex operations."],
];

export default function Home() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fdfcf8] text-[#1c1917]">
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link className="flex items-center gap-3" href="/">
          <Image alt="ClearKey Solutions" className="h-12 w-auto object-contain" height={96} priority src="/logo.png" width={180} />
          <span className="hidden border-l border-[#c9a033]/35 pl-3 text-xs font-semibold uppercase tracking-[.18em] text-[#504a44] sm:block">Connect</span>
        </Link>
        <div className="flex items-center gap-3">
          {clerkConfigured ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-sm font-semibold text-[#504a44] transition hover:text-[#8b6914]">Sign in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="ck-button">Start building <ArrowRight size={15} /></button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link className="ck-button ck-button-secondary" href="/app/demo">Open workspace</Link>
                <UserButton />
              </Show>
            </>
          ) : (
            <>
              <Link className="text-sm font-semibold text-[#504a44] transition hover:text-[#8b6914]" href="/sign-in">Sign in</Link>
              <Link className="ck-button" href="/sign-up">Start building <ArrowRight size={15} /></Link>
            </>
          )}
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
        <div className="pointer-events-none absolute -left-48 top-0 size-[540px] rounded-full bg-[#e8c96a]/12 blur-3xl" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 border border-[#c9a033]/35 bg-white/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-[#8b6914]">
            <Sparkles size={12} /> Business software, made clear
          </div>
          <h1 className="ck-display max-w-3xl text-6xl leading-[.94] tracking-[-.045em] sm:text-8xl">
            Where clarity meets capability.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#625b54]">
            ClearKey Connect unifies relationships, operations, payments, payroll, and trustworthy accounting in one deeply customizable platform.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className="ck-button !min-h-12 !px-5" href="/sign-up">Create your workspace <ArrowRight size={16} /></Link>
            <Link className="ck-button ck-button-secondary !min-h-12 !px-5" href="/p/demo">Explore a client endpoint</Link>
          </div>
          <div className="mt-11 grid max-w-xl grid-cols-3 border-y border-[#c9a033]/25 py-5 text-center">
            {["CRM + service", "Native accounting", "Branded portals"].map((item) => (
              <span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8b8177]" key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 border border-[#c9a033]/20" />
          <div className="relative border border-[#c9a033]/35 bg-[#201d1a] p-3 shadow-[0_36px_90px_rgba(72,54,18,.19)]">
            <div className="border border-black/5 bg-[#f5f0e8] p-4 text-[#1c1917]">
              <div className="mb-4 flex items-center justify-between">
                <div><div className="text-xs text-[#8b8177]">Friday overview</div><div className="text-lg font-semibold">Good morning, Caleb</div></div>
                <div className="bg-[#c9a033] px-3 py-2 text-xs font-bold text-[#211b0d]">New invoice</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Revenue $84,240", "Pipeline $126k", "Outstanding $12,830", "Net income $31,090"].map((item, index) => (
                  <div className="border border-[#ded6c8] bg-white p-4" key={item}>
                    <div className="text-xs text-[#8b8177]">{item.split(" ")[0]}</div>
                    <div className="mt-2 text-xl font-semibold">{item.substring(item.indexOf(" ") + 1)}</div>
                    <div className={`mt-3 h-1.5 ${index === 2 ? "bg-[#8b6914]" : "bg-[#c9a033]"}`} style={{ width: `${58 + index * 9}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 border border-[#ded6c8] bg-white p-4">
                <div className="mb-5 flex justify-between text-sm font-semibold"><span>Revenue and expenses</span><span className="text-[#9b938a]">Last 6 months</span></div>
                <div className="flex h-32 items-end gap-3">
                  {[36, 52, 47, 70, 62, 88].map((height, index) => (
                    <div className="flex flex-1 items-end gap-1" key={height}>
                      <div className="w-1/2 bg-[#c9a033]" style={{ height: `${height}%` }} />
                      <div className="w-1/2 bg-[#504a44]" style={{ height: `${Math.max(20, height - 22 + index)}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#c9a033]/20 bg-[#f5f0e8]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div><div className="ck-eyebrow">Built for real business</div><h2 className="ck-display mt-5 text-5xl leading-none">Less software.<br />More command.</h2></div>
            <div className="grid gap-px border border-[#d8cebd] bg-[#d8cebd] md:grid-cols-3">
              {proof.map(([title, copy], index) => (
                <article className="bg-[#fdfcf8] p-7" key={title}>
                  <div className="text-xs font-bold text-[#c9a033]">0{index + 1}</div>
                  <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6c645c]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl"><div className="ck-eyebrow">A complete operating layer</div><h2 className="ck-display mt-5 text-5xl">Everything important, connected.</h2></div>
        <div className="mt-12 grid gap-px border border-[#ded6c8] bg-[#ded6c8] md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, copy }) => (
            <article className="group bg-[#fdfcf8] p-7 transition hover:bg-white" key={title}>
              <Icon className="text-[#b08720]" size={22} />
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6c645c]">{copy}</p>
              <div className="mt-7 h-px w-8 bg-[#c9a033] transition-all group-hover:w-16" />
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#1c1917] px-6 py-20 text-[#fdfcf8]">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="ck-eyebrow !text-[#e8c96a]">Operate with clarity</div>
          <h2 className="ck-display mt-5 max-w-3xl text-5xl">Build the workspace your business actually needs.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#bbb2a8]">Start with ClearKey’s proven structure, then shape every internal workflow and client-facing experience around your organization.</p>
          <Link className="ck-button mt-9 !min-h-12 !px-6" href="/sign-up">Start building <ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#c9a033]/20 px-6 py-7 text-xs text-[#81786f]">
        <span>© 2026 ClearKey Solutions. Precision software for modern business.</span>
        <Link className="font-semibold hover:text-[#8b6914]" href="/legal">Legal and policy center</Link>
      </footer>
    </main>
  );
}
