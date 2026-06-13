import { z } from "zod";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl, platformFee } from "@/lib/integrations/stripe-workflows";

export async function POST(request: Request) {
  const { token } = z.object({ token: z.string().min(8).max(180) }).parse(await request.json());
  const invoice = await getDb().invoice.findUnique({
    where: { publicTokenId: token },
    include: { organization: true, items: true, contact: true },
  });
  if (!invoice || invoice.status === "VOID" || invoice.balanceDue.lte(0)) {
    return Response.json({ error: "Invoice is not payable" }, { status: 404 });
  }
  const amount = Math.round(Number(invoice.balanceDue) * 100);
  const paymentIntentData = invoice.organization.stripeConnectedAccountId ? {
    application_fee_amount: platformFee(amount),
    on_behalf_of: invoice.organization.stripeConnectedAccountId,
    transfer_data: { destination: invoice.organization.stripeConnectedAccountId },
    metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
  } : {
    metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
  };
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: invoice.currency.toLowerCase(),
        unit_amount: amount,
        product_data: { name: `Invoice ${invoice.invoiceNumber}`, description: invoice.items.map((item) => item.description).join(", ").slice(0, 500) },
      },
    }],
    success_url: appUrl(`/pay/${token}?status=success`),
    cancel_url: appUrl(`/pay/${token}?status=canceled`),
    customer_email: invoice.contact?.email ?? undefined,
    metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId, workflow: "invoice_payment" },
    payment_intent_data: paymentIntentData,
  });
  return Response.json({ url: session.url });
}
