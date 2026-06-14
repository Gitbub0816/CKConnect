"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { appendAuditEvent } from "@/lib/logging/audit";
import { CloudflareDnsProvider } from "@/lib/integrations/dns-provider";
import { publishSiteManifest } from "@/lib/integrations/cloudflare-edge";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl } from "@/lib/integrations/stripe-workflows";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function assertAccountingDateOpen(organizationId: string, date: Date) {
  const locked = await getDb().accountingPeriod.findFirst({
    where: {
      organizationId,
      status: "LOCKED",
      startsOn: { lte: date },
      endsOn: { gte: date },
    },
  });
  if (locked) throw new Error(`Accounting period ${locked.name} is locked`);
}

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
  faviconUrl: z.string().url().or(z.literal("")),
  coverImageUrl: z.string().url().or(z.literal("")),
  portalHeadline: z.string().max(180),
  portalSubhead: z.string().max(500),
  navigationJson: z.string(),
  blocksJson: z.string(),
  pageSettingsJson: z.string(),
  consoleTitle: z.string().max(100),
  consoleLogoUrl: z.string().url().or(z.literal("")),
  consoleBackgroundImageUrl: z.string().url().or(z.literal("")),
  consolePrimaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleSidebarColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleBackgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleSurfaceColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleTextColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleMutedColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleHeaderColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  consoleFont: z.string().max(80),
  consoleRadius: z.coerce.number().int().min(0).max(32),
  consoleDensity: z.enum(["compact", "comfortable", "spacious"]),
  consoleNavigationStyle: z.enum(["sidebar", "rail"]),
  paymentTitle: z.string().max(100),
  paymentSubtitle: z.string().max(240),
  paymentLogoUrl: z.string().url().or(z.literal("")),
  paymentBackgroundImageUrl: z.string().url().or(z.literal("")),
  paymentPrimaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentHeaderColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentBackgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentSurfaceColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentTextColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentMutedColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  paymentFont: z.string().max(80),
  paymentRadius: z.coerce.number().int().min(0).max(32),
  paymentFooterText: z.string().max(180),
});

export async function publishAppearance(formData: FormData) {
  const input = themeSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "settings.manage",
  );
  const navigation = z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        href: z.string().min(1).max(180),
      }),
    )
    .parse(JSON.parse(input.navigationJson));
  const blocks = z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(30)
    .parse(JSON.parse(input.blocksJson));
  const pageSettings = z
    .object({
      showClientPortal: z.boolean(),
      showPoweredBy: z.boolean(),
      navigationAlignment: z.enum(["left", "center", "right"]),
      buttonStyle: z.enum(["solid", "outline", "pill"]),
      sectionSpacing: z.enum(["compact", "comfortable", "spacious"]),
      maxWidth: z.enum(["standard", "wide", "full"]),
      logoSize: z.number().int().min(28).max(96),
      coverOverlay: z.number().int().min(0).max(100),
    })
    .parse(JSON.parse(input.pageSettingsJson));
  const navigationJson = navigation as Prisma.InputJsonValue;
  const blocksJson = blocks as Prisma.InputJsonValue;
  const db = getDb();
  const before = await db.organizationTheme.findUnique({
    where: { organizationId: organization.id },
  });
  await db.$transaction(async (tx) => {
    await tx.organizationTheme.upsert({
      where: { organizationId: organization.id },
      update: {
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        surfaceColor: input.surfaceColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
        headingFont: input.headingFont,
        bodyFont: input.bodyFont,
        borderRadius: input.borderRadius,
        density: input.density,
        darkMode: input.darkMode,
        logoUrl: input.logoUrl || null,
        faviconUrl: input.faviconUrl || null,
        coverImageUrl: input.coverImageUrl || null,
        portalHeadline: input.portalHeadline,
        portalSubhead: input.portalSubhead,
        navigationJson,
        pageBlocksJson: blocksJson,
        consoleTitle: input.consoleTitle || null,
        consoleLogoUrl: input.consoleLogoUrl || null,
        consoleBackgroundImageUrl: input.consoleBackgroundImageUrl || null,
        consolePrimaryColor: input.consolePrimaryColor,
        consoleSidebarColor: input.consoleSidebarColor,
        consoleBackgroundColor: input.consoleBackgroundColor,
        consoleSurfaceColor: input.consoleSurfaceColor,
        consoleTextColor: input.consoleTextColor,
        consoleMutedColor: input.consoleMutedColor,
        consoleHeaderColor: input.consoleHeaderColor,
        consoleFont: input.consoleFont,
        consoleRadius: input.consoleRadius,
        consoleDensity: input.consoleDensity,
        consoleNavigationStyle: input.consoleNavigationStyle,
        paymentTitle: input.paymentTitle || null,
        paymentSubtitle: input.paymentSubtitle || null,
        paymentLogoUrl: input.paymentLogoUrl || null,
        paymentBackgroundImageUrl: input.paymentBackgroundImageUrl || null,
        paymentPrimaryColor: input.paymentPrimaryColor,
        paymentHeaderColor: input.paymentHeaderColor,
        paymentBackgroundColor: input.paymentBackgroundColor,
        paymentSurfaceColor: input.paymentSurfaceColor,
        paymentTextColor: input.paymentTextColor,
        paymentMutedColor: input.paymentMutedColor,
        paymentFont: input.paymentFont,
        paymentRadius: input.paymentRadius,
        paymentFooterText: input.paymentFooterText || null,
      },
      create: {
        organizationId: organization.id,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        surfaceColor: input.surfaceColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
        headingFont: input.headingFont,
        bodyFont: input.bodyFont,
        borderRadius: input.borderRadius,
        density: input.density,
        darkMode: input.darkMode,
        logoUrl: input.logoUrl || null,
        faviconUrl: input.faviconUrl || null,
        coverImageUrl: input.coverImageUrl || null,
        portalHeadline: input.portalHeadline,
        portalSubhead: input.portalSubhead,
        navigationJson,
        pageBlocksJson: blocksJson,
        consoleTitle: input.consoleTitle || null,
        consoleLogoUrl: input.consoleLogoUrl || null,
        consoleBackgroundImageUrl: input.consoleBackgroundImageUrl || null,
        consolePrimaryColor: input.consolePrimaryColor,
        consoleSidebarColor: input.consoleSidebarColor,
        consoleBackgroundColor: input.consoleBackgroundColor,
        consoleSurfaceColor: input.consoleSurfaceColor,
        consoleTextColor: input.consoleTextColor,
        consoleMutedColor: input.consoleMutedColor,
        consoleHeaderColor: input.consoleHeaderColor,
        consoleFont: input.consoleFont,
        consoleRadius: input.consoleRadius,
        consoleDensity: input.consoleDensity,
        consoleNavigationStyle: input.consoleNavigationStyle,
        paymentTitle: input.paymentTitle || null,
        paymentSubtitle: input.paymentSubtitle || null,
        paymentLogoUrl: input.paymentLogoUrl || null,
        paymentBackgroundImageUrl: input.paymentBackgroundImageUrl || null,
        paymentPrimaryColor: input.paymentPrimaryColor,
        paymentHeaderColor: input.paymentHeaderColor,
        paymentBackgroundColor: input.paymentBackgroundColor,
        paymentSurfaceColor: input.paymentSurfaceColor,
        paymentTextColor: input.paymentTextColor,
        paymentMutedColor: input.paymentMutedColor,
        paymentFont: input.paymentFont,
        paymentRadius: input.paymentRadius,
        paymentFooterText: input.paymentFooterText || null,
      },
    });
    const latest = await tx.endpointPage.findFirst({
      where: { organizationId: organization.id, slug: "home" },
      orderBy: { version: "desc" },
    });
    await tx.endpointPage.updateMany({
      where: {
        organizationId: organization.id,
        slug: "home",
        status: "PUBLISHED",
      },
      data: { status: "ARCHIVED" },
    });
    await tx.endpointPage.create({
      data: {
        organizationId: organization.id,
        slug: "home",
        title: input.portalHeadline,
        status: "PUBLISHED",
        version: (latest?.version ?? 0) + 1,
        navigationJson,
        blocksJson,
        seoJson: {
          title: `${organization.name} | Client Services`,
          description: input.portalSubhead,
        },
        settingsJson: {
          ...pageSettings,
          density: input.density,
          darkMode: input.darkMode,
        },
        publishedAt: new Date(),
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
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    `${input.module}.write`,
  );
  if (!user) throw new Error("A signed-in user is required to create records");
  const db = getDb();
  let entityType = input.module;
  let entityId: string;
  switch (input.module) {
    case "leads": {
      const [firstName, ...rest] = input.name.split(" ");
      const record = await db.lead.create({
        data: {
          organizationId: organization.id,
          firstName,
          lastName: rest.join(" ") || null,
          company: input.secondary || null,
          email: input.email || null,
          estimatedValue: input.amount,
          source: "Manual",
          status: "NEW",
        },
      });
      entityType = "Lead";
      entityId = record.id;
      break;
    }
    case "accounts": {
      const record = await db.crmAccount.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          industry: input.secondary || null,
          accountType: input.status || "PROSPECT",
        },
      });
      entityType = "CrmAccount";
      entityId = record.id;
      break;
    }
    case "contacts": {
      const [firstName, ...rest] = input.name.split(" ");
      const record = await db.contact.create({
        data: {
          organizationId: organization.id,
          firstName,
          lastName: rest.join(" ") || null,
          jobTitle: input.secondary || null,
          email: input.email || null,
        },
      });
      entityType = "Contact";
      entityId = record.id;
      break;
    }
    case "deals": {
      const record = await db.deal.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          amount: input.amount,
          stage: "PROSPECTING",
          probability: 10,
          expectedCloseDate: input.date ? new Date(input.date) : null,
          nextStep: input.secondary || null,
        },
      });
      entityType = "Deal";
      entityId = record.id;
      break;
    }
    case "tasks": {
      const record = await db.task.create({
        data: {
          organizationId: organization.id,
          title: input.name,
          description: input.secondary || null,
          priority: input.status || "NORMAL",
          dueAt: input.date ? new Date(input.date) : null,
          createdById: user.id,
          assignedToId: user.id,
        },
      });
      entityType = "Task";
      entityId = record.id;
      break;
    }
    case "cases": {
      const count = await db.supportCase.count({
        where: { organizationId: organization.id },
      });
      const record = await db.supportCase.create({
        data: {
          organizationId: organization.id,
          caseNumber: `CS-${String(count + 1).padStart(5, "0")}`,
          subject: input.name,
          description: input.secondary || null,
          priority: input.status || "NORMAL",
        },
      });
      entityType = "SupportCase";
      entityId = record.id;
      break;
    }
    case "campaigns": {
      const record = await db.campaign.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          type: input.secondary || "EMAIL",
          status: input.status || "DRAFT",
          budget: input.amount || null,
          startsAt: input.date ? new Date(input.date) : null,
        },
      });
      entityType = "Campaign";
      entityId = record.id;
      break;
    }
    case "calendar": {
      const start = input.date ? new Date(input.date) : new Date();
      const record = await db.calendarEvent.create({
        data: {
          organizationId: organization.id,
          title: input.name,
          description: input.secondary || null,
          eventType: input.status || "MEETING",
          startsAt: start,
          endsAt: new Date(start.getTime() + 3_600_000),
          ownerUserId: user.id,
        },
      });
      entityType = "CalendarEvent";
      entityId = record.id;
      break;
    }
    case "invoices": {
      const count = await db.invoice.count({
        where: { organizationId: organization.id },
      });
      const issueDate = new Date();
      const record = await db.invoice.create({
        data: {
          organizationId: organization.id,
          invoiceNumber: `CK-${String(count + 1001)}`,
          status: "DRAFT",
          issueDate,
          dueDate: input.date
            ? new Date(input.date)
            : new Date(issueDate.getTime() + 30 * 86_400_000),
          subtotal: input.amount,
          total: input.amount,
          balanceDue: input.amount,
          notes: input.secondary || null,
          items: {
            create: {
              description: input.name,
              quantity: 1,
              unitPrice: input.amount,
              lineTotal: input.amount,
            },
          },
        },
      });
      entityType = "Invoice";
      entityId = record.id;
      break;
    }
    case "expenses": {
      const record = await db.expense.create({
        data: {
          organizationId: organization.id,
          description: input.name,
          category: input.secondary || null,
          amount: input.amount,
          incurredAt: input.date ? new Date(input.date) : new Date(),
        },
      });
      entityType = "Expense";
      entityId = record.id;
      break;
    }
    case "vendors": {
      const record = await db.vendor.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          email: input.email || null,
          phone: input.secondary || null,
        },
      });
      entityType = "Vendor";
      entityId = record.id;
      break;
    }
    case "products": {
      const record = await db.product.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          sku: input.secondary || null,
          price: input.amount,
          type: input.status || "SERVICE",
        },
      });
      entityType = "Product";
      entityId = record.id;
      break;
    }
    default:
      throw new Error(
        `Creating ${input.module} records is not available from this view`,
      );
  }
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `${input.module}.created`,
    entityType,
    entityId,
    after: input,
    category: ["invoices", "expenses"].includes(input.module)
      ? "FINANCIAL"
      : "BUSINESS",
    retentionClass: ["invoices", "expenses"].includes(input.module)
      ? "FINANCIAL_7Y"
      : "STANDARD",
  });
  revalidatePath(`/app/${input.organizationSlug}/${input.module}`);
  revalidatePath(`/app/${input.organizationSlug}`);
}

