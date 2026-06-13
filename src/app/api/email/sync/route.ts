import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const { organizationSlug } = z.object({ organizationSlug: z.string() }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(organizationSlug, "email.manage");
  const integration = await getDb().integration.findUnique({ where: { organizationId_provider: { organizationId: organization.id, provider: "ZOHO_MAIL" } } });
  if (!integration?.encryptedCredentials) return Response.json({ error: "Zoho Mail is not connected" }, { status: 409 });
  await getDb().integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date(), status: "ACTIVE", lastError: null } });
  return Response.json({ ok: true, mailboxes: await getDb().managedMailbox.count({ where: { organizationId: organization.id } }) });
}
