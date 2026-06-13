import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { CloudflareDnsProvider } from "@/lib/integrations/dns-provider";

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), domainId: z.string().uuid() }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "domains.manage");
  const domain = await getDb().organizationDomain.findFirst({ where: { id: input.domainId, organizationId: organization.id } });
  if (!domain) return Response.json({ error: "Domain not found" }, { status: 404 });
  const verified = await new CloudflareDnsProvider().verifyDomain(domain.hostname);
  if (!verified) return Response.json({ ok: false, error: "Domain DNS is not delegated or resolvable yet." }, { status: 409 });
  const updated = await getDb().organizationDomain.update({ where: { id: domain.id }, data: { status: "VERIFIED", verifiedAt: new Date(), sslEnabled: true } });
  return Response.json({ ok: true, domain: updated });
}