const entityActionSchema = z.object({
  organizationSlug: z.string().min(1),
  entityId: z.string().uuid(),
});

const stageProbability = {
  PROSPECTING: 10,
  QUALIFICATION: 25,
  NEEDS_ANALYSIS: 45,
  PROPOSAL: 65,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
} as const;

export async function convertLead(formData: FormData) {
  const input = entityActionSchema
    .extend({
      createDeal: z
        .string()
        .optional()
        .transform((value) => value === "on"),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "leads.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const lead = await db.lead.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  if (lead.status === "CONVERTED") throw new Error("Lead is already converted");

  const result = await db.$transaction(async (tx) => {
    const account = lead.company
      ? await tx.crmAccount.upsert({
          where: {
            organizationId_name: {
              organizationId: organization.id,
              name: lead.company,
            },
          },
          update: { accountType: "PROSPECT" },
          create: {
            organizationId: organization.id,
            name: lead.company,
            accountType: "PROSPECT",
          },
        })
      : null;
    const existingContact = lead.email
      ? await tx.contact.findFirst({
          where: { organizationId: organization.id, email: lead.email },
        })
      : null;
    const contact =
      existingContact ??
      (await tx.contact.create({
        data: {
          organizationId: organization.id,
          accountId: account?.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          lifecycleStatus: "PROSPECT",
        },
      }));
    const deal = input.createDeal
      ? await tx.deal.create({
          data: {
            organizationId: organization.id,
            accountId: account?.id,
            primaryContactId: contact.id,
            name: `${lead.company ?? `${lead.firstName} ${lead.lastName ?? ""}`.trim()} opportunity`,
            amount: lead.estimatedValue ?? 0,
            stage: "QUALIFICATION",
            probability: stageProbability.QUALIFICATION,
            nextStep: "Complete discovery and confirm scope",
            expectedCloseDate: new Date(Date.now() + 30 * 86_400_000),
          },
        })
      : null;
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
    await tx.activity.create({
      data: {
        organizationId: organization.id,
        contactId: contact.id,
        type: "LEAD_CONVERTED",
        subject: "Lead converted",
        body: deal
          ? `Created account, contact, and opportunity ${deal.name}.`
          : "Created account and contact.",
        actorUserId: user.id,
        metadata: {
          leadId: lead.id,
          accountId: account?.id,
          contactId: contact.id,
          dealId: deal?.id,
        },
      },
    });
    return { account, contact, deal };
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "lead.converted",
    entityType: "Lead",
    entityId: lead.id,
    before: lead,
    after: {
      status: "CONVERTED",
      accountId: result.account?.id,
      contactId: result.contact.id,
      dealId: result.deal?.id,
    },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/leads`);
  revalidatePath(`/app/${input.organizationSlug}/accounts`);
  revalidatePath(`/app/${input.organizationSlug}/deals`);
}

export async function changeDealStage(formData: FormData) {
  const input = entityActionSchema
    .extend({
      stage: z.enum([
        "PROSPECTING",
        "QUALIFICATION",
        "NEEDS_ANALYSIS",
        "PROPOSAL",
        "NEGOTIATION",
        "CLOSED_WON",
        "CLOSED_LOST",
      ]),
      nextStep: z.string().trim().max(240).optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "deals.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.deal.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const result = await db.$transaction(async (tx) => {
    const deal = await tx.deal.update({
      where: { id: before.id },
      data: {
        stage: input.stage,
        probability: stageProbability[input.stage],
        nextStep: input.nextStep || before.nextStep,
        closedAt: input.stage.startsWith("CLOSED") ? new Date() : null,
      },
    });
    let invoiceId: string | undefined;
    if (
      input.stage === "CLOSED_WON" &&
      before.stage !== "CLOSED_WON" &&
      before.accountId
    ) {
      const invoiceNumber = `CK-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
      const invoice = await tx.invoice.create({
        data: {
          organizationId: organization.id,
          accountId: before.accountId,
          contactId: before.primaryContactId,
          invoiceNumber,
          status: "DRAFT",
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86_400_000),
          subtotal: before.amount,
          total: before.amount,
          balanceDue: before.amount,
          notes: `Created from won opportunity: ${before.name}`,
          publicTokenId: nanoid(32),
          items: {
            create: {
              description: before.name,
              quantity: 1,
              unitPrice: before.amount,
              lineTotal: before.amount,
            },
          },
        },
      });
      invoiceId = invoice.id;
    }
    await tx.activity.create({
      data: {
        organizationId: organization.id,
        contactId: before.primaryContactId,
        type: "DEAL_STAGE_CHANGED",
        subject: `${before.name}: ${before.stage} to ${input.stage}`,
        actorUserId: user.id,
        metadata: {
          dealId: before.id,
          from: before.stage,
          to: input.stage,
          invoiceId,
        },
      },
    });
    return { deal, invoiceId };
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "deal.stage.changed",
    entityType: "Deal",
    entityId: before.id,
    before,
    after: result,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/deals`);
  revalidatePath(`/app/${input.organizationSlug}/invoices`);
}

export async function sendInvoice(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "invoices.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.invoice.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { contact: true, account: true },
  });
  await assertAccountingDateOpen(organization.id, before.issueDate);
  if (["PAID", "VOID"].includes(before.status))
    throw new Error(`A ${before.status.toLowerCase()} invoice cannot be sent`);
  const result = await db.$transaction(async (tx) => {
    const receivable = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "1100" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "1100",
        name: "Accounts Receivable",
        type: "ASSET",
        systemAccount: true,
      },
    });
    const revenue = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "4000" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "4000",
        name: "Service Revenue",
        type: "INCOME",
        systemAccount: true,
      },
    });
    let postedJournalId = before.postedJournalId;
    if (!postedJournalId) {
      const count = await tx.journalEntry.count({
        where: { organizationId: organization.id },
      });
      const journal = await tx.journalEntry.create({
        data: {
          organizationId: organization.id,
          entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
          entryDate: before.issueDate,
          description: `Invoice ${before.invoiceNumber}`,
          status: "POSTED",
          sourceModule: "INVOICE",
          sourceId: before.id,
          createdById: user.id,
          postedAt: new Date(),
          lines: {
            create: [
              {
                ledgerAccountId: receivable.id,
                debit: before.total,
                credit: 0,
                description: before.account?.name ?? before.invoiceNumber,
              },
              {
                ledgerAccountId: revenue.id,
                debit: 0,
                credit: before.total,
                description: before.account?.name ?? before.invoiceNumber,
                sortOrder: 1,
              },
            ],
          },
        },
      });
      postedJournalId = journal.id;
    }
    const invoice = await tx.invoice.update({
      where: { id: before.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        publicTokenId: before.publicTokenId ?? nanoid(32),
        postedJournalId,
      },
    });
    if (before.contact?.email) {
      await tx.emailMessage.create({
        data: {
          organizationId: organization.id,
          recipientEmail: before.contact.email,
          recipientName:
            `${before.contact.firstName} ${before.contact.lastName ?? ""}`.trim(),
          subject: `Invoice ${before.invoiceNumber} from ${organization.name}`,
          bodyHtml: `<p>Your invoice is ready. Use your secure ClearKey payment page to review and pay the balance.</p>`,
          status: process.env.MAILERSEND_API_KEY
            ? "QUEUED"
            : "PENDING_CONFIGURATION",
          relatedType: "INVOICE",
          relatedId: before.id,
        },
      });
    }
    return invoice;
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "invoice.sent_and_posted",
    entityType: "Invoice",
    entityId: before.id,
    before,
    after: result,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/invoices`);
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
  revalidatePath(`/app/${input.organizationSlug}/email`);
}

export async function resolveBankTransaction(formData: FormData) {
  const input = entityActionSchema
    .extend({
      resolution: z.enum(["EXPENSE", "PAYMENT"]),
      invoiceId: z.string().uuid().optional().or(z.literal("")),
      category: z.string().trim().max(100).optional().default("Uncategorized"),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounting.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const transaction = await db.bankTransaction.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { bankAccount: true },
  });
  await assertAccountingDateOpen(organization.id, transaction.postedAt);
  if (transaction.status === "MATCHED")
    throw new Error("Bank transaction is already matched");
  const amount = Math.abs(Number(transaction.amount));

  const result = await db.$transaction(async (tx) => {
    const cash = transaction.bankAccount.ledgerAccountId
      ? await tx.ledgerAccount.findUniqueOrThrow({
          where: { id: transaction.bankAccount.ledgerAccountId },
        })
      : await tx.ledgerAccount.upsert({
          where: {
            organizationId_code: {
              organizationId: organization.id,
              code: "1000",
            },
          },
          update: {},
          create: {
            organizationId: organization.id,
            code: "1000",
            name: "Operating Cash",
            type: "ASSET",
            systemAccount: true,
          },
        });
    const count = await tx.journalEntry.count({
      where: { organizationId: organization.id },
    });
    let matchedEntityId: string;
    let matchedEntityType: string;
    if (input.resolution === "PAYMENT") {
      if (!input.invoiceId)
        throw new Error("Choose an invoice for a customer payment");
      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, organizationId: organization.id },
      });
      const appliedAmount = Math.min(amount, Number(invoice.balanceDue));
      const payment = await tx.payment.create({
        data: {
          organizationId: organization.id,
          amount,
          status: "SUCCEEDED",
          method: "BANK",
          referenceNumber: transaction.description,
          receivedAt: transaction.postedAt,
        },
      });
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: appliedAmount,
        },
      });
      const remaining = Math.max(0, Number(invoice.balanceDue) - appliedAmount);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: { increment: appliedAmount },
          balanceDue: remaining,
          status: remaining === 0 ? "PAID" : "PARTIALLY_PAID",
          paidAt: remaining === 0 ? new Date() : null,
        },
      });
      const receivable = await tx.ledgerAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: "1100",
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          code: "1100",
          name: "Accounts Receivable",
          type: "ASSET",
          systemAccount: true,
        },
      });
      const journal = await tx.journalEntry.create({
        data: {
          organizationId: organization.id,
          entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
          entryDate: transaction.postedAt,
          description: `Payment applied to ${invoice.invoiceNumber}`,
          status: "POSTED",
          sourceModule: "PAYMENT",
          sourceId: payment.id,
          createdById: user.id,
          postedAt: new Date(),
          lines: {
            create: [
              { ledgerAccountId: cash.id, debit: amount, credit: 0 },
              {
                ledgerAccountId: receivable.id,
                debit: 0,
                credit: amount,
                sortOrder: 1,
              },
            ],
          },
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { postedJournalId: journal.id },
      });
      matchedEntityId = payment.id;
      matchedEntityType = "PAYMENT";
    } else {
      const expenseAccount = await tx.ledgerAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: "6100",
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          code: "6100",
          name: "Operating Expenses",
          type: "EXPENSE",
          systemAccount: true,
        },
      });
      const expense = await tx.expense.create({
        data: {
          organizationId: organization.id,
          description: transaction.description,
          amount,
          incurredAt: transaction.postedAt,
          category: input.category,
        },
      });
      const journal = await tx.journalEntry.create({
        data: {
          organizationId: organization.id,
          entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
          entryDate: transaction.postedAt,
          description: transaction.description,
          status: "POSTED",
          sourceModule: "EXPENSE",
          sourceId: expense.id,
          createdById: user.id,
          postedAt: new Date(),
          lines: {
            create: [
              { ledgerAccountId: expenseAccount.id, debit: amount, credit: 0 },
              {
                ledgerAccountId: cash.id,
                debit: 0,
                credit: amount,
                sortOrder: 1,
              },
            ],
          },
        },
      });
      await tx.expense.update({
        where: { id: expense.id },
        data: { postedJournalId: journal.id },
      });
      matchedEntityId = expense.id;
      matchedEntityType = "EXPENSE";
    }
    await tx.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "MATCHED",
        category: input.category,
        matchedEntityId,
        matchedEntityType,
      },
    });
    return { matchedEntityId, matchedEntityType };
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "bank_transaction.resolved",
    entityType: "BankTransaction",
    entityId: transaction.id,
    before: transaction,
    after: result,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/banking`);
  revalidatePath(`/app/${input.organizationSlug}/invoices`);
  revalidatePath(`/app/${input.organizationSlug}/expenses`);
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function runAutomation(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "automations.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const rule = await db.automationRule.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const run = await db.automationRun.create({
    data: {
      organizationId: organization.id,
      automationRuleId: rule.id,
      status: "RUNNING",
      triggerPayload: { manual: true, actorUserId: user.id },
    },
  });
  try {
    let results: Record<string, unknown>[] = [];
    if (rule.triggerType === "INVOICE_OVERDUE") {
      const invoices = await db.invoice.findMany({
        where: {
          organizationId: organization.id,
          balanceDue: { gt: 0 },
          dueDate: { lt: new Date() },
          status: { notIn: ["PAID", "VOID"] },
        },
        include: { contact: true },
      });
      await db.$transaction(async (tx) => {
        for (const invoice of invoices) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: "OVERDUE" },
          });
          if (invoice.contact?.email) {
            await tx.emailMessage.create({
              data: {
                organizationId: organization.id,
                recipientEmail: invoice.contact.email,
                recipientName:
                  `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim(),
                subject: `Reminder: invoice ${invoice.invoiceNumber} is overdue`,
                bodyHtml: `<p>Invoice ${invoice.invoiceNumber} has an outstanding balance. Please use your secure payment page or contact us with questions.</p>`,
                status: process.env.MAILERSEND_API_KEY
                  ? "QUEUED"
                  : "PENDING_CONFIGURATION",
                relatedType: "INVOICE",
                relatedId: invoice.id,
              },
            });
          }
          results.push({
            invoiceId: invoice.id,
            status: "REMINDER_QUEUED",
            recipient: invoice.contact?.email ?? null,
          });
        }
        await tx.automationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date() },
        });
        await tx.automationRun.update({
          where: { id: run.id },
          data: {
            status: "COMPLETED",
            actionResults: results as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });
      });
    } else {
      results = [{ status: "NO_HANDLER", triggerType: rule.triggerType }];
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          actionResults: results as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    }
    await appendAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "automation.executed",
      entityType: "AutomationRule",
      entityId: rule.id,
      after: { runId: run.id, results },
      category: "BUSINESS",
    });
  } catch (error) {
    await db.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown automation failure",
        completedAt: new Date(),
      },
    });
    throw error;
  }
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/automations`);
  revalidatePath(`/app/${input.organizationSlug}/invoices`);
  revalidatePath(`/app/${input.organizationSlug}/email`);
}

export async function completeTask(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "tasks.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.task.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const task = await db.task.update({
    where: { id: before.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "task.completed",
    entityType: "Task",
    entityId: task.id,
    before,
    after: task,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/tasks`);
}

