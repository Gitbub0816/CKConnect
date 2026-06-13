import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MessageSquareText, ShieldCheck } from "lucide-react";

export default async function PublicClientEndpoint({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const isDemo = organizationSlug === "demo";
  const organizationName = isDemo
    ? "Harbor Services"
    : organizationSlug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <main
      className="min-h-screen bg-[var(--portal-background)] px-4 py-6 text-[var(--portal-text)] md:px-6 md:py-10"
      style={{
        "--primary": isDemo ? "#9b7420" : "#c9a033",
        "--primary-strong": isDemo ? "#6f5011" : "#8b6914",
        "--portal-background": "#f5f0e8",
        "--portal-surface": "#fdfcf8",
        "--portal-text": "#1c1917",
        "--radius": "4px",
      } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl overflow-hidden border border-[#c9a033]/30 bg-[var(--portal-surface)] shadow-[0_30px_90px_rgba(72,54,18,.14)]">
        <nav className="flex items-center justify-between border-b border-[#ded6c8] px-6 py-5 md:px-10">
          <div className="flex items-center gap-3 font-semibold">
            <span className="grid size-10 place-items-center bg-[var(--primary)] text-xs font-bold text-[#211b0d]">
              {organizationName.split(" ").map((word) => word[0]).join("").slice(0, 2)}
            </span>
            <div><div>{organizationName}</div><div className="text-[9px] uppercase tracking-[.16em] text-[#8b8177]">Client services</div></div>
          </div>
          <div className="hidden items-center gap-7 text-xs font-semibold uppercase tracking-[.12em] text-[#746c64] md:flex">
            <a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a>
          </div>
          <button className="ck-button">Client portal</button>
        </nav>

        <section className="relative grid gap-12 px-6 py-16 md:grid-cols-[1.08fr_.92fr] md:px-10 md:py-24">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(201,160,51,.12),transparent_55%)]" />
          <div className="relative">
            <div className="ck-eyebrow">Welcome to your client hub</div>
            <h1 className="ck-display mt-5 max-w-2xl text-6xl leading-[.95] tracking-[-.035em]">Service that feels personal.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#6c645c]">
              Schedule service, review documents, pay invoices, and keep every conversation in one secure place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className="ck-button !min-h-12 !px-5">Book a service <ArrowRight size={16} /></button>
              <button className="ck-button ck-button-secondary !min-h-12 !px-5">Send a message</button>
            </div>
          </div>
          <div className="relative grid gap-px border border-[#ded6c8] bg-[#ded6c8]">
            {[
              [CalendarDays, "Schedule an appointment", "Choose a service and a time that works."],
              [FileText, "Review and pay invoices", "Secure payment without creating an account."],
              [MessageSquareText, "Stay connected", "Send questions and follow project updates."],
            ].map(([Icon, title, copy]) => {
              const EndpointIcon = Icon as typeof CalendarDays;
              return (
                <article className="group bg-white p-6 transition hover:bg-[#fdfaf1]" key={String(title)}>
                  <EndpointIcon className="text-[var(--primary)]" size={21} />
                  <h2 className="mt-5 font-semibold">{String(title)}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#746c64]">{String(copy)}</p>
                  <div className="mt-5 h-px w-6 bg-[var(--primary)] transition-all group-hover:w-12" />
                </article>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ded6c8] bg-[#f5f0e8] px-6 py-5 text-xs text-[#81786f] md:px-10">
          <span>© 2026 {organizationName}</span>
          <span className="flex items-center gap-3">
            <Link href="/legal">Legal</Link>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Securely hosted by <Link className="font-semibold text-[#6f5011]" href="/">ClearKey Connect</Link></span>
          </span>
        </footer>
      </div>
    </main>
  );
}
