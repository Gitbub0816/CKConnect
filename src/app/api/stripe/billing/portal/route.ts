import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getStripe } from "@/lib/integrations/stripe";
import { appUrl, getOrCreateStripeCustomer } from "@/lib/integrations/stripe-workflows";

export async function POST(request: Request) {
  const { organizationSlug } = z.object({ organizationSlug: z.string().min(1) }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(organizationSlug, "billing.manage");
  const customer = await getOrCreateStripeCustomer(organization.id);
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: appUrl(`/app/${organization.slug}/settings`),
  });
  return Response.json({ url: session.url });
}
