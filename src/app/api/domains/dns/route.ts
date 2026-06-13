import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { CloudflareDnsProvider } from "@/lib/integrations/dns-provider";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "domains.read");
  const domains = await getDb().organizationDomain.findMany({ where: { organizationId: organization.id }, include: { dnsRecords: true } });
  const provider = new CloudflareDnsProvider();
  const health = await Promise.all(domains.map(async (domain) => ({
    domainId: domain.id,
    hostname: domain.hostname,
    checks: await provider.inspectDomain(domain.hostname, domain.verificationToken),
  })));
  return Response.json({ domains, health });
}
