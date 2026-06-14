import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { CloudflareDnsProvider } from "@/lib/integrations/dns-provider";

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), domainId: z.string().uuid() }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "domains.manage");
  const domain = await getDb().organizationDomain.findFirst({ where: { id: input.domainId, organizationId: organization.id } });
  if (!domain) return Response.json({ error: "Domain not found" }, { status: 404 });
  const provider = new CloudflareDnsProvider();
  const checks = await provider.inspectDomain(domain.hostname, domain.verificationToken);
  const verified = checks.find((check) => check.key === "ownership")?.status === "HEALTHY";
  if (!verified) return Response.json({ ok: false, checks, error: "The exact ClearKey ownership TXT record was not found." }, { status: 409 });
  let sslEnabled = false;
  try {
    const response = await fetch(`https://${domain.hostname}`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
    sslEnabled = response.status > 0;
  } catch {
    sslEnabled = false;
  }
  const updated = await getDb().$transaction(async (tx) => {
    for (const check of checks) {
      await tx.dnsRecord.upsert({
        where: { organizationDomainId_recordType_name_value: { organizationDomainId: domain.id, recordType: "HEALTH", name: check.key, value: check.answers.join(" | ") || "MISSING" } },
        create: { organizationDomainId: domain.id, recordType: "HEALTH", name: check.key, value: check.answers.join(" | ") || "MISSING", status: check.status, lastCheckedAt: new Date() },
        update: { status: check.status, lastCheckedAt: new Date() },
      });
    }
    return tx.organizationDomain.update({ where: { id: domain.id }, data: { status: "VERIFIED", verifiedAt: new Date(), sslEnabled } });
  });
  return Response.json({ ok: true, domain: updated, checks });
}
