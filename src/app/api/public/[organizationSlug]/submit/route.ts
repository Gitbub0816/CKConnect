import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("BOOKING"), name: z.string().min(2).max(120), email: z.string().email(), phone: z.string().max(40).optional(), service: z.string().min(2).max(120), startsAt: z.string().datetime(), notes: z.string().max(1000).optional() }),
  z.object({ type: z.literal("FORM"), name: z.string().min(2).max(120), email: z.string().email(), phone: z.string().max(40).optional(), subject: z.string().min(2).max(160), message: z.string().min(2).max(3000) }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  const input = schema.parse(await request.json());
  const db = getDb();
  const organization = await db.organization.findUnique({ where: { slug: organizationSlug } });
  if (!organization || organization.status !== "ACTIVE") return Response.json({ error: "Organization not found" }, { status: 404 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const sourceIpHash = createHash("sha256").update(`${organization.id}:${ip}:${process.env.AUDIT_HMAC_KEY ?? "development"}`).digest("hex");
  const recent = await db.endpointSubmission.count({ where: { organizationId: organization.id, sourceIpHash, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 5) return Response.json({ error: "Too many submissions. Try again shortly." }, { status: 429 });
  const [firstName, ...last] = input.name.trim().split(/\s+/);
  const contact = await db.contact.findFirst({ where: { organizationId: organization.id, email: input.email.toLowerCase() } }) ?? await db.contact.create({ data: { organizationId: organization.id, firstName, lastName: last.join(" ") || null, email: input.email.toLowerCase(), phone: input.phone, lifecycleStatus: "LEAD" } });
  if (input.type === "BOOKING") {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const conflict = await db.booking.findFirst({ where: { organizationId: organization.id, status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (conflict) return Response.json({ error: "That time is no longer available" }, { status: 409 });
    const booking = await db.$transaction(async (tx) => {
      const created = await tx.booking.create({ data: { organizationId: organization.id, contactId: contact.id, serviceName: input.service, startsAt, endsAt, customerName: input.name, customerEmail: input.email, customerPhone: input.phone, notes: input.notes } });
      await tx.calendarEvent.create({ data: { organizationId: organization.id, title: `${input.service}: ${input.name}`, eventType: "APPOINTMENT", startsAt, endsAt, relatedType: "BOOKING", relatedId: created.id, attendeeJson: [input.email] } });
      await tx.endpointSubmission.create({ data: { organizationId: organization.id, submissionType: "BOOKING", payloadJson: input, status: "PROCESSED", contactId: contact.id, sourceIpHash } });
      return created;
    });
    return Response.json({ ok: true, bookingId: booking.id }, { status: 201 });
  }
  const submission = await db.endpointSubmission.create({ data: { organizationId: organization.id, submissionType: "CONTACT_FORM", payloadJson: input, contactId: contact.id, sourceIpHash } });
  await db.supportCase.create({ data: { organizationId: organization.id, contactId: contact.id, caseNumber: `WEB-${submission.id.slice(0, 8).toUpperCase()}`, subject: input.subject, description: input.message, priority: "NORMAL" } });
  return Response.json({ ok: true, submissionId: submission.id }, { status: 201 });
}
