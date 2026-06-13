import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { logger, requestContext } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  const context = requestContext(request);
  try {
    const event = await verifyWebhook(request);
    logger.info("clerk.webhook.accepted", {
      ...context,
      providerEventType: event.type,
      providerEventId: event.data.id,
    });

    // User and organization projection is applied here once the first Neon migration is deployed.
    return Response.json({ received: true });
  } catch (error) {
    logger.warn("clerk.webhook.invalid_signature", { ...context, error });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
}
