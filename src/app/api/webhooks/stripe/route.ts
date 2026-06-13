import type Stripe from "stripe";
import { getStripe } from "@/lib/integrations/stripe";
import { logger, requestContext } from "@/lib/logging/logger";

export async function POST(request: Request) {
  const context = requestContext(request);
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    logger.warn("stripe.webhook.not_configured", context);
    return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    logger.warn("stripe.webhook.invalid_signature", { ...context, error });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info("stripe.webhook.accepted", { ...context, providerEventId: event.id, providerEventType: event.type });
  // Persistence and queue dispatch are enabled once Neon and Cloudflare Queues are connected.
  return Response.json({ received: true, eventId: event.id, eventType: event.type });
}