export async function updateCaseWorkflow(formData: FormData) {
  const input = entityActionSchema
    .extend({
      status: z.enum([
        "NEW",
        "IN_PROGRESS",
        "WAITING_CUSTOMER",
        "RESOLVED",
        "CLOSED",
      ]),
      resolution: z.string().trim().max(1000).optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "cases.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  if (["RESOLVED", "CLOSED"].includes(input.status) && !input.resolution) {
    throw new Error(
      "A resolution is required before resolving or closing a case",
    );
  }
  const db = getDb();
  const before = await db.supportCase.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const supportCase = await db.$transaction(async (tx) => {
    const updated = await tx.supportCase.update({
      where: { id: before.id },
      data: {
        status: input.status,
        resolution: input.resolution || before.resolution,
        ownerUserId: before.ownerUserId ?? user.id,
        closedAt: input.status === "CLOSED" ? new Date() : null,
      },
    });
    if (before.contactId) {
      await tx.activity.create({
        data: {
          organizationId: organization.id,
          contactId: before.contactId,
          type: "CASE_STATUS_CHANGED",
          subject: `${before.caseNumber}: ${before.status} to ${input.status}`,
          body: input.resolution || null,
          actorUserId: user.id,
          metadata: {
            caseId: before.id,
            from: before.status,
            to: input.status,
          },
        },
      });
    }
    return updated;
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "case.workflow.updated",
    entityType: "SupportCase",
    entityId: before.id,
    before,
    after: supportCase,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/cases`);
  revalidatePath(`/app/${input.organizationSlug}/accounts`);
}

export async function executeCampaign(formData: FormData) {
  const input = entityActionSchema
    .extend({
      command: z.enum(["LAUNCH", "PAUSE", "COMPLETE"]),
      audience: z
        .enum(["ALL_CONTACTS", "CUSTOMERS", "PROSPECTS"])
        .default("ALL_CONTACTS"),
      subject: z.string().trim().max(180).optional().default(""),
      body: z.string().trim().max(5000).optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "campaigns.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.campaign.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  if (input.command === "LAUNCH" && (!input.subject || !input.body))
    throw new Error("A subject and message are required to launch a campaign");
  if (input.command === "LAUNCH" && before.status === "ACTIVE")
    throw new Error(
      "Pause the active campaign before launching a new delivery",
    );
  let recipients = 0;
  const campaign = await db.$transaction(async (tx) => {
    if (input.command === "LAUNCH") {
      const contacts = await tx.contact.findMany({
        where: {
          organizationId: organization.id,
          email: { not: null },
          emailOptOut: false,
          ...(input.audience === "ALL_CONTACTS"
            ? {}
            : {
                lifecycleStatus:
                  input.audience === "CUSTOMERS" ? "CUSTOMER" : "PROSPECT",
              }),
        },
      });
      recipients = contacts.length;
      if (contacts.length) {
        await tx.emailMessage.createMany({
          data: contacts.map((contact) => ({
            organizationId: organization.id,
            recipientEmail: contact.email!,
            recipientName:
              `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
            subject: input.subject,
            bodyHtml: `<p>${escapeHtml(input.body).replaceAll("\n", "</p><p>")}</p>`,
            status: process.env.MAILERSEND_API_KEY
              ? "QUEUED"
              : "PENDING_CONFIGURATION",
            relatedType: "CAMPAIGN",
            relatedId: before.id,
          })),
        });
      }
    }
    return tx.campaign.update({
      where: { id: before.id },
      data: {
        status:
          input.command === "LAUNCH"
            ? "ACTIVE"
            : input.command === "PAUSE"
              ? "PAUSED"
              : "COMPLETED",
        audienceJson:
          input.command === "LAUNCH"
            ? { segment: input.audience }
            : (before.audienceJson as Prisma.InputJsonValue),
        memberCount:
          input.command === "LAUNCH" ? recipients : before.memberCount,
        startsAt:
          input.command === "LAUNCH"
            ? (before.startsAt ?? new Date())
            : before.startsAt,
        endsAt: input.command === "COMPLETE" ? new Date() : before.endsAt,
      },
    });
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `campaign.${input.command.toLowerCase()}`,
    entityType: "Campaign",
    entityId: before.id,
    before,
    after: { campaign, recipients, audience: input.audience },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/campaigns`);
  revalidatePath(`/app/${input.organizationSlug}/email`);
}

export async function updateCalendarCommitment(formData: FormData) {
  const input = entityActionSchema
    .extend({
      command: z.enum(["COMPLETE", "CANCEL", "CREATE_FOLLOW_UP"]),
      followUp: z.string().trim().max(240).optional().default(""),
      dueAt: z.string().optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "calendar.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.calendarEvent.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const result = await db.$transaction(async (tx) => {
    if (input.command === "CREATE_FOLLOW_UP") {
      if (!input.followUp) throw new Error("A follow-up title is required");
      const task = await tx.task.create({
        data: {
          organizationId: organization.id,
          title: input.followUp,
          dueAt: input.dueAt
            ? new Date(input.dueAt)
            : new Date(Date.now() + 86_400_000),
          relatedType: "CALENDAR_EVENT",
          relatedId: before.id,
          createdById: user.id,
          assignedToId: user.id,
        },
      });
      return { event: before, taskId: task.id };
    }
    const event = await tx.calendarEvent.update({
      where: { id: before.id },
      data: { status: input.command === "COMPLETE" ? "COMPLETED" : "CANCELED" },
    });
    return { event, taskId: null };
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `calendar.${input.command.toLowerCase()}`,
    entityType: "CalendarEvent",
    entityId: before.id,
    before,
    after: result,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/calendar`);
  revalidatePath(`/app/${input.organizationSlug}/tasks`);
}

