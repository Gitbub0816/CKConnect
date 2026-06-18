import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";
import { logger, requestContext } from "@/lib/logging/logger";

function verifySignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const sig = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const context = requestContext(request);
  const secret = process.env.CALENDAR_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("calendar.webhook.not_configured", context);
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? request.headers.get("x-hub-signature-256");
  if (!verifySignature(payload, signature, secret)) {
    logger.warn("calendar.webhook.invalid_signature", context);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { id?: string; type?: string; organizationSlug?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = String(event.id ?? `cal-${Date.now()}`);
  const eventType = String(event.type ?? "unknown");
  const db = getDb();

  const org = event.organizationSlug
    ? await db.organization.findUnique({ where: { slug: event.organizationSlug }, select: { id: true } })
    : null;

  const stored = await db.webhookEvent.upsert({
    where: { provider_externalEventId: { provider: "CALENDAR", externalEventId: eventId } },
    create: { organizationId: org?.id, provider: "CALENDAR", externalEventId: eventId, eventType, payload: JSON.parse(payload), status: "PROCESSING", attempts: 1 },
    update: {},
  });
  if (stored.status === "PROCESSED") return Response.json({ received: true, eventId, eventType });

  try {
    const data = event.data ?? {};

    if (org) {
      if ((eventType === "event.created" || eventType === "event.updated") && data.title && data.startsAt && data.endsAt) {
        const externalId = String(data.externalId ?? data.id ?? "");
        if (eventType === "event.updated" && externalId) {
          await db.calendarEvent.updateMany({
            where: { id: externalId, organizationId: org.id },
            data: {
              title: String(data.title),
              eventType: String(data.eventType ?? "MEETING"),
              status: String(data.status ?? "CONFIRMED"),
              startsAt: new Date(String(data.startsAt)),
              endsAt: new Date(String(data.endsAt)),
              location: data.location ? String(data.location) : null,
              description: data.description ? String(data.description) : null,
            },
          });
        } else if (eventType === "event.created") {
          await db.calendarEvent.create({
            data: {
              organizationId: org.id,
              title: String(data.title),
              eventType: String(data.eventType ?? "MEETING"),
              status: String(data.status ?? "CONFIRMED"),
              startsAt: new Date(String(data.startsAt)),
              endsAt: new Date(String(data.endsAt)),
              location: data.location ? String(data.location) : null,
              description: data.description ? String(data.description) : null,
              attendeeJson: (data.attendees ?? []) as never,
            },
          });
        }
      }

      if (eventType === "event.canceled" && data.id) {
        await db.calendarEvent.updateMany({
          where: { id: String(data.id), organizationId: org.id },
          data: { status: "CANCELED" },
        });
      }
    }

    await db.webhookEvent.update({
      where: { id: stored.id },
      data: { organizationId: org?.id, status: "PROCESSED", processedAt: new Date(), lastError: null },
    });
    logger.info("calendar.webhook.processed", { ...context, eventId, eventType });
  } catch (error) {
    await db.webhookEvent.update({
      where: { id: stored.id },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error" },
    });
    logger.error("calendar.webhook.processing_failed", { ...context, eventId, error });
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return Response.json({ received: true, eventId, eventType });
}
