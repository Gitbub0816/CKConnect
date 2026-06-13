import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

async function mailboxForAccess(id: string) {
  return getDb().managedMailbox.findUnique({ where: { id }, include: { organization: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mailbox = await mailboxForAccess(id);
  if (!mailbox) return Response.json({ error: "Mailbox not found" }, { status: 404 });
  await requireOrganizationAccess(mailbox.organization.slug, "email.write");
  const input = z.object({ displayName: z.string().min(1).optional(), active: z.boolean().optional() }).parse(await request.json());
  return Response.json({ mailbox: await getDb().managedMailbox.update({ where: { id }, data: input }) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mailbox = await mailboxForAccess(id);
  if (!mailbox) return Response.json({ error: "Mailbox not found" }, { status: 404 });
  await requireOrganizationAccess(mailbox.organization.slug, "email.write");
  await getDb().$transaction([
    getDb().managedMailbox.delete({ where: { id } }),
    getDb().organizationUsage.update({ where: { organizationId: mailbox.organizationId }, data: { mailboxCount: { decrement: 1 } } }),
  ]);
  return new Response(null, { status: 204 });
}