export async function composeEmail(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      recipientEmail: z.string().email(),
      recipientName: z.string().trim().max(120).optional().default(""),
      subject: z.string().trim().min(1).max(180),
      body: z.string().trim().min(1).max(10000),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "email.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const message = await getDb().emailMessage.create({
    data: {
      organizationId: organization.id,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName || null,
      subject: input.subject,
      bodyHtml: `<p>${escapeHtml(input.body).replaceAll("\n", "</p><p>")}</p>`,
      status: process.env.MAILERSEND_API_KEY
        ? "QUEUED"
        : "PENDING_CONFIGURATION",
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "email.composed",
    entityType: "EmailMessage",
    entityId: message.id,
    after: {
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      status: message.status,
    },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/email`);
}

export async function approveTimeEntry(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payroll.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.timeEntry.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  if (before.status !== "SUBMITTED")
    throw new Error("Only submitted time can be approved");
  const entry = await db.timeEntry.update({
    where: { id: before.id },
    data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "payroll.time.approved",
    entityType: "TimeEntry",
    entityId: entry.id,
    before,
    after: entry,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/payroll`);
}

export async function reviewTimeOff(formData: FormData) {
  const input = entityActionSchema
    .extend({ decision: z.enum(["APPROVED", "DENIED"]) })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payroll.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.timeOffRequest.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  if (before.status !== "PENDING")
    throw new Error("This request has already been reviewed");
  const request = await db.timeOffRequest.update({
    where: { id: before.id },
    data: {
      status: input.decision,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `payroll.time_off.${input.decision.toLowerCase()}`,
    entityType: "TimeOffRequest",
    entityId: request.id,
    before,
    after: request,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/payroll`);
}

export async function advancePayrollRun(formData: FormData) {
  const input = entityActionSchema
    .extend({ command: z.enum(["APPROVE", "SUBMIT"]) })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payroll.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.payrollRun.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const connection = await db.payrollConnection.findUnique({
    where: { organizationId: organization.id },
  });
  if (input.command === "APPROVE" && before.status !== "NEEDS_APPROVAL")
    throw new Error("Only payroll runs awaiting approval can be approved");
  if (input.command === "SUBMIT" && before.status !== "APPROVED")
    throw new Error("Payroll must be approved before submission");
  if (input.command === "SUBMIT" && connection?.status !== "ACTIVE")
    throw new Error(
      "An active payroll provider connection is required before submission",
    );
  const run = await db.payrollRun.update({
    where: { id: before.id },
    data:
      input.command === "APPROVE"
        ? { status: "APPROVED", approvedById: user.id, approvedAt: new Date() }
        : {
            status: "SUBMITTED",
            submittedById: user.id,
            submittedAt: new Date(),
            providerSnapshot: {
              provider: connection?.provider,
              mode: connection?.mode,
              submittedAt: new Date().toISOString(),
            },
          },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `payroll.run.${input.command.toLowerCase()}`,
    entityType: "PayrollRun",
    entityId: run.id,
    before,
    after: run,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/payroll`);
}

export async function recordManualPayment(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      invoiceId: z.string().uuid(),
      amount: z.coerce.number().positive(),
      method: z.enum(["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"]),
      reference: z.string().trim().max(100).optional().default(""),
      receivedAt: z.string().min(1),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payments.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: input.invoiceId, organizationId: organization.id },
  });
  await assertAccountingDateOpen(organization.id, new Date(input.receivedAt));
  const balance = Number(invoice.balanceDue);
  if (input.amount > balance)
    throw new Error("Payment cannot exceed the invoice balance");
  const result = await db.$transaction(async (tx) => {
    const cash = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "1000" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "1000",
        name: "Operating Cash",
        type: "ASSET",
        systemAccount: true,
      },
    });
    const receivable = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "1100" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "1100",
        name: "Accounts Receivable",
        type: "ASSET",
        systemAccount: true,
      },
    });
    const payment = await tx.payment.create({
      data: {
        organizationId: organization.id,
        amount: input.amount,
        status: "SUCCEEDED",
        method: input.method,
        referenceNumber: input.reference || `MANUAL-${nanoid(8).toUpperCase()}`,
        receivedAt: new Date(input.receivedAt),
      },
    });
    await tx.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: input.amount,
      },
    });
    const remaining = balance - input.amount;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: { increment: input.amount },
        balanceDue: remaining,
        status: remaining === 0 ? "PAID" : "PARTIALLY_PAID",
        paidAt: remaining === 0 ? new Date(input.receivedAt) : null,
      },
    });
    const count = await tx.journalEntry.count({
      where: { organizationId: organization.id },
    });
    const journal = await tx.journalEntry.create({
      data: {
        organizationId: organization.id,
        entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
        entryDate: new Date(input.receivedAt),
        description: `Payment applied to ${invoice.invoiceNumber}`,
        status: "POSTED",
        sourceModule: "PAYMENT",
        sourceId: payment.id,
        createdById: user.id,
        postedAt: new Date(),
        lines: {
          create: [
            { ledgerAccountId: cash.id, debit: input.amount, credit: 0 },
            {
              ledgerAccountId: receivable.id,
              debit: 0,
              credit: input.amount,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { postedJournalId: journal.id },
    });
    return { paymentId: payment.id, journalId: journal.id, remaining };
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "payment.recorded",
    entityType: "Payment",
    entityId: result.paymentId,
    after: { ...input, ...result },
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/payments`);
  revalidatePath(`/app/${input.organizationSlug}/invoices`);
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function postExpense(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounting.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.expense.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  await assertAccountingDateOpen(organization.id, before.incurredAt);
  if (before.postedJournalId) throw new Error("Expense is already posted");
  const journal = await db.$transaction(async (tx) => {
    const cash = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "1000" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "1000",
        name: "Operating Cash",
        type: "ASSET",
        systemAccount: true,
      },
    });
    const expenseAccount = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "6100" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "6100",
        name: "Operating Expenses",
        type: "EXPENSE",
        systemAccount: true,
      },
    });
    const count = await tx.journalEntry.count({
      where: { organizationId: organization.id },
    });
    const created = await tx.journalEntry.create({
      data: {
        organizationId: organization.id,
        entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
        entryDate: before.incurredAt,
        description: before.description,
        status: "POSTED",
        sourceModule: "EXPENSE",
        sourceId: before.id,
        createdById: user.id,
        postedAt: new Date(),
        lines: {
          create: [
            {
              ledgerAccountId: expenseAccount.id,
              debit: before.amount,
              credit: 0,
            },
            {
              ledgerAccountId: cash.id,
              debit: 0,
              credit: before.amount,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    await tx.expense.update({
      where: { id: before.id },
      data: { postedJournalId: created.id },
    });
    return created;
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "expense.posted",
    entityType: "Expense",
    entityId: before.id,
    before,
    after: { postedJournalId: journal.id },
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/expenses`);
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function manageBill(formData: FormData) {
  const input = entityActionSchema
    .extend({ command: z.enum(["POST", "PAY"]) })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounting.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.bill.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { vendor: true },
  });
  await assertAccountingDateOpen(
    organization.id,
    input.command === "POST" ? before.issueDate : new Date(),
  );
  if (input.command === "POST" && before.postedJournalId)
    throw new Error("Bill is already posted");
  if (input.command === "PAY" && before.status === "PAID")
    throw new Error("Bill is already paid");
  if (input.command === "PAY" && !before.postedJournalId)
    throw new Error("Post the bill before recording payment");
  const result = await db.$transaction(async (tx) => {
    const payable = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "2000" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "2000",
        name: "Accounts Payable",
        type: "LIABILITY",
        systemAccount: true,
      },
    });
    const expense = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "6100" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "6100",
        name: "Operating Expenses",
        type: "EXPENSE",
        systemAccount: true,
      },
    });
    const cash = await tx.ledgerAccount.upsert({
      where: {
        organizationId_code: { organizationId: organization.id, code: "1000" },
      },
      update: {},
      create: {
        organizationId: organization.id,
        code: "1000",
        name: "Operating Cash",
        type: "ASSET",
        systemAccount: true,
      },
    });
    const count = await tx.journalEntry.count({
      where: { organizationId: organization.id },
    });
    if (input.command === "POST") {
      const journal = await tx.journalEntry.create({
        data: {
          organizationId: organization.id,
          entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
          entryDate: before.issueDate,
          description: `Bill ${before.billNumber ?? before.id} - ${before.vendor.name}`,
          status: "POSTED",
          sourceModule: "BILL",
          sourceId: before.id,
          createdById: user.id,
          postedAt: new Date(),
          lines: {
            create: [
              { ledgerAccountId: expense.id, debit: before.total, credit: 0 },
              {
                ledgerAccountId: payable.id,
                debit: 0,
                credit: before.total,
                sortOrder: 1,
              },
            ],
          },
        },
      });
      return tx.bill.update({
        where: { id: before.id },
        data: { status: "OPEN", postedJournalId: journal.id },
      });
    }
    const balance = Number(before.total) - Number(before.amountPaid);
    if (balance <= 0) throw new Error("Bill has no remaining balance");
    await tx.journalEntry.create({
      data: {
        organizationId: organization.id,
        entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
        entryDate: new Date(),
        description: `Payment for bill ${before.billNumber ?? before.id}`,
        status: "POSTED",
        sourceModule: "BILL_PAYMENT",
        sourceId: before.id,
        createdById: user.id,
        postedAt: new Date(),
        lines: {
          create: [
            { ledgerAccountId: payable.id, debit: balance, credit: 0 },
            {
              ledgerAccountId: cash.id,
              debit: 0,
              credit: balance,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    return tx.bill.update({
      where: { id: before.id },
      data: { status: "PAID", amountPaid: before.total },
    });
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `bill.${input.command.toLowerCase()}`,
    entityType: "Bill",
    entityId: before.id,
    before,
    after: result,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/vendors`);
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function createReconciliation(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      ledgerAccountId: z.string().uuid(),
      statementDate: z.string(),
      statementBalance: z.coerce.number(),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "banking.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const clearedBalance = Number(
    (
      await getDb().bankAccount.findFirst({
        where: {
          organizationId: organization.id,
          ledgerAccountId: input.ledgerAccountId,
        },
      })
    )?.bookBalance ?? 0,
  );
  const session = await getDb().reconciliationSession.create({
    data: {
      organizationId: organization.id,
      ledgerAccountId: input.ledgerAccountId,
      statementDate: new Date(input.statementDate),
      statementBalance: input.statementBalance,
      clearedBalance,
      difference: input.statementBalance - clearedBalance,
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "reconciliation.started",
    entityType: "ReconciliationSession",
    entityId: session.id,
    after: session,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/banking`);
}

export async function completeReconciliation(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "banking.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const before = await getDb().reconciliationSession.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  if (Math.abs(Number(before.difference)) > 0.005)
    throw new Error("Reconciliation difference must be zero before completion");
  const session = await getDb().reconciliationSession.update({
    where: { id: before.id },
    data: {
      status: "COMPLETED",
      completedById: user.id,
      completedAt: new Date(),
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "reconciliation.completed",
    entityType: "ReconciliationSession",
    entityId: session.id,
    before,
    after: session,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/banking`);
}

export async function manageAccountingPeriod(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      name: z.string().trim().max(80).optional(),
      startsOn: z.string().optional(),
      endsOn: z.string().optional(),
      command: z.enum(["CREATE", "LOCK", "UNLOCK"]),
      entityId: z.string().uuid().optional(),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounting.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  let period;
  if (input.command === "CREATE") {
    if (
      !input.name ||
      input.name.length < 2 ||
      !input.startsOn ||
      !input.endsOn
    )
      throw new Error("Name, start date, and end date are required");
    const startsOn = new Date(input.startsOn);
    const endsOn = new Date(input.endsOn);
    if (startsOn > endsOn)
      throw new Error("The period start must be on or before its end");
    period = await db.accountingPeriod.create({
      data: {
        organizationId: organization.id,
        name: input.name,
        startsOn,
        endsOn,
      },
    });
  } else {
    if (!input.entityId) throw new Error("Accounting period is required");
    const existing = await db.accountingPeriod.findFirstOrThrow({
      where: { id: input.entityId, organizationId: organization.id },
    });
    period = await db.accountingPeriod.update({
      where: { id: existing.id },
      data:
        input.command === "LOCK"
          ? { status: "LOCKED", lockedById: user.id, lockedAt: new Date() }
          : { status: "OPEN", lockedById: null, lockedAt: null },
    });
  }
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `accounting_period.${input.command.toLowerCase()}`,
    entityType: "AccountingPeriod",
    entityId: period.id,
    after: period,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function reverseJournalEntry(formData: FormData) {
  const input = entityActionSchema
    .extend({ reason: z.string().trim().min(3).max(300) })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounting.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.journalEntry.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { lines: true },
  });
  if (before.status !== "POSTED")
    throw new Error("Only posted entries can be reversed");
  if (before.reversalOfId)
    throw new Error("A reversal entry cannot be reversed from this workflow");
  await assertAccountingDateOpen(organization.id, new Date());
  const reversal = await db.$transaction(async (tx) => {
    const count = await tx.journalEntry.count({
      where: { organizationId: organization.id },
    });
    const created = await tx.journalEntry.create({
      data: {
        organizationId: organization.id,
        entryNumber: `JE-${String(count + 1).padStart(6, "0")}`,
        entryDate: new Date(),
        description: `Reversal: ${before.description} - ${input.reason}`,
        status: "POSTED",
        sourceModule: "REVERSAL",
        sourceId: before.id,
        reversalOfId: before.id,
        createdById: user.id,
        postedAt: new Date(),
        lines: {
          create: before.lines.map((line) => ({
            ledgerAccountId: line.ledgerAccountId,
            debit: line.credit,
            credit: line.debit,
            description: line.description,
            sortOrder: line.sortOrder,
          })),
        },
      },
    });
    await tx.journalEntry.update({
      where: { id: before.id },
      data: { status: "REVERSED" },
    });
    return created;
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "journal.reversed",
    entityType: "JournalEntry",
    entityId: before.id,
    before,
    after: reversal,
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/accounting`);
}

export async function addEntityNote(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      relatedType: z.enum(["ACCOUNT", "CONTACT", "DEAL", "CASE"]),
      relatedId: z.string().uuid(),
      body: z.string().trim().min(2).max(3000),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "accounts.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const note = await getDb().note.create({
    data: {
      organizationId: organization.id,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      body: input.body,
      createdById: user.id,
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "note.created",
    entityType: "Note",
    entityId: note.id,
    after: { relatedType: input.relatedType, relatedId: input.relatedId },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/accounts`);
}

export async function updateEndpointSubmission(formData: FormData) {
  const input = entityActionSchema
    .extend({ status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "SPAM"]) })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "cases.write",
  );
  const before = await getDb().endpointSubmission.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const result = await getDb().endpointSubmission.update({
    where: { id: before.id },
    data: { status: input.status },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "endpoint_submission.updated",
    entityType: "EndpointSubmission",
    entityId: result.id,
    before,
    after: result,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/submissions`);
}

export async function updateBooking(formData: FormData) {
  const input = entityActionSchema
    .extend({
      status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED"]),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "calendar.write",
  );
  const before = await getDb().booking.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const result = await getDb().booking.update({
    where: { id: before.id },
    data: { status: input.status },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "booking.status.updated",
    entityType: "Booking",
    entityId: result.id,
    before,
    after: result,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/bookings`);
}

export async function replayWebhook(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "integrations.manage",
  );
  const before = await getDb().webhookEvent.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const event = await getDb().webhookEvent.update({
    where: { id: before.id },
    data: { status: "PENDING", attempts: { increment: 1 }, lastError: null },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "webhook.replay.requested",
    entityType: "WebhookEvent",
    entityId: event.id,
    before,
    after: event,
    category: "INTEGRATION",
  });
  revalidatePath(`/app/${input.organizationSlug}/integrations`);
}

export async function createCollaborationChannel(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      name: z.string().trim().min(2).max(80),
      description: z.string().trim().max(300).optional(),
      channelType: z.enum(["INTERNAL", "CUSTOMER", "PROJECT"]),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "collaboration.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const channel = await getDb().collaborationChannel.create({
    data: {
      organizationId: organization.id,
      name: input.name,
      description: input.description,
      channelType: input.channelType,
      visibility:
        input.channelType === "CUSTOMER" ? "CUSTOMER_AND_MEMBERS" : "MEMBERS",
      videoRoomKey: `ck-${organization.publicId}-${nanoid(12)}`,
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "collaboration.channel.created",
    entityType: "CollaborationChannel",
    entityId: channel.id,
    after: {
      publicId: channel.publicId,
      name: channel.name,
      channelType: channel.channelType,
    },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/collaboration`);
}

export async function sendCollaborationMessage(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      channelId: z.string().uuid(),
      body: z.string().trim().min(1).max(5000),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "collaboration.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const channel = await getDb().collaborationChannel.findFirstOrThrow({
    where: {
      id: input.channelId,
      organizationId: organization.id,
      archivedAt: null,
    },
  });
  const message = await getDb().collaborationMessage.create({
    data: { channelId: channel.id, authorUserId: user.id, body: input.body },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "collaboration.message.sent",
    entityType: "CollaborationMessage",
    entityId: message.id,
    after: { channelId: channel.id, messageType: message.messageType },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/collaboration`);
}

export async function createPlatformSupportTicket(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      subject: z.string().trim().min(3).max(160),
      category: z.enum([
        "GENERAL",
        "BILLING",
        "TECHNICAL",
        "SECURITY",
        "MIGRATION",
      ]),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
      body: z.string().trim().min(3).max(5000),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "support.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const ticket = await getDb().platformSupportTicket.create({
    data: {
      organizationId: organization.id,
      openedById: user.id,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      messages: {
        create: {
          authorUserId: user.id,
          authorType: "TENANT",
          body: input.body,
        },
      },
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "platform_support.ticket.created",
    entityType: "PlatformSupportTicket",
    entityId: ticket.id,
    after: {
      publicId: ticket.publicId,
      category: ticket.category,
      priority: ticket.priority,
    },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/support`);
}

export async function replyPlatformSupportTicket(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      ticketId: z.string().uuid(),
      body: z.string().trim().min(1).max(5000),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "support.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const ticket = await getDb().platformSupportTicket.findFirstOrThrow({
    where: { id: input.ticketId, organizationId: organization.id },
  });
  await getDb().$transaction([
    getDb().platformSupportMessage.create({
      data: {
        ticketId: ticket.id,
        authorUserId: user.id,
        authorType: "TENANT",
        body: input.body,
      },
    }),
    getDb().platformSupportTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === "CLOSED" ? "OPEN" : ticket.status },
    }),
  ]);
  revalidatePath(`/app/${input.organizationSlug}/support`);
}

export async function updatePaymentProvider(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      provider: z.enum(["STRIPE", "SQUARE", "PAYPAL", "MANUAL"]),
      command: z.enum(["SET_DEFAULT", "DISCONNECT", "ENABLE_MANUAL"]),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payments.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.paymentProviderConnection.findUnique({
    where: {
      organizationId_provider: {
        organizationId: organization.id,
        provider: input.provider,
      },
    },
  });
  if (input.command === "SET_DEFAULT") {
    if (!before || before.status !== "ACTIVE")
      throw new Error("Connect the provider before making it default");
    await db.$transaction([
      db.paymentProviderConnection.updateMany({
        where: { organizationId: organization.id },
        data: { isDefault: false },
      }),
      db.paymentProviderConnection.update({
        where: { id: before.id },
        data: { isDefault: true },
      }),
    ]);
  } else if (input.command === "ENABLE_MANUAL") {
    await db.paymentProviderConnection.upsert({
      where: {
        organizationId_provider: {
          organizationId: organization.id,
          provider: "MANUAL",
        },
      },
      update: { status: "ACTIVE" },
      create: {
        organizationId: organization.id,
        provider: "MANUAL",
        status: "ACTIVE",
      },
    });
  } else {
    if (!before) throw new Error("Provider connection not found");
    await db.paymentProviderConnection.update({
      where: { id: before.id },
      data: {
        status: "DISCONNECTED",
        isDefault: false,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
      },
    });
  }
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `payment_provider.${input.command.toLowerCase()}`,
    entityType: "PaymentProviderConnection",
    entityId: before?.id,
    before,
    after: { provider: input.provider },
    category: "FINANCIAL",
    retentionClass: "FINANCIAL_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/payment-settings`);
}

export async function startStripeCustomerPayments(formData: FormData) {
  const input = z
    .object({ organizationSlug: z.string() })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "payments.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const stripe = getStripe();
  let accountId = organization.stripeConnectedAccountId;
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      display_name: organization.legalName ?? organization.name,
      dashboard: "express",
      defaults: { currency: organization.defaultCurrency.toLowerCase() },
      configuration: {
        merchant: { capabilities: { card_payments: { requested: true } } },
      },
      metadata: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
      },
    });
    accountId = account.id;
  }
  await getDb().$transaction([
    getDb().organization.update({
      where: { id: organization.id },
      data: { stripeConnectedAccountId: accountId },
    }),
    getDb().paymentProviderConnection.upsert({
      where: {
        organizationId_provider: {
          organizationId: organization.id,
          provider: "STRIPE",
        },
      },
      update: { externalAccountId: accountId, status: "CONNECTING" },
      create: {
        organizationId: organization.id,
        provider: "STRIPE",
        externalAccountId: accountId,
        status: "CONNECTING",
      },
    }),
  ]);
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        collection_options: {
          fields: "eventually_due",
          future_requirements: "include",
        },
        refresh_url: appUrl(
          `/app/${organization.slug}/payment-settings?stripe=refresh`,
        ),
        return_url: appUrl(
          `/app/${organization.slug}/payment-settings?stripe=returned`,
        ),
      },
    },
  });
  redirect(link.url);
}

