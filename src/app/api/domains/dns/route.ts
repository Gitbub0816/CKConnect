import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "domains.read");
  const domains = await getDb().organizationDomain.findMany({ where: { organizationId: organization.id }, include: { dnsRecords: true } });
  return Response.json({ domains });
}
