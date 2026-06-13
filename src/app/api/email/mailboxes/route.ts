import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "email.read");
  return Response.json({ mailboxes: await getDb().managedMailbox.findMany({ where: { organizationId: organization.id }, include: { aliases: true } }) });
}

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), email: z.string().email(), displayName: z.string().min(1) }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "email.manage");
  const mailbox = await getDb().$transaction(async (tx) => {
    const created = await tx.managedMailbox.create({ data: { organizationId: organization.id, email: input.email.toLowerCase(), displayName: input.displayName, provider: "ZOHO" } });
    await tx.organizationUsage.upsert({ where: { organizationId: organization.id }, create: { organizationId: organization.id, mailboxCount: 1 }, update: { mailboxCount: { increment: 1 } } });
    return created;
  });
  return Response.json({ mailbox, provisioningStatus: process.env.ZOHO_CLIENT_ID ? "PENDING_PROVIDER_SYNC" : "PENDING_CONFIGURATION" }, { status: 201 });
}
