import { requireOrganizationAccess } from "@/lib/authorization";
import { calculateOrganizationPrice } from "@/lib/billing/pricing";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl, getOrCreateStripeCustomer } from "@/lib/integrations/stripe-workflows";

export async function POST(request: Request) {
  const input = await request.json() as { organizationSlug?: string };
  if (!input.organizationSlug) return Response.json({ error: "Organization is required" }, { status: 400 });
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "billing.manage");
  const pricing = await calculateOrganizationPrice(organization.id);
  if (pricing.manualQuoteRequired) return Response.json({ error: "Enterprise pricing requires an approved quote" }, { status: 409 });
  const customer = await getOrCreateStripeCustomer(organization.id);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: pricing.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: organization.defaultCurrency.toLowerCase(),
        unit_amount: line.unitAmountCents,
        recurring: { interval: "month" },
        product_data: { name: line.label, metadata: { pricingKey: line.key } },
      },
    })),
    success_url: appUrl(`/app/${organization.slug}/settings?billing=success`),
    cancel_url: appUrl(`/app/${organization.slug}/settings?billing=canceled`),
    allow_promotion_codes: true,
    billing_address_collection: "required",
    metadata: { organizationId: organization.id, organizationSlug: organization.slug, workflow: "platform_subscription", pricingVersion: pricing.pricingVersion, calculatedAmount: String(pricing.totalCents), billingTier: pricing.tier },
    subscription_data: { metadata: { organizationId: organization.id, organizationSlug: organization.slug, pricingVersion: pricing.pricingVersion, calculatedAmount: String(pricing.totalCents), billingTier: pricing.tier } },
  });
  await getDb().billingAuditLog.create({
    data: {
      organizationId: organization.id,
      action: "subscription.checkout.created",
      afterJson: { pricingVersion: pricing.pricingVersion, tier: pricing.tier, licensedUsers: pricing.licensedUsers, lines: pricing.lines },
      calculatedTotalCents: pricing.totalCents,
      stripeCustomerId: customer,
    },
  });
  return Response.json({ url: session.url });
}
