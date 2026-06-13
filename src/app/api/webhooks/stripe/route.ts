import type Stripe from "stripe";
import { getStripe } from "@/lib/integrations/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Persistence and queue dispatch are enabled once Neon and Cloudflare Queues are connected.
  return Response.json({ received: true, eventId: event.id, eventType: event.type });
}
