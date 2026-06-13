import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { CloudflareDnsProvider } from "@/lib/integrations/dns-provider";

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), domainId: z.string().uuid() }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "domains.manage");
  const domain = await getDb().organizationDomain.findFirst({ where: { id: input.domainId, organizationId: organization.id }, include: { dnsRecords: true } });
  if (!domain) return Response.json({ error: "Domain not found" }, { status: 404 });
  if (!domain.cloudflareZoneId) return Response.json({ error: "Cloudflare zone is not connected" }, { status: 409 });
  const provider = new CloudflareDnsProvider();
  const remote = await provider.listRecords(domain.cloudflareZoneId);
  for (const record of remote) {
    await getDb().dnsRecord.upsert({
      where: { organizationDomainId_recordType_name_value: { organizationDomainId: domain.id, recordType: record.type, name: record.name, value: record.content } },
      create: { organizationDomainId: domain.id, recordType: record.type, name: record.name, value: record.content, cloudflareRecordId: record.id, status: "HEALTHY", lastCheckedAt: new Date() },
      update: { cloudflareRecordId: record.id, status: "HEALTHY", lastCheckedAt: new Date() },
    });
  }
  return Response.json({ ok: true, records: remote.length });
}
