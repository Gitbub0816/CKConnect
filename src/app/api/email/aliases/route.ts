import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { appendAuditEvent } from "@/lib/logging/audit";

export async function POST(request: Request) {
  const input = z.object({ mailboxId: z.string().uuid(), email: z.string().email() }).parse(await request.json());
  const mailbox = await getDb().managedMailbox.findUnique({ where: { id: input.mailboxId }, include: { organization: true, domain: true } });
  if (!mailbox) return Response.json({ error: "Mailbox not found" }, { status: 404 });
  const { user } = await requireOrganizationAccess(mailbox.organization.slug, "email.write");
  const email = input.email.toLowerCase();
  const aliasDomain = email.split("@").at(1);
  if (!mailbox.domain || aliasDomain !== mailbox.domain.hostname) {
    return Response.json({ error: "Aliases must use the mailbox's verified tenant domain." }, { status: 409 });
  }
  const alias = await getDb().mailboxAlias.create({ data: { mailboxId: mailbox.id, email } });
  await appendAuditEvent({
    organizationId: mailbox.organizationId,
    actorUserId: user?.id,
    action: "email.alias_created",
    entityType: "MailboxAlias",
    entityId: alias.id,
    category: "INTEGRATION",
    after: { mailboxId: mailbox.id, email },
    retentionClass: "SECURITY_7Y",
  });
  return Response.json({ alias }, { status: 201 });
}
