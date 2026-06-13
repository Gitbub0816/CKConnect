import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl } from "@/lib/integrations/stripe-workflows";

export async function POST(request: Request) {
  const { organizationSlug } = z.object({ organizationSlug: z.string().min(1) }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(organizationSlug, "integrations.manage");
  const stripe = getStripe();
  let accountId = organization.stripeConnectedAccountId;
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      display_name: organization.legalName ?? organization.name,
      dashboard: "express",
      defaults: { currency: organization.defaultCurrency.toLowerCase() },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { organizationId: organization.id, organizationSlug: organization.slug },
    });
    accountId = account.id;
    await getDb().organization.update({ where: { id: organization.id }, data: { stripeConnectedAccountId: accountId } });
  }
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        collection_options: { fields: "eventually_due", future_requirements: "include" },
        refresh_url: appUrl(`/app/${organization.slug}/integrations?stripe=refresh`),
        return_url: appUrl(`/app/${organization.slug}/integrations?stripe=returned`),
      },
    },
  });
  return Response.json({ url: link.url, accountId });
}
