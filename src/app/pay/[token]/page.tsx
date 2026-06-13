import { notFound } from "next/navigation";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { InvoicePaymentButton } from "@/components/invoice-payment-button";
import { getDb } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default async function InvoicePaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const invoice = await getDb().invoice.findUnique({
    where: { publicTokenId: token },
    include: { organization: { include: { theme: true } }, account: true, contact: true, items: true },
  });
  if (!invoice) notFound();
  const paid = invoice.status === "PAID" || invoice.balanceDue.lte(0) || status === "success";
  const theme = invoice.organization.theme;
  const pageStyle = {
    "--payment-primary": theme?.paymentPrimaryColor ?? "#c9a033",
    "--payment-header": theme?.paymentHeaderColor ?? "#1c1917",
    backgroundImage: theme?.paymentBackgroundImageUrl ? `linear-gradient(rgb(243 238 229 / 88%), rgb(243 238 229 / 88%)), url("${theme.paymentBackgroundImageUrl}")` : undefined,
    backgroundSize: "cover",
  } as React.CSSProperties;

  return (
    <main className="min-h-screen bg-[#f3eee5] p-5 sm:p-10" style={pageStyle}>
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_28px_90px_rgba(54,40,20,.15)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-[var(--payment-header)] px-7 py-6 text-white">
          <div className="flex items-center gap-4">{theme?.paymentLogoUrl && (
            // Tenant logos can be hosted on arbitrary verified domains.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-12 rounded-lg bg-white/10 object-contain p-1" src={theme.paymentLogoUrl}/>
          )}<div><div className="text-xs uppercase tracking-[.18em] text-[var(--payment-primary)]">{theme?.paymentTitle ?? "Secure invoice"}</div><h1 className="mt-1 text-2xl font-semibold">{invoice.organization.name}</h1></div></div>
          <div className="flex items-center gap-2 text-xs text-slate-300"><LockKeyhole size={15}/>Stripe-hosted payment</div>
        </header>
        <div className="grid gap-8 p-7 md:grid-cols-[1fr_270px]">
          <section>
            <div className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Invoice {invoice.invoiceNumber}</div>
            <h2 className="mt-3 text-3xl font-semibold">{formatCurrency(Number(invoice.balanceDue), invoice.currency)}</h2>
            <p className="mt-2 text-sm text-slate-500">Due {invoice.dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            <div className="mt-7 overflow-hidden rounded-xl border">
              {invoice.items.map((item) => <div className="flex items-start justify-between gap-5 border-b p-4 last:border-0" key={item.id}><div><div className="font-medium">{item.description}</div><div className="mt-1 text-xs text-slate-500">{Number(item.quantity)} x {formatCurrency(Number(item.unitPrice), invoice.currency)}</div></div><strong>{formatCurrency(Number(item.lineTotal), invoice.currency)}</strong></div>)}
            </div>
          </section>
          <aside className="rounded-xl bg-[#f8f5ef] p-5">
            <div className="text-xs font-bold uppercase tracking-[.13em] text-slate-500">Bill to</div>
            <div className="mt-3 font-semibold">{invoice.account?.name ?? ([invoice.contact?.firstName, invoice.contact?.lastName].filter(Boolean).join(" ") || "Client")}</div>
            {invoice.contact?.email && <div className="mt-1 text-xs text-slate-500">{invoice.contact.email}</div>}
            <div className="my-5 border-t"/>
            {paid ? <div className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mb-2" size={22}/>This invoice is paid.</div> : <div style={{ "--primary": theme?.paymentPrimaryColor ?? "#c9a033" } as React.CSSProperties}><InvoicePaymentButton token={token}/></div>}
            <p className="mt-4 text-xs leading-5 text-slate-500">Payment details are collected by Stripe and are never stored by ClearKey Connect.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
