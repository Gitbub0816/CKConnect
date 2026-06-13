"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requirePlatformAdmin } from "@/lib/admin-authorization";
import { getDb } from "@/lib/db";
import { orgCodeSchema, tenantSlugSchema } from "@/lib/identifiers";

const tenantProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional(),
  slug: tenantSlugSchema,
  orgCode: orgCodeSchema,
  timezone: z.string().trim().min(3).max(80),
  defaultCurrency: z.string().trim().toUpperCase().length(3),
  billingTier: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
});

export async function createTenant(formData: FormData) {
  const input = tenantProfileSchema.parse(Object.fromEntries(formData));
  const admin = await requirePlatformAdmin("tenants.manage");
  const db = getDb();
  const tenant = await db.organization.create({
    data: {
      ...input,
      legalName: input.legalName || null,
      theme: { create: {} },
      tenantSettings: { create: {} },
      moduleConfiguration: { create: {} },
      usage: { create: {} },
      paymentProviderConnections: {
        create: { provider: "MANUAL", status: "ACTIVE", isDefault: true, metadata: { label: "Authorized manual payment" } },
      },
    },
  });
  await db.adminActionLog.create({
    data: {
      actorUserId: admin.id,
      organizationId: tenant.id,
      action: "tenant.create",
      resourceType: "Organization",
      resourceId: tenant.publicId,
      reason: "Created from ClearKey administration",
      afterJson: tenant as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/internal-admin");
}

export async function updateTenantProfile(formData: FormData) {
  const input = tenantProfileSchema.extend({ organizationId: z.string().uuid(), reason: z.string().trim().min(5).max(500) }).parse(Object.fromEntries(formData));
  const admin = await requirePlatformAdmin("tenants.manage");
  const db = getDb();
  const before = await db.organization.findUniqueOrThrow({ where: { id: input.organizationId } });
  const after = await db.organization.update({
    where: { id: before.id },
    data: {
      name: input.name,
      legalName: input.legalName || null,
      slug: input.slug,
      orgCode: input.orgCode,
      timezone: input.timezone,
      defaultCurrency: input.defaultCurrency,
      billingTier: input.billingTier,
    },
  });
  await db.adminActionLog.create({
    data: {
      actorUserId: admin.id,
      organizationId: before.id,
      action: "tenant.update",
      resourceType: "Organization",
      resourceId: before.publicId,
      reason: input.reason,
      beforeJson: before as unknown as Prisma.InputJsonValue,
      afterJson: after as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/internal-admin");
  revalidatePath(`/internal-admin/tenants/${before.id}`);
}

export async function manageTenantLifecycle(formData: FormData) {
  const input = z.object({ organizationId: z.string().uuid(), command: z.enum(["SUSPEND", "REACTIVATE", "RESTRICT", "REMOVE"]), reason: z.string().trim().min(5).max(500) }).parse(Object.fromEntries(formData));
  const admin = await requirePlatformAdmin("tenants.manage");
  if (input.command === "REMOVE" && admin.adminRole !== "super_admin") throw new Error("Only a super administrator may remove a tenant");
  const db = getDb();
  const before = await db.organization.findUniqueOrThrow({ where: { id: input.organizationId } });
  const operationalStatus = input.command === "SUSPEND" ? "SUSPENDED" : input.command === "RESTRICT" ? "MANUAL_REVIEW" : input.command === "REMOVE" ? "CANCELED" : "ACTIVE";
  const after = await db.organization.update({ where: { id: before.id }, data: { operationalStatus, ...(input.command === "REMOVE" ? { deletedAt: new Date() } : input.command === "REACTIVATE" ? { deletedAt: null } : {}) } });
  await db.adminActionLog.create({ data: { actorUserId: admin.id, organizationId: before.id, action: `tenant.${input.command.toLowerCase()}`, resourceType: "Organization", resourceId: before.publicId, reason: input.reason, beforeJson: before as unknown as Prisma.InputJsonValue, afterJson: after as unknown as Prisma.InputJsonValue } });
  revalidatePath("/internal-admin");
  revalidatePath(`/internal-admin/tenants/${before.id}`);
}

export async function replyAsClearKey(formData: FormData) {
  const input = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(5000), status: z.enum(["OPEN", "WAITING_TENANT", "RESOLVED", "CLOSED"]) }).parse(Object.fromEntries(formData));
  const admin = await requirePlatformAdmin("support.manage");
  const ticket = await getDb().platformSupportTicket.findUniqueOrThrow({ where: { id: input.ticketId } });
  await getDb().$transaction([
    getDb().platformSupportMessage.create({ data: { ticketId: ticket.id, authorUserId: admin.id, authorType: "CLEARKEY", body: input.body } }),
    getDb().platformSupportTicket.update({ where: { id: ticket.id }, data: { status: input.status, assignedAdminId: admin.id, closedAt: input.status === "CLOSED" ? new Date() : null } }),
    getDb().adminActionLog.create({ data: { actorUserId: admin.id, organizationId: ticket.organizationId, action: "support.reply", resourceType: "PlatformSupportTicket", resourceId: ticket.publicId, afterJson: { status: input.status } } }),
  ]);
  revalidatePath("/internal-admin");
}
