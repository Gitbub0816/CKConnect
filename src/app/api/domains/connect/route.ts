import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), hostname: z.string().min(4) }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "domains.manage");
  const hostname = input.hostname.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const domain = await getDb().organizationDomain.upsert({
    where: { hostname },
    create: { organizationId: organization.id, hostname, kind: "CUSTOM", status: "PENDING" },
    update: { organizationId: organization.id },
  });
  return Response.json({ domain, verification: { type: "TXT", name: `_clearkey.${hostname}`, value: domain.verificationToken } });
}
