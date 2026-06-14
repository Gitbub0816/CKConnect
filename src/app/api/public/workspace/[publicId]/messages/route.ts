import { z } from "zod";
import { verifyCustomerWorkspaceToken } from "@/lib/customer-workspace-token";
import { getDb } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const input = z.object({ token: z.string().min(20), name: z.string().trim().min(2).max(120), email: z.string().email(), body: z.string().trim().min(1).max(5000) }).parse(await request.json());
  if (!verifyCustomerWorkspaceToken(input.token, publicId)) return Response.json({ error: "Workspace link is invalid or expired" }, { status: 403 });
  const db = getDb();
  const channel = await db.collaborationChannel.findFirst({ where: { publicId, channelType: "CUSTOMER", archivedAt: null } });
  if (!channel) return Response.json({ error: "Workspace not found" }, { status: 404 });
  const recent = await db.collaborationMessage.count({ where: { channelId: channel.id, authorUserId: null, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 20) return Response.json({ error: "Message limit reached. Try again shortly." }, { status: 429 });
  const [firstName, ...lastName] = input.name.split(/\s+/);
  const contact = await db.contact.findFirst({ where: { organizationId: channel.organizationId, email: input.email.toLowerCase() } }) ?? await db.contact.create({ data: { organizationId: channel.organizationId, firstName, lastName: lastName.join(" ") || null, email: input.email.toLowerCase(), lifecycleStatus: "CUSTOMER" } });
  const message = await db.collaborationMessage.create({ data: { channelId: channel.id, contactId: contact.id, body: input.body, messageType: "CUSTOMER_REPLY", metadata: { customerEmail: input.email.toLowerCase() } } });
  return Response.json({ ok: true, messageId: message.publicId }, { status: 201 });
}
