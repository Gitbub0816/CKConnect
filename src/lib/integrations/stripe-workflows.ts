import "server-only";

import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/integrations/stripe";

export function appUrl(path = "") {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

export async function getOrCreateStripeCustomer(organizationId: string) {
  const db = getDb();
  const organization = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
  if (organization.stripeCustomerId) return organization.stripeCustomerId;
  const customer = await getStripe().customers.create({
    name: organization.legalName ?? organization.name,
    metadata: { organizationId: organization.id, organizationSlug: organization.slug },
  });
  await db.organization.update({ where: { id: organization.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export function platformFee(amountInCents: number) {
  return Math.round(amountInCents * env.PLATFORM_APPLICATION_FEE_BPS / 10_000);
}
