import "server-only";

import { getDb } from "@/lib/db";

const CORE_PLATFORM_CENTS = 9_900;
const INCLUDED_USERS = 5;
const EXTRA_USER_CENTS = 1_000;

const ADD_ONS = {
  payrollProvider: {
    label: "Payroll & HR Sync",
    unitAmountCents: 12_900,
  },
  quickbooks: {
    label: "QuickBooks Integration",
    unitAmountCents: 4_900,
  },
  bankFeed: {
    label: "Bank Feed Integration",
    unitAmountCents: 2_900,
  },
  sms: {
    label: "SMS Messaging base",
    unitAmountCents: 1_000,
  },
  customDomain: {
    label: "Custom Domain Hosting",
    unitAmountCents: 900,
  },
  aiExpansion: {
    label: "AI Expansion Pack",
    unitAmountCents: 2_900,
  },
} as const;

export type PricingLine = {
  key: string;
  label: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

function line(
  key: string,
  label: string,
  quantity: number,
  unitAmountCents: number,
): PricingLine | null {
  if (quantity <= 0) return null;
  return {
    key,
    label,
    quantity,
    unitAmountCents,
    amountCents: quantity * unitAmountCents,
  };
}

export async function calculateOrganizationPrice(organizationId: string) {
  const db = getDb();
  const [organization, pricingRecord] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        bankAccounts: true,
        domains: true,
        integrations: true,
        moduleConfiguration: true,
        payrollConnection: true,
        usage: true,
      },
    }),
    db.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const pricingVersion =
    pricingRecord?.pricingVersion ?? organization.pricingVersion ?? "2026-core";
  const seats = Math.max(1, organization.usage?.licensedUsers ?? 1);

  if (
    organization.pricingOverrideEnabled &&
    organization.pricingOverrideAmountCents !== null
  ) {
    return {
      pricingVersion,
      tier: "core",
      licensedUsers: seats,
      manualQuoteRequired: false,
      override: true,
      lines: [
        {
          key: "pricingOverride",
          label: "Contracted Connect subscription",
          quantity: 1,
          unitAmountCents: organization.pricingOverrideAmountCents,
          amountCents: organization.pricingOverrideAmountCents,
        },
      ],
      totalCents: organization.pricingOverrideAmountCents,
    };
  }

  const additionalSeats = Math.max(0, seats - INCLUDED_USERS);
  const connectedBankFeeds = organization.bankAccounts.filter(
    (account) => account.connectionStatus !== "MANUAL",
  ).length;
  const customDomains = organization.domains.filter(
    (domain) => domain.kind === "CUSTOM",
  ).length;
  const hasQuickBooks = organization.integrations.some(
    (integration) =>
      integration.provider === "QUICKBOOKS" &&
      ["ACTIVE", "CONNECTING", "REAUTH_REQUIRED"].includes(integration.status),
  );
  const hasSms =
    organization.moduleConfiguration?.marketing === true ||
    organization.integrations.some((integration) => integration.provider === "SMS");
  const lines = [
    line(
      "core",
      `Connect Platform (${INCLUDED_USERS} internal users included)`,
      1,
      CORE_PLATFORM_CENTS,
    ),
    line("licensedUsers", "Additional internal users", additionalSeats, EXTRA_USER_CENTS),
    line(
      "payrollProvider",
      ADD_ONS.payrollProvider.label,
      organization.payrollConnection ? 1 : 0,
      ADD_ONS.payrollProvider.unitAmountCents,
    ),
    line(
      "quickbooks",
      ADD_ONS.quickbooks.label,
      hasQuickBooks ? 1 : 0,
      ADD_ONS.quickbooks.unitAmountCents,
    ),
    line(
      "bankFeed",
      ADD_ONS.bankFeed.label,
      connectedBankFeeds,
      ADD_ONS.bankFeed.unitAmountCents,
    ),
    line("sms", ADD_ONS.sms.label, hasSms ? 1 : 0, ADD_ONS.sms.unitAmountCents),
    line(
      "customDomain",
      ADD_ONS.customDomain.label,
      customDomains,
      ADD_ONS.customDomain.unitAmountCents,
    ),
    line(
      "aiExpansion",
      ADD_ONS.aiExpansion.label,
      organization.moduleConfiguration?.advancedAi ? 1 : 0,
      ADD_ONS.aiExpansion.unitAmountCents,
    ),
  ].filter((item): item is PricingLine => Boolean(item));

  return {
    pricingVersion,
    tier: "core",
    licensedUsers: seats,
    manualQuoteRequired: false,
    override: false,
    lines,
    totalCents: lines.reduce((sum, item) => sum + item.amountCents, 0),
  };
}