export async function updateTenantSettings(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string(),
      supportEmail: z.string().email().or(z.literal("")),
      billingEmail: z.string().email().or(z.literal("")),
      mainPhone: z.string().trim().max(40),
      requireMfa: z.coerce.boolean().default(false),
      requirePasskeys: z.coerce.boolean().default(false),
      sessionTimeoutMinutes: z.coerce.number().int().min(15).max(1440),
      bookingEnabled: z.coerce.boolean().default(false),
      portalEnabled: z.coerce.boolean().default(false),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "settings.manage",
  );
  if (!user) throw new Error("A signed-in user is required");
  const before = await getDb().tenantSettings.findUnique({
    where: { organizationId: organization.id },
  });
  const settings = await getDb().tenantSettings.upsert({
    where: { organizationId: organization.id },
    update: {
      profileJson: {
        supportEmail: input.supportEmail || null,
        billingEmail: input.billingEmail || null,
        mainPhone: input.mainPhone || null,
      },
      securityJson: {
        requireMfa: input.requireMfa,
        requirePasskeys: input.requirePasskeys,
        sessionTimeoutMinutes: input.sessionTimeoutMinutes,
      },
      bookingJson: { enabled: input.bookingEnabled },
      portalJson: { enabled: input.portalEnabled },
    },
    create: {
      organizationId: organization.id,
      profileJson: {
        supportEmail: input.supportEmail || null,
        billingEmail: input.billingEmail || null,
        mainPhone: input.mainPhone || null,
      },
      securityJson: {
        requireMfa: input.requireMfa,
        requirePasskeys: input.requirePasskeys,
        sessionTimeoutMinutes: input.sessionTimeoutMinutes,
      },
      bookingJson: { enabled: input.bookingEnabled },
      portalJson: { enabled: input.portalEnabled },
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "tenant.settings.updated",
    entityType: "TenantSettings",
    entityId: organization.id,
    before,
    after: settings,
    category: "SECURITY",
    retentionClass: "SECURITY_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/settings`);
}

const permissionCatalog = [
  "leads.read",
  "leads.write",
  "accounts.read",
  "accounts.write",
  "contacts.read",
  "contacts.write",
  "deals.read",
  "deals.write",
  "cases.read",
  "cases.write",
  "invoices.read",
  "invoices.write",
  "payments.read",
  "payments.write",
  "accounting.read",
  "accounting.write",
  "reports.read",
  "tasks.read",
  "tasks.write",
  "calendar.read",
  "calendar.write",
  "campaigns.read",
  "campaigns.write",
  "payroll.read",
  "payroll.write",
  "banking.read",
  "banking.write",
  "email.read",
  "email.write",
  "automations.read",
  "automations.write",
  "websites.read",
  "websites.write",
  "websites.publish",
  "domains.read",
  "domains.manage",
  "documents.read",
  "documents.write",
  "team.read",
  "team.manage",
  "settings.manage",
  "integrations.manage",
  "collaboration.read",
  "collaboration.write",
  "support.read",
  "support.write",
] as const;

export async function updateMembershipAccess(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      membershipId: z.string().uuid(),
      role: z.enum([
        "OWNER",
        "ADMIN",
        "MANAGER",
        "SALES",
        "ACCOUNTING",
        "SUPPORT",
        "READ_ONLY",
        "PORTAL_USER",
      ]),
      permissions: z.array(z.enum(permissionCatalog)).default([]),
    })
    .parse({
      ...Object.fromEntries(formData),
      permissions: formData.getAll("permissions"),
    });
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "team.manage",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.organizationMembership.findFirstOrThrow({
    where: { id: input.membershipId, organizationId: organization.id },
  });
  if (before.role === "OWNER" && input.role !== "OWNER") {
    const owners = await db.organizationMembership.count({
      where: { organizationId: organization.id, role: "OWNER" },
    });
    if (owners <= 1)
      throw new Error("The organization must retain at least one owner");
  }
  const membership = await db.organizationMembership.update({
    where: { id: before.id },
    data: { role: input.role, permissions: input.permissions },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "membership.access.updated",
    entityType: "OrganizationMembership",
    entityId: membership.id,
    before,
    after: membership,
    category: "SECURITY",
    retentionClass: "SECURITY_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}/team`);
}

export async function updateTenantControls(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      consoleTitle: z.string().trim().max(80),
      consoleLogoUrl: z.string().url().or(z.literal("")),
      consoleBackgroundImageUrl: z.string().url().or(z.literal("")),
      consolePrimaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      consoleSidebarColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      paymentTitle: z.string().trim().max(80),
      paymentLogoUrl: z.string().url().or(z.literal("")),
      paymentBackgroundImageUrl: z.string().url().or(z.literal("")),
      paymentPrimaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      paymentHeaderColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "settings.manage",
  );
  if (!user) throw new Error("A signed-in user is required");
  const enabled = new Set(formData.getAll("enabledModules").map(String));
  const db = getDb();
  const before = await db.organizationTheme.findUnique({
    where: { organizationId: organization.id },
  });
  await db.$transaction([
    db.organizationTheme.upsert({
      where: { organizationId: organization.id },
      update: {
        consoleTitle: input.consoleTitle || null,
        consoleLogoUrl: input.consoleLogoUrl || null,
        consoleBackgroundImageUrl: input.consoleBackgroundImageUrl || null,
        consolePrimaryColor: input.consolePrimaryColor,
        consoleSidebarColor: input.consoleSidebarColor,
        paymentTitle: input.paymentTitle || null,
        paymentLogoUrl: input.paymentLogoUrl || null,
        paymentBackgroundImageUrl: input.paymentBackgroundImageUrl || null,
        paymentPrimaryColor: input.paymentPrimaryColor,
        paymentHeaderColor: input.paymentHeaderColor,
      },
      create: {
        organizationId: organization.id,
        consoleTitle: input.consoleTitle || null,
        consoleLogoUrl: input.consoleLogoUrl || null,
        consoleBackgroundImageUrl: input.consoleBackgroundImageUrl || null,
        consolePrimaryColor: input.consolePrimaryColor,
        consoleSidebarColor: input.consoleSidebarColor,
        paymentTitle: input.paymentTitle || null,
        paymentLogoUrl: input.paymentLogoUrl || null,
        paymentBackgroundImageUrl: input.paymentBackgroundImageUrl || null,
        paymentPrimaryColor: input.paymentPrimaryColor,
        paymentHeaderColor: input.paymentHeaderColor,
      },
    }),
    db.organizationModule.upsert({
      where: { organizationId: organization.id },
      update: {
        crm: enabled.has("crm"),
        cases: enabled.has("cases"),
        campaigns: enabled.has("campaigns"),
        accounting: enabled.has("accounting"),
        banking: enabled.has("banking"),
        payroll: enabled.has("payroll"),
        websites: enabled.has("websites"),
        domains: enabled.has("domains"),
        automations: enabled.has("automations"),
        reports: enabled.has("reports"),
        marketing: enabled.has("marketing"),
        managedEmail: enabled.has("managedEmail"),
      },
      create: {
        organizationId: organization.id,
        crm: enabled.has("crm"),
        cases: enabled.has("cases"),
        campaigns: enabled.has("campaigns"),
        accounting: enabled.has("accounting"),
        banking: enabled.has("banking"),
        payroll: enabled.has("payroll"),
        websites: enabled.has("websites"),
        domains: enabled.has("domains"),
        automations: enabled.has("automations"),
        reports: enabled.has("reports"),
        marketing: enabled.has("marketing"),
        managedEmail: enabled.has("managedEmail"),
      },
    }),
  ]);
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "tenant.console_controls.updated",
    entityType: "OrganizationTheme",
    entityId: before?.id,
    before,
    after: { ...input, enabledModules: [...enabled] },
    category: "ADMIN",
    retentionClass: "SECURITY_7Y",
  });
  revalidatePath(`/app/${input.organizationSlug}`, "layout");
}

