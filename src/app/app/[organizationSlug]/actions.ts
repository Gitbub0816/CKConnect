"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { appendAuditEvent } from "@/lib/logging/audit";

const themeSchema = z.object({
  organizationSlug: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  surfaceColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  headingFont: z.string().max(80),
  bodyFont: z.string().max(80),
  borderRadius: z.coerce.number().int().min(0).max(40),
  density: z.enum(["compact", "comfortable", "spacious"]),
  darkMode: z.enum(["true", "false"]).transform((value) => value === "true"),
  logoUrl: z.string().url().or(z.literal("")),
  coverImageUrl: z.string().url().or(z.literal("")),
  portalHeadline: z.string().max(180),
  portalSubhead: z.string().max(500),
  navigationJson: z.string(),
  blocksJson: z.string(),
});

export async function publishAppearance(formData: FormData) {
  const input = themeSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "settings.manage");
  const navigation = z.array(z.object({ label: z.string().min(1).max(50), href: z.string().min(1).max(180) })).parse(JSON.parse(input.navigationJson));
  const blocks = z.array(z.record(z.string(), z.unknown())).min(1).max(30).parse(JSON.parse(input.blocksJson));
  const navigationJson = navigation as Prisma.InputJsonValue;
  const blocksJson = blocks as Prisma.InputJsonValue;
  const db = getDb();
  const before = await db.organizationTheme.findUnique({ where: { organizationId: organization.id } });
  await db.$transaction(async (tx) => {
    await tx.organizationTheme.upsert({
      where: { organizationId: organization.id },
      update: {
        primaryColor: input.primaryColor, accentColor: input.accentColor, surfaceColor: input.surfaceColor,
        backgroundColor: input.backgroundColor, textColor: input.textColor, headingFont: input.headingFont,
        bodyFont: input.bodyFont, borderRadius: input.borderRadius, density: input.density, darkMode: input.darkMode,
        logoUrl: input.logoUrl || null, coverImageUrl: input.coverImageUrl || null, portalHeadline: input.portalHeadline,
        portalSubhead: input.portalSubhead, navigationJson, pageBlocksJson: blocksJson,
      },
      create: {
        organizationId: organization.id, primaryColor: input.primaryColor, accentColor: input.accentColor,
        surfaceColor: input.surfaceColor, backgroundColor: input.backgroundColor, textColor: input.textColor,
        headingFont: input.headingFont, bodyFont: input.bodyFont, borderRadius: input.borderRadius,
        density: input.density, darkMode: input.darkMode, logoUrl: input.logoUrl || null,
        coverImageUrl: input.coverImageUrl || null, portalHeadline: input.portalHeadline,
        portalSubhead: input.portalSubhead, navigationJson, pageBlocksJson: blocksJson,
      },
    });
    const latest = await tx.endpointPage.findFirst({ where: { organizationId: organization.id, slug: "home" }, orderBy: { version: "desc" } });
    await tx.endpointPage.updateMany({ where: { organizationId: organization.id, slug: "home", status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
    await tx.endpointPage.create({
      data: {
        organizationId: organization.id, slug: "home", title: input.portalHeadline, status: "PUBLISHED",
        version: (latest?.version ?? 0) + 1, navigationJson, blocksJson,
        seoJson: { title: `${organization.name} | Client Services`, description: input.portalSubhead },
        settingsJson: { density: input.density, darkMode: input.darkMode }, publishedAt: new Date(),
      },
    });
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "endpoint.appearance.published",
    entityType: "OrganizationTheme",
    entityId: before?.id,
    before,
    after: { ...input, navigationJson: navigation, blocksJson: blocks },
    category: "ADMIN",
    retentionClass: "SECURITY_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/appearance`);
  revalidatePath(`/p/${input.organizationSlug}`);
}

const recordSchema = z.object({
  organizationSlug: z.string().min(1),
  module: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  secondary: z.string().trim().max(180).optional().default(""),
  email: z.string().trim().email().or(z.literal("")).optional().default(""),
  amount: z.coerce.number().min(0).optional().default(0),
  status: z.string().max(50).optional().default(""),
  date: z.string().optional().default(""),
});

export async function createWorkspaceRecord(formData: FormData) {
  const input = recordSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, `${input.module}.write`);
  if (!user) throw new Error("A signed-in user is required to create records");
  const db = getDb();
  let entityType = input.module;
  let entityId: string;
  switch (input.module) {
    case "leads": {
      const [firstName, ...rest] = input.name.split(" ");
      const record = await db.lead.create({ data: { organizationId: organization.id, firstName, lastName: rest.join(" ") || null, company: input.secondary || null, email: input.email || null, estimatedValue: input.amount, source: "Manual", status: "NEW" } });
      entityType = "Lead"; entityId = record.id; break;
    }
    case "accounts": {
      const record = await db.crmAccount.create({ data: { organizationId: organization.id, name: input.name, industry: input.secondary || null, accountType: input.status || "PROSPECT" } });
      entityType = "CrmAccount"; entityId = record.id; break;
    }
    case "contacts": {
      const [firstName, ...rest] = input.name.split(" ");
      const record = await db.contact.create({ data: { organizationId: organization.id, firstName, lastName: rest.join(" ") || null, jobTitle: input.secondary || null, email: input.email || null } });
      entityType = "Contact"; entityId = record.id; break;
    }
    case "deals": {
      const record = await db.deal.create({ data: { organizationId: organization.id, name: input.name, amount: input.amount, stage: "PROSPECTING", probability: 10, expectedCloseDate: input.date ? new Date(input.date) : null, nextStep: input.secondary || null } });
      entityType = "Deal"; entityId = record.id; break;
    }
    case "tasks": {
      const record = await db.task.create({ data: { organizationId: organization.id, title: input.name, description: input.secondary || null, priority: input.status || "NORMAL", dueAt: input.date ? new Date(input.date) : null, createdById: user.id, assignedToId: user.id } });
      entityType = "Task"; entityId = record.id; break;
    }
    case "cases": {
      const count = await db.supportCase.count({ where: { organizationId: organization.id } });
      const record = await db.supportCase.create({ data: { organizationId: organization.id, caseNumber: `CS-${String(count + 1).padStart(5, "0")}`, subject: input.name, description: input.secondary || null, priority: input.status || "NORMAL" } });
      entityType = "SupportCase"; entityId = record.id; break;
    }
    case "campaigns": {
      const record = await db.campaign.create({ data: { organizationId: organization.id, name: input.name, type: input.secondary || "EMAIL", status: input.status || "DRAFT", budget: input.amount || null, startsAt: input.date ? new Date(input.date) : null } });
      entityType = "Campaign"; entityId = record.id; break;
    }
    case "calendar": {
      const start = input.date ? new Date(input.date) : new Date();
      const record = await db.calendarEvent.create({ data: { organizationId: organization.id, title: input.name, description: input.secondary || null, eventType: input.status || "MEETING", startsAt: start, endsAt: new Date(start.getTime() + 3_600_000), ownerUserId: user.id } });
      entityType = "CalendarEvent"; entityId = record.id; break;
    }
    case "invoices": {
      const count = await db.invoice.count({ where: { organizationId: organization.id } });
      const issueDate = new Date();
      const record = await db.invoice.create({ data: { organizationId: organization.id, invoiceNumber: `CK-${String(count + 1001)}`, status: "DRAFT", issueDate, dueDate: input.date ? new Date(input.date) : new Date(issueDate.getTime() + 30 * 86_400_000), subtotal: input.amount, total: input.amount, balanceDue: input.amount, notes: input.secondary || null, items: { create: { description: input.name, quantity: 1, unitPrice: input.amount, lineTotal: input.amount } } } });
      entityType = "Invoice"; entityId = record.id; break;
    }
    case "expenses": {
      const record = await db.expense.create({ data: { organizationId: organization.id, description: input.name, category: input.secondary || null, amount: input.amount, incurredAt: input.date ? new Date(input.date) : new Date() } });
      entityType = "Expense"; entityId = record.id; break;
    }
    case "vendors": {
      const record = await db.vendor.create({ data: { organizationId: organization.id, name: input.name, email: input.email || null, phone: input.secondary || null } });
      entityType = "Vendor"; entityId = record.id; break;
    }
    case "products": {
      const record = await db.product.create({ data: { organizationId: organization.id, name: input.name, sku: input.secondary || null, price: input.amount, type: input.status || "SERVICE" } });
      entityType = "Product"; entityId = record.id; break;
    }
    default:
      throw new Error(`Creating ${input.module} records is not available from this view`);
  }
  await appendAuditEvent({ organizationId: organization.id, actorUserId: user.id, action: `${input.module}.created`, entityType, entityId, after: input, category: ["invoices", "expenses"].includes(input.module) ? "FINANCIAL" : "BUSINESS", retentionClass: ["invoices", "expenses"].includes(input.module) ? "FINANCIAL_7Y" : "STANDARD" });
  revalidatePath(`/app/${input.organizationSlug}/${input.module}`);
  revalidatePath(`/app/${input.organizationSlug}`);
}
