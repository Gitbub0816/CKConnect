import "server-only";

import { z } from "zod";
import { getDb } from "@/lib/db";

const tierSchema = z.object({
  minUsers: z.number().int(),
  maxUsers: z.number().int().nullable(),
  baseCents: z.number().int().optional(),
  includedUsers: z.number().int().optional(),
  extraUserCents: z.number().int().optional(),
  customQuoteRequired: z.boolean().optional(),
});

const pricingSchema = z.object({
  tiers: z.object({
    starter: tierSchema,
    growth: tierSchema,
    enterprise: tierSchema,
  }),
  modules: z.object({
    starter: z.record(z.string(), z.number().int()),
    growth: z.record(z.string(), z.number().int()),
  }),
  email: z.object({ managedMailboxCents: z.number().int() }),
});

const moduleLabels: Record<string, string> = {
  accounting: "Accounting",
  workforce: "Workforce",
  scheduling: "Scheduling",
  timeClock: "Time clock",
  marketing: "Marketing",
  payroll: "Payroll integration",
  advancedAi: "Advanced AI",
  advancedAnalytics: "Advanced analytics",
  premiumTemplates: "Premium website templates",
  managedDomain: "Managed DNS and domain",
};

export type PricingLine = { key: string; label: string; quantity: number; unitAmountCents: number; amountCents: number };

export async function calculateOrganizationPrice(organizationId: string) {
  const db = getDb();
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { moduleConfiguration: true, usage: true },
  });
  const pricingRecord = await db.pricingConfig.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  if (!pricingRecord) throw new Error("Active pricing configuration is missing");
  const pricing = pricingSchema.parse(pricingRecord.config);
  const seats = Math.max(1, organization.usage?.licensedUsers ?? 1);
  const tier = seats >= 100 ? "enterprise" : seats >= 50 ? "growth" : "starter";

  if (organization.pricingOverrideEnabled && organization.pricingOverrideAmountCents !== null) {
    return {
      pricingVersion: pricingRecord.pricingVersion,
      tier,
      licensedUsers: seats,
      manualQuoteRequired: false,
      override: true,
      lines: [{ key: "pricingOverride", label: "Contracted platform subscription", quantity: 1, unitAmountCents: organization.pricingOverrideAmountCents, amountCents: organization.pricingOverrideAmountCents }],
      totalCents: organization.pricingOverrideAmountCents,
    };
  }

  if (tier === "enterprise") {
    return { pricingVersion: pricingRecord.pricingVersion, tier, licensedUsers: seats, manualQuoteRequired: true, override: false, lines: [] as PricingLine[], totalCents: 0 };
  }

  const tierConfig = pricing.tiers[tier];
  const baseCents = tierConfig.baseCents ?? 0;
  const includedUsers = tierConfig.includedUsers ?? 0;
  const additionalSeats = Math.max(0, seats - includedUsers);
  const lines: PricingLine[] = [
    { key: "core", label: `Core platform (${includedUsers} licensed users included)`, quantity: 1, unitAmountCents: baseCents, amountCents: baseCents },
  ];
  if (additionalSeats) {
    const unitAmountCents = tierConfig.extraUserCents ?? 0;
    lines.push({ key: "licensedUsers", label: "Additional licensed users", quantity: additionalSeats, unitAmountCents, amountCents: additionalSeats * unitAmountCents });
  }

  const modules = organization.moduleConfiguration;
  const modulePrices = pricing.modules[tier];
  if (modules) {
    for (const [key, unitAmountCents] of Object.entries(modulePrices)) {
      if (modules[key as keyof typeof modules] === true) {
        lines.push({ key, label: moduleLabels[key] ?? key, quantity: 1, unitAmountCents, amountCents: unitAmountCents });
      }
    }
  }
  const mailboxCount = organization.usage?.mailboxCount ?? 0;
  if (modules?.managedEmail && mailboxCount > 0) {
    lines.push({
      key: "managedEmail",
      label: "Managed business mailboxes",
      quantity: mailboxCount,
      unitAmountCents: pricing.email.managedMailboxCents,
      amountCents: mailboxCount * pricing.email.managedMailboxCents,
    });
  }

  return {
    pricingVersion: pricingRecord.pricingVersion,
    tier,
    licensedUsers: seats,
    manualQuoteRequired: false,
    override: false,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
  };
}
