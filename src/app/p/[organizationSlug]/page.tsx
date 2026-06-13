import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MessageSquareText, ShieldCheck } from "lucide-react";

export default async function PublicClientEndpoint({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const isDemo = organizationSlug === "demo";

  return (
    <main
      className="min-h-screen bg-[#eef6f5] px-5 py-8 text-[#153733]"
      style={{
        "--primary": isDemo ? "#176b5b" : "#1f6feb",
        "--primary-strong": isDemo ? "#105347" : "#1557b0",
        "--accent": "#d8a85f",
        "--radius": "18px",
      } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[24px] border border-emerald-900/10 bg-white shadow-[0_30px_80px_rgba(24,74,65,.14)]">
        <nav className="flex items-center justify-between border-b border-emerald-900/10 px-6 py-5 md:px-10">
          <div className="flex items-center gap-3 font-semibold">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-sm text-white">HS</span>
            {isDemo ? "Harbor Services" : organizationSlug.replaceAll("-", " ")}
          </div>
          <div className="hidden items-center gap-7 text-sm text-emerald-950/60 md:flex">
            <a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a>
          </div>
          <button className="ck-button">Client portal</button>
        </nav>

        <section className="grid gap-10 px-6 py-16 md:grid-cols-[1.12fr_.88fr] md:px-10 md:py-24">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.2em] text-[var(--primary)]">Your client hub</div>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-[-.045em] md:text-6xl">Service that feels personal.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-950/60">
              Schedule service, review documents, pay invoices, and keep every conversation in one secure place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className="ck-button !min-h-12 !px-5">Book a service <ArrowRight size={16} /></button>
              <button className="ck-button ck-button-secondary !min-h-12 !px-5">Send a message</button>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              [CalendarDays, "Schedule an appointment", "Choose a service and a time that works."],
              [FileText, "Review and pay invoices", "Secure payment without creating an account."],
              [MessageSquareText, "Stay connected", "Send questions and follow project updates."],
            ].map(([Icon, title, copy]) => {
              const EndpointIcon = Icon as typeof CalendarDays;
              return (
                <article className="rounded-[18px] border border-emerald-900/10 bg-[#f8fbfa] p-5" key={String(title)}>
                  <EndpointIcon className="text-[var(--primary)]" size={21} />
                  <h2 className="mt-4 font-semibold">{String(title)}</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-950/55">{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-900/10 bg-[#f8fbfa] px-6 py-5 text-xs text-emerald-950/50 md:px-10">
          <span>© 2026 {isDemo ? "Harbor Services" : organizationSlug}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Securely hosted by <Link className="font-semibold text-emerald-900" href="/">ClearKey Connect</Link></span>
        </footer>
      </div>
    </main>
  );
}
