import "server-only";

import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl } from "@/lib/integrations/stripe-workflows";

type CheckoutInput = {
  organizationId: string;
  invoiceId?: string;
  bookingId?: string;
  contactId?: string;
  amountCents: number;
  currency: string;
  description: string;
  successPath: string;
  cancelPath: string;
  customerEmail?: string;
  providerOverride?: string;
};

export class PaymentService {
  async createCheckout(input: CheckoutInput) {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Payment amount must be positive integer cents");
    const db = getDb();
    const organization = await db.organization.findUniqueOrThrow({ where: { id: input.organizationId } });
    const connection = input.providerOverride
      ? await db.paymentProviderConnection.findUnique({ where: { organizationId_provider: { organizationId: input.organizationId, provider: input.providerOverride.toUpperCase() } } })
      : await db.paymentProviderConnection.findFirst({ where: { organizationId: input.organizationId, isDefault: true, status: "ACTIVE" } });
    if (!connection) throw new Error("No active customer payment provider is configured");
    const provider = connection.provider.toUpperCase();
    if (provider === "MANUAL") throw new Error("Manual payments must be recorded by an authorized tenant user");
    if (provider !== "STRIPE") throw new Error(`${provider} checkout is not available until its merchant onboarding is complete`);
    const accountId = connection.externalAccountId ?? organization.stripeConnectedAccountId;
    if (!accountId) throw new Error("Stripe merchant onboarding is incomplete");
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: input.currency.toLowerCase(), unit_amount: input.amountCents, product_data: { name: input.description } } }],
      success_url: appUrl(input.successPath),
      cancel_url: appUrl(input.cancelPath),
      customer_email: input.customerEmail,
      metadata: { organizationId: input.organizationId, invoiceId: input.invoiceId ?? "", bookingId: input.bookingId ?? "", workflow: "customer_payment" },
      payment_intent_data: {
        metadata: { organizationId: input.organizationId, invoiceId: input.invoiceId ?? "", bookingId: input.bookingId ?? "" },
      },
    }, { stripeAccount: accountId });
    const transaction = await db.paymentTransaction.create({
      data: {
        organizationId: input.organizationId,
        providerConnectionId: connection.id,
        provider,
        invoiceId: input.invoiceId,
        bookingId: input.bookingId,
        contactId: input.contactId,
        amountCents: input.amountCents,
        currency: input.currency,
        status: "CHECKOUT_CREATED",
        externalCheckoutId: session.id,
        checkoutUrl: session.url,
      },
    });
    return { transaction, url: session.url };
  }
}
