"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
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
  const input = entityActionSchema.extend({
    createDeal: z.string().optional().transform((value) => value === "on"),
  }).parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "leads.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const lead = await db.lead.findFirstOrThrow({ where: { id: input.entityId, organizationId: organization.id } });
  if (lead.status === "CONVERTED") throw new Error("Lead is already converted");

  const result = await db.$transaction(async (tx) => {
    const account = lead.company
      ? await tx.crmAccount.upsert({
          where: { organizationId_name: { organizationId: organization.id, name: lead.company } },
          update: { accountType: "PROSPECT" },
          create: { organizationId: organization.id, name: lead.company, accountType: "PROSPECT" },
        })
      : null;
    const existingContact = lead.email
      ? await tx.contact.findFirst({ where: { organizationId: organization.id, email: lead.email } })
      : null;
    const contact = existingContact ?? await tx.contact.create({
      data: {
        organizationId: organization.id,
        accountId: account?.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        lifecycleStatus: "PROSPECT",
      },
    });
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
    await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED", convertedAt: new Date() } });
    await tx.activity.create({
      data: {
        organizationId: organization.id,
        contactId: contact.id,
        type: "LEAD_CONVERTED",
        subject: "Lead converted",
        body: deal ? `Created account, contact, and opportunity ${deal.name}.` : "Created account and contact.",
        actorUserId: user.id,
        metadata: { leadId: lead.id, accountId: account?.id, contactId: contact.id, dealId: deal?.id },
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
    after: { status: "CONVERTED", accountId: result.account?.id, contactId: result.contact.id, dealId: result.deal?.id },
    category: "BUSINESS",
  });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/leads`);
  revalidatePath(`/app/${input.organizationSlug}/accounts`);
  revalidatePath(`/app/${input.organizationSlug}/deals`);
}

export async function changeDealStage(formData: FormData) {
  const input = entityActionSchema.extend({
    stage: z.enum(["PROSPECTING", "QUALIFICATION", "NEEDS_ANALYSIS", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]),
    nextStep: z.string().trim().max(240).optional().default(""),
  }).parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "deals.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.deal.findFirstOrThrow({ where: { id: input.entityId, organizationId: organization.id } });
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
    if (input.stage === "CLOSED_WON" && before.stage !== "CLOSED_WON" && before.accountId) {
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
          items: { create: { description: before.name, quantity: 1, unitPrice: before.amount, lineTotal: before.amount } },
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
        metadata: { dealId: before.id, from: before.stage, to: input.stage, invoiceId },
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
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "invoices.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.invoice.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { contact: true, account: true },
  });
  if (["PAID", "VOID"].includes(before.status)) throw new Error(`A ${before.status.toLowerCase()} invoice cannot be sent`);
  const result = await db.$transaction(async (tx) => {
    const receivable = await tx.ledgerAccount.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "1100" } },
      update: {},
      create: { organizationId: organization.id, code: "1100", name: "Accounts Receivable", type: "ASSET", systemAccount: true },
    });
    const revenue = await tx.ledgerAccount.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "4000" } },
      update: {},
      create: { organizationId: organization.id, code: "4000", name: "Service Revenue", type: "INCOME", systemAccount: true },
    });
    let postedJournalId = before.postedJournalId;
    if (!postedJournalId) {
      const count = await tx.journalEntry.count({ where: { organizationId: organization.id } });
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
              { ledgerAccountId: receivable.id, debit: before.total, credit: 0, description: before.account?.name ?? before.invoiceNumber },
              { ledgerAccountId: revenue.id, debit: 0, credit: before.total, description: before.account?.name ?? before.invoiceNumber, sortOrder: 1 },
            ],
          },
        },
      });
      postedJournalId = journal.id;
    }
    const invoice = await tx.invoice.update({
      where: { id: before.id },
      data: { status: "SENT", sentAt: new Date(), publicTokenId: before.publicTokenId ?? nanoid(32), postedJournalId },
    });
    if (before.contact?.email) {
      await tx.emailMessage.create({
        data: {
          organizationId: organization.id,
          recipientEmail: before.contact.email,
          recipientName: `${before.contact.firstName} ${before.contact.lastName ?? ""}`.trim(),
          subject: `Invoice ${before.invoiceNumber} from ${organization.name}`,
          bodyHtml: `<p>Your invoice is ready. Use your secure ClearKey payment page to review and pay the balance.</p>`,
          status: process.env.MAILERSEND_API_KEY ? "QUEUED" : "PENDING_CONFIGURATION",
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
  const input = entityActionSchema.extend({
    resolution: z.enum(["EXPENSE", "PAYMENT"]),
    invoiceId: z.string().uuid().optional().or(z.literal("")),
    category: z.string().trim().max(100).optional().default("Uncategorized"),
  }).parse(Object.fromEntries(formData));
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "accounting.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const transaction = await db.bankTransaction.findFirstOrThrow({
    where: { id: input.entityId, organizationId: organization.id },
    include: { bankAccount: true },
  });
  if (transaction.status === "MATCHED") throw new Error("Bank transaction is already matched");
  const amount = Math.abs(Number(transaction.amount));

  const result = await db.$transaction(async (tx) => {
    const cash = transaction.bankAccount.ledgerAccountId
      ? await tx.ledgerAccount.findUniqueOrThrow({ where: { id: transaction.bankAccount.ledgerAccountId } })
      : await tx.ledgerAccount.upsert({
          where: { organizationId_code: { organizationId: organization.id, code: "1000" } },
          update: {},
          create: { organizationId: organization.id, code: "1000", name: "Operating Cash", type: "ASSET", systemAccount: true },
        });
    const count = await tx.journalEntry.count({ where: { organizationId: organization.id } });
    let matchedEntityId: string;
    let matchedEntityType: string;
    if (input.resolution === "PAYMENT") {
      if (!input.invoiceId) throw new Error("Choose an invoice for a customer payment");
      const invoice = await tx.invoice.findFirstOrThrow({ where: { id: input.invoiceId, organizationId: organization.id } });
      const appliedAmount = Math.min(amount, Number(invoice.balanceDue));
      const payment = await tx.payment.create({
        data: { organizationId: organization.id, amount, status: "SUCCEEDED", method: "BANK", referenceNumber: transaction.description, receivedAt: transaction.postedAt },
      });
      await tx.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: invoice.id, amount: appliedAmount } });
      const remaining = Math.max(0, Number(invoice.balanceDue) - appliedAmount);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: { increment: appliedAmount }, balanceDue: remaining, status: remaining === 0 ? "PAID" : "PARTIALLY_PAID", paidAt: remaining === 0 ? new Date() : null },
      });
      const receivable = await tx.ledgerAccount.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: "1100" } },
        update: {},
        create: { organizationId: organization.id, code: "1100", name: "Accounts Receivable", type: "ASSET", systemAccount: true },
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
          lines: { create: [{ ledgerAccountId: cash.id, debit: amount, credit: 0 }, { ledgerAccountId: receivable.id, debit: 0, credit: amount, sortOrder: 1 }] },
        },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { postedJournalId: journal.id } });
      matchedEntityId = payment.id;
      matchedEntityType = "PAYMENT";
    } else {
      const expenseAccount = await tx.ledgerAccount.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: "6100" } },
        update: {},
        create: { organizationId: organization.id, code: "6100", name: "Operating Expenses", type: "EXPENSE", systemAccount: true },
      });
      const expense = await tx.expense.create({
        data: { organizationId: organization.id, description: transaction.description, amount, incurredAt: transaction.postedAt, category: input.category },
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
          lines: { create: [{ ledgerAccountId: expenseAccount.id, debit: amount, credit: 0 }, { ledgerAccountId: cash.id, debit: 0, credit: amount, sortOrder: 1 }] },
        },
      });
      await tx.expense.update({ where: { id: expense.id }, data: { postedJournalId: journal.id } });
      matchedEntityId = expense.id;
      matchedEntityType = "EXPENSE";
    }
    await tx.bankTransaction.update({
      where: { id: transaction.id },
      data: { status: "MATCHED", category: input.category, matchedEntityId, matchedEntityType },
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
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "automations.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const rule = await db.automationRule.findFirstOrThrow({ where: { id: input.entityId, organizationId: organization.id } });
  const run = await db.automationRun.create({
    data: { organizationId: organization.id, automationRuleId: rule.id, status: "RUNNING", triggerPayload: { manual: true, actorUserId: user.id } },
  });
  try {
    let results: Record<string, unknown>[] = [];
    if (rule.triggerType === "INVOICE_OVERDUE") {
      const invoices = await db.invoice.findMany({
        where: { organizationId: organization.id, balanceDue: { gt: 0 }, dueDate: { lt: new Date() }, status: { notIn: ["PAID", "VOID"] } },
        include: { contact: true },
      });
      await db.$transaction(async (tx) => {
        for (const invoice of invoices) {
          await tx.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
          if (invoice.contact?.email) {
            await tx.emailMessage.create({
              data: {
                organizationId: organization.id,
                recipientEmail: invoice.contact.email,
                recipientName: `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim(),
                subject: `Reminder: invoice ${invoice.invoiceNumber} is overdue`,
                bodyHtml: `<p>Invoice ${invoice.invoiceNumber} has an outstanding balance. Please use your secure payment page or contact us with questions.</p>`,
                status: process.env.MAILERSEND_API_KEY ? "QUEUED" : "PENDING_CONFIGURATION",
                relatedType: "INVOICE",
                relatedId: invoice.id,
              },
            });
          }
          results.push({ invoiceId: invoice.id, status: "REMINDER_QUEUED", recipient: invoice.contact?.email ?? null });
        }
        await tx.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
        await tx.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", actionResults: results as Prisma.InputJsonValue, completedAt: new Date() } });
      });
    } else {
      results = [{ status: "NO_HANDLER", triggerType: rule.triggerType }];
      await db.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", actionResults: results as Prisma.InputJsonValue, completedAt: new Date() } });
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
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Unknown automation failure", completedAt: new Date() },
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
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "tasks.write");
  if (!user) throw new Error("A signed-in user is required");
  const db = getDb();
  const before = await db.task.findFirstOrThrow({ where: { id: input.entityId, organizationId: organization.id } });
  const task = await db.task.update({ where: { id: before.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  await appendAuditEvent({ organizationId: organization.id, actorUserId: user.id, action: "task.completed", entityType: "Task", entityId: task.id, before, after: task, category: "BUSINESS" });
  revalidatePath(`/app/${input.organizationSlug}`);
  revalidatePath(`/app/${input.organizationSlug}/tasks`);
}
