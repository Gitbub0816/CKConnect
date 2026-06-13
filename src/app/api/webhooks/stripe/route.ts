import type Stripe from "stripe";
import { BillingStatus, type Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";
import { logger, requestContext } from "@/lib/logging/logger";

function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id;
}

async function processEvent(event: Stripe.Event, source: string) {
  const db = getDb();
  const object = event.data.object as unknown as { metadata?: Record<string, string>; customer?: string | { id: string }; subscription?: string | { id: string } };
  let organizationId = object.metadata?.organizationId;
  if (!organizationId && event.account) {
    organizationId = (await db.organization.findUnique({ where: { stripeConnectedAccountId: event.account }, select: { id: true } }))?.id;
  }
  const payload = JSON.parse(JSON.stringify(event.data.object)) as Prisma.InputJsonValue;
  const stored = await db.webhookEvent.upsert({
    where: { provider_externalEventId: { provider: "STRIPE", externalEventId: event.id } },
    create: { organizationId, provider: "STRIPE", externalEventId: event.id, eventType: event.type, payload, status: "PROCESSING", attempts: 1 },
    update: {},
  });
  if (stored.status === "PROCESSED") return;

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      organizationId = session.metadata?.organizationId ?? organizationId;
      if (organizationId && session.mode === "subscription") {
        const billingTier = session.metadata?.billingTier?.toUpperCase();
        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: stripeId(session.customer),
            stripeSubscriptionId: stripeId(session.subscription),
            stripeSubscriptionStatus: "active",
            billingStatus: "ACTIVE",
            ...(billingTier === "STARTER" || billingTier === "GROWTH" || billingTier === "ENTERPRISE" ? { billingTier } : {}),
          },
        });
        await db.billingAuditLog.create({
          data: {
            organizationId,
            action: "subscription.checkout.completed",
            calculatedTotalCents: Number(session.metadata?.calculatedAmount ?? 0),
            stripeCustomerId: stripeId(session.customer),
            stripeSubscriptionId: stripeId(session.subscription),
            afterJson: { status: "active", pricingVersion: session.metadata?.pricingVersion, billingTier: session.metadata?.billingTier },
          },
        });
      }
      if (organizationId && session.mode === "payment" && session.metadata?.invoiceId && session.payment_status === "paid") {
        const paymentOrganizationId = organizationId;
        const invoice = await db.invoice.findFirstOrThrow({ where: { id: session.metadata.invoiceId, organizationId: paymentOrganizationId } });
        const paymentIntentId = stripeId(session.payment_intent);
        await db.$transaction(async (tx) => {
          const payment = await tx.payment.upsert({
            where: { stripePaymentIntentId: paymentIntentId ?? `checkout:${session.id}` },
            create: {
              organizationId: paymentOrganizationId,
              amount: Number(session.amount_total ?? 0) / 100,
              currency: session.currency?.toUpperCase() ?? invoice.currency,
              status: "SUCCEEDED",
              method: "STRIPE",
              receivedAt: new Date(),
              stripePaymentIntentId: paymentIntentId ?? `checkout:${session.id}`,
            },
            update: { status: "SUCCEEDED" },
          });
          await tx.paymentAllocation.upsert({
            where: { paymentId_invoiceId: { paymentId: payment.id, invoiceId: invoice.id } },
            create: { paymentId: payment.id, invoiceId: invoice.id, amount: Number(session.amount_total ?? 0) / 100 },
            update: {},
          });
          const amountPaid = Number(invoice.amountPaid) + Number(session.amount_total ?? 0) / 100;
          const balanceDue = Math.max(0, Number(invoice.total) - amountPaid);
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid, balanceDue, status: balanceDue === 0 ? "PAID" : "PARTIALLY_PAID", paidAt: balanceDue === 0 ? new Date() : null },
          });
        });
      }
    }

    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      organizationId = subscription.metadata.organizationId ?? organizationId;
      if (organizationId) {
        const billingStatus: BillingStatus | undefined = subscription.status === "active"
          ? BillingStatus.ACTIVE
          : subscription.status === "trialing"
            ? BillingStatus.TRIALING
            : subscription.status === "past_due"
              ? BillingStatus.PAST_DUE
              : subscription.status === "canceled"
                ? BillingStatus.CANCELED
                : undefined;
        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: stripeId(subscription.customer),
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: subscription.status,
            ...(billingStatus ? { billingStatus } : {}),
          },
        });
        await db.billingAuditLog.create({
          data: {
            organizationId,
            action: `subscription.${subscription.status}`,
            calculatedTotalCents: Number(subscription.metadata.calculatedAmount ?? 0),
            stripeCustomerId: stripeId(subscription.customer),
            stripeSubscriptionId: subscription.id,
            afterJson: { status: subscription.status, pricingVersion: subscription.metadata.pricingVersion, billingTier: subscription.metadata.billingTier },
          },
        });
      }
    }

    await db.webhookEvent.update({
      where: { id: stored.id },
      data: { organizationId, status: "PROCESSED", processedAt: new Date(), attempts: { increment: stored.status === "PROCESSING" ? 0 : 1 }, lastError: null },
    });
    logger.info("stripe.webhook.processed", { source, providerEventId: event.id, providerEventType: event.type, organizationId });
  } catch (error) {
    await db.webhookEvent.update({
      where: { id: stored.id },
      data: { organizationId, status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown processing error" },
    });
    throw error;
  }
}

export async function POST(request: Request) {
  const context = requestContext(request);
  const signature = request.headers.get("stripe-signature");
  const secrets = [
    ["platform", process.env.STRIPE_WEBHOOK_SECRET],
    ["connected_accounts", process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS],
  ] as const;
  const configuredSecrets = secrets.flatMap(([source, secret]) => secret ? [{ source, secret }] : []);
  if (!signature || configuredSecrets.length === 0) {
    logger.warn("stripe.webhook.not_configured", context);
    return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const payload = await request.text();
  let verified: { event: Stripe.Event; source: string } | undefined;
  for (const { source, secret } of configuredSecrets) {
    try {
      verified = { event: getStripe().webhooks.constructEvent(payload, signature, secret), source };
      break;
    } catch {
      // A destination has a distinct signing secret; try the next configured destination.
    }
  }

  if (!verified) {
    logger.warn("stripe.webhook.invalid_signature", context);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info("stripe.webhook.accepted", {
    ...context,
    webhookSource: verified.source,
    providerEventId: verified.event.id,
    providerEventType: verified.event.type,
  });
  try {
    await processEvent(verified.event, verified.source);
  } catch (error) {
    logger.error("stripe.webhook.processing_failed", { ...context, providerEventId: verified.event.id, error });
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
  return Response.json({ received: true, eventId: verified.event.id, eventType: verified.event.type });
}
