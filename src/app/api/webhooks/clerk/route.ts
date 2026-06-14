import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { logger, requestContext } from "@/lib/logging/logger";
import { generateUniqueOrgCode, normalizeOrgCode } from "@/lib/tenant";

function roleForClerk(role: string): MembershipRole {
  if (role === "org:admin") return "ADMIN";
  if (role.includes("owner")) return "OWNER";
  return "MANAGER";
}

export async function POST(request: NextRequest) {
  const context = requestContext(request);
  try {
    const event = await verifyWebhook(request);
    const db = getDb();
    const externalEventId = request.headers.get("svix-id") ?? `${event.type}:${event.data.id}`;
    const existing = await db.webhookEvent.findUnique({
      where: { provider_externalEventId: { provider: "CLERK", externalEventId } },
    });
    if (existing?.status === "PROCESSED") return Response.json({ received: true, duplicate: true });

    await db.webhookEvent.upsert({
      where: { provider_externalEventId: { provider: "CLERK", externalEventId } },
      create: {
        provider: "CLERK",
        externalEventId,
        eventType: event.type,
        payload: JSON.parse(JSON.stringify(event.data)) as Prisma.InputJsonValue,
        status: "PROCESSING",
        attempts: 1,
      },
      update: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
    });

    if (event.type === "user.created" || event.type === "user.updated") {
      const primary = event.data.email_addresses.find((email) => email.id === event.data.primary_email_address_id) ?? event.data.email_addresses[0];
      if (primary?.email_address) {
        await db.user.upsert({
          where: { email: primary.email_address.toLowerCase() },
          create: { clerkUserId: event.data.id, email: primary.email_address.toLowerCase(), firstName: event.data.first_name, lastName: event.data.last_name },
          update: { clerkUserId: event.data.id, firstName: event.data.first_name, lastName: event.data.last_name },
        });
      }
    }

    if (event.type === "organization.created" || event.type === "organization.updated") {
      const metadata = event.data.public_metadata as Record<string, unknown> | null;
      const requestedCode = typeof metadata?.orgCode === "string" ? normalizeOrgCode(metadata.orgCode) : "";
      const byClerk = await db.organization.findUnique({ where: { clerkOrganizationId: event.data.id } });
      const bySlug = await db.organization.findUnique({ where: { slug: event.data.slug } });
      if (byClerk || bySlug) {
        await db.organization.update({ where: { id: (byClerk ?? bySlug)!.id }, data: { clerkOrganizationId: event.data.id, name: event.data.name, slug: event.data.slug, status: "ACTIVE", ...(requestedCode ? { orgCode: requestedCode } : {}) } });
      } else {
        await db.organization.create({ data: { clerkOrganizationId: event.data.id, name: event.data.name, slug: event.data.slug, orgCode: requestedCode || await generateUniqueOrgCode(event.data.name) } });
      }
    }

    if (event.type === "organization.deleted") {
      await db.organization.updateMany({ where: { clerkOrganizationId: event.data.id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
    }

    if (event.type === "organizationMembership.created" || event.type === "organizationMembership.updated") {
      const organization = await db.organization.upsert({
        where: { clerkOrganizationId: event.data.organization.id },
        create: { clerkOrganizationId: event.data.organization.id, name: event.data.organization.name, slug: event.data.organization.slug, orgCode: await generateUniqueOrgCode(event.data.organization.name) },
        update: { name: event.data.organization.name, slug: event.data.organization.slug, status: "ACTIVE" },
      });
      const email = event.data.public_user_data.identifier.toLowerCase();
      const user = await db.user.upsert({
        where: { email },
        create: { clerkUserId: event.data.public_user_data.user_id, email, firstName: event.data.public_user_data.first_name, lastName: event.data.public_user_data.last_name },
        update: { clerkUserId: event.data.public_user_data.user_id, firstName: event.data.public_user_data.first_name, lastName: event.data.public_user_data.last_name },
      });
      await db.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
        create: { organizationId: organization.id, userId: user.id, role: roleForClerk(event.data.role), permissions: event.data.permissions },
        update: { role: roleForClerk(event.data.role), permissions: event.data.permissions },
      });
    }

    if (event.type === "organizationMembership.deleted") {
      const organization = await db.organization.findUnique({ where: { clerkOrganizationId: event.data.organization.id } });
      const user = await db.user.findUnique({ where: { clerkUserId: event.data.public_user_data.user_id } });
      if (organization && user) {
        await db.organizationMembership.deleteMany({ where: { organizationId: organization.id, userId: user.id } });
      }
    }

    await db.webhookEvent.update({
      where: { provider_externalEventId: { provider: "CLERK", externalEventId } },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    logger.info("clerk.webhook.accepted", {
      ...context,
      providerEventType: event.type,
      providerEventId: event.data.id,
    });

    return Response.json({ received: true });
  } catch (error) {
    logger.warn("clerk.webhook.invalid_signature", { ...context, error });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
}