export async function saveReportQuery(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      name: z.string().trim().min(2).max(80),
      dataset: z.enum(["invoices", "deals", "expenses", "customers"]),
      metric: z.enum(["count", "sum", "average"]),
      valueField: z
        .enum([
          "total",
          "balanceDue",
          "amount",
          "estimatedValue",
          "annualRevenue",
        ])
        .optional(),
      groupBy: z.enum([
        "status",
        "stage",
        "source",
        "industry",
        "month",
        "none",
      ]),
      filterField: z.enum(["status", "stage", "source", "industry", "none"]),
      filterValue: z.string().trim().max(100).optional().default(""),
      shared: z
        .string()
        .optional()
        .transform((value) => value === "on"),
    })
    .parse(Object.fromEntries(formData));
  const validValues: Record<string, string[]> = {
    invoices: ["total", "balanceDue"],
    deals: ["amount"],
    expenses: ["amount"],
    customers: ["annualRevenue"],
  };
  const validGroups: Record<string, string[]> = {
    invoices: ["status", "month", "none"],
    deals: ["stage", "month", "none"],
    expenses: ["month", "none"],
    customers: ["industry", "month", "none"],
  };
  if (
    input.metric !== "count" &&
    (!input.valueField ||
      !validValues[input.dataset].includes(input.valueField))
  )
    throw new Error(
      "The selected value field is not available for this dataset",
    );
  if (!validGroups[input.dataset].includes(input.groupBy))
    throw new Error("The selected grouping is not available for this dataset");
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "reports.read",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const columns = [
    input.metric,
    ...(input.valueField ? [input.valueField] : []),
  ] as Prisma.InputJsonValue;
  const view = await db.savedView.upsert({
    where: {
      organizationId_userId_module_name: {
        organizationId: organization.id,
        userId: user.id,
        module: "reports",
        name: input.name,
      },
    },
    update: {
      filtersJson: input,
      columnsJson: columns,
      sortJson: { direction: "desc" },
      shared: input.shared,
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      module: "reports",
      name: input.name,
      filtersJson: input,
      columnsJson: columns,
      sortJson: { direction: "desc" },
      shared: input.shared,
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "report.query.saved",
    entityType: "SavedView",
    entityId: view.id,
    after: input,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/reports`);
}

export async function saveWebsitePage(formData: FormData) {
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      websiteId: z.string().uuid(),
      pageId: z.string().uuid(),
      title: z.string().trim().min(1).max(120),
      path: z.string().regex(/^\/[a-z0-9\/-]*$/),
      seoTitle: z.string().trim().max(120),
      seoDescription: z.string().trim().max(240),
      blocksJson: z.string(),
      publish: z
        .string()
        .optional()
        .transform((value) => value === "on"),
    })
    .parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    input.publish ? "websites.publish" : "websites.write",
  );
  if (!user) throw new Error("A signed-in user is required");
  const blocks = z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(50)
    .parse(JSON.parse(input.blocksJson));
  const db = getDb();
  const website = await db.website.findFirstOrThrow({
    where: { id: input.websiteId, organizationId: organization.id },
  });
  const before = await db.websitePage.findFirstOrThrow({
    where: { id: input.pageId, websiteId: website.id },
  });
  const page = await db.$transaction(async (tx) => {
    const result = await tx.websitePage.update({
      where: { id: before.id },
      data: {
        title: input.title,
        path: input.path,
        seoJson: { title: input.seoTitle, description: input.seoDescription },
        contentJson: { blocks } as Prisma.InputJsonValue,
        status: input.publish ? "PUBLISHED" : "DRAFT",
      },
    });
    if (input.publish)
      await tx.website.update({
        where: { id: website.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    return result;
  });
  if (input.publish)
    await publishSiteManifest({
      organizationId: organization.id,
      websiteId: website.id,
      hostname: website.defaultHostname,
      publishedAt: new Date().toISOString(),
    });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: input.publish ? "website.page.published" : "website.page.saved",
    entityType: "WebsitePage",
    entityId: page.id,
    before,
    after: page,
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}/websites`);
  revalidatePath(`/site/${website.defaultHostname}`);
}

export async function verifyDomainNow(formData: FormData) {
  const input = entityActionSchema.parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "domains.manage",
  );
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const domain = await db.organizationDomain.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
  });
  const checks = await new CloudflareDnsProvider().inspectDomain(
    domain.hostname,
    domain.verificationToken,
  );
  const ownership =
    checks.find((check) => check.key === "ownership")?.status === "HEALTHY";
  let sslEnabled = false;
  try {
    const response = await fetch(`https://${domain.hostname}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    sslEnabled = response.status > 0;
  } catch {
    sslEnabled = false;
  }
  await db.$transaction(async (tx) => {
    await tx.dnsRecord.deleteMany({
      where: { organizationDomainId: domain.id, recordType: "HEALTH" },
    });
    await tx.dnsRecord.createMany({
      data: checks.map((check) => ({
        organizationDomainId: domain.id,
        recordType: "HEALTH",
        name: check.key,
        value: check.answers.join(" | ") || "MISSING",
        status: check.status,
        lastCheckedAt: new Date(),
      })),
    });
    await tx.organizationDomain.update({
      where: { id: domain.id },
      data: {
        status: ownership ? "VERIFIED" : "PENDING",
        verifiedAt: ownership ? new Date() : null,
        sslEnabled,
      },
    });
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: "domain.health.checked",
    entityType: "OrganizationDomain",
    entityId: domain.id,
    after: { checks, sslEnabled },
    category: "INTEGRATION",
  });
  revalidatePath(`/app/${input.organizationSlug}/domains`);
}
