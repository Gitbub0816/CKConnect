import type Stripe from "stripe";
import { getStripe } from "@/lib/integrations/stripe";
import { logger, requestContext } from "@/lib/logging/logger";

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
  // Persistence and queue dispatch are enabled once Neon and Cloudflare Queues are connected.
  return Response.json({ received: true, eventId: verified.event.id, eventType: verified.event.type });
}
