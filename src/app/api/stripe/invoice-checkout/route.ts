import { z } from "zod";
import { getDb } from "@/lib/db";
import { PaymentService } from "@/lib/payments/payment-service";
import { assertTrustedMutationOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  assertTrustedMutationOrigin(request);
  const { token } = z.object({ token: z.string().min(8).max(180) }).parse(await request.json());
  const invoice = await getDb().invoice.findUnique({
    where: { publicTokenId: token },
    include: { organization: true, items: true, contact: true },
  });
  if (!invoice || invoice.status === "VOID" || invoice.balanceDue.lte(0)) {
    return Response.json({ error: "Invoice is not payable" }, { status: 404 });
  }
  const amountCents = Math.round(Number(invoice.balanceDue) * 100);
  const checkout = await new PaymentService().createCheckout({
    organizationId: invoice.organizationId,
    invoiceId: invoice.id,
    contactId: invoice.contactId ?? undefined,
    amountCents,
    currency: invoice.currency,
    description: `Invoice ${invoice.invoiceNumber}`,
    successPath: `/pay/${token}?status=success`,
    cancelPath: `/pay/${token}?status=canceled`,
    customerEmail: invoice.contact?.email ?? undefined,
  });
  return Response.json({ url: checkout.url });
}
