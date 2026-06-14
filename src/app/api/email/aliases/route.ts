import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const input = z.object({ mailboxId: z.string().uuid(), email: z.string().email() }).parse(await request.json());
  const mailbox = await getDb().managedMailbox.findUnique({ where: { id: input.mailboxId }, include: { organization: true } });
  if (!mailbox) return Response.json({ error: "Mailbox not found" }, { status: 404 });
  await requireOrganizationAccess(mailbox.organization.slug, "email.write");
  return Response.json({ alias: await getDb().mailboxAlias.create({ data: { mailboxId: mailbox.id, email: input.email.toLowerCase() } }) }, { status: 201 });
}
