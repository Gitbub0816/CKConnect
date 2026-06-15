import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { provisionZohoMailbox } from "@/lib/integrations/zoho-mail";
import { appendAuditEvent } from "@/lib/logging/audit";

const localPartSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/, "Use a valid mailbox name");

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "email.read");
  const [mailboxes, domains] = await Promise.all([
    getDb().managedMailbox.findMany({
      where: { organizationId: organization.id },
      include: { aliases: true, domain: true },
      orderBy: { createdAt: "desc" },
    }),
    getDb().organizationDomain.findMany({
      where: { organizationId: organization.id, status: "VERIFIED" },
      orderBy: { hostname: "asc" },
    }),
  ]);
  return Response.json({ mailboxes, verifiedDomains: domains });
}

export async function POST(request: Request) {
  const input = z.object({
    organizationSlug: z.string(),
    domainId: z.string().uuid(),
    localPart: localPartSchema,
    displayName: z.string().trim().min(1).max(120),
  }).parse(await request.json());
  const { organization, user } = await requireOrganizationAccess(input.organizationSlug, "email.write");
  const domain = await getDb().organizationDomain.findFirst({
    where: {
      id: input.domainId,
      organizationId: organization.id,
      status: "VERIFIED",
      verifiedAt: { not: null },
    },
  });
  if (!domain) {
    return Response.json({ error: "Verify this domain before creating tenant mailboxes." }, { status: 409 });
  }
  const email = `${input.localPart}@${domain.hostname}`.toLowerCase();
  const mailbox = await getDb().$transaction(async (tx) => {
    const created = await tx.managedMailbox.create({
      data: {
        organizationId: organization.id,
        organizationDomainId: domain.id,
        localPart: input.localPart,
        email,
        displayName: input.displayName,
        provider: "ZOHO",
        status: "PENDING_PROVIDER_SYNC",
      },
    });
    await tx.organizationUsage.upsert({ where: { organizationId: organization.id }, create: { organizationId: organization.id, mailboxCount: 1 }, update: { mailboxCount: { increment: 1 } } });
    return created;
  });
  try {
    const result = await provisionZohoMailbox({
      organizationId: organization.id,
      email,
      localPart: input.localPart,
      domain: domain.hostname,
      displayName: input.displayName,
    });
    const updated = await getDb().managedMailbox.update({
      where: { id: mailbox.id },
      data: {
        providerMailboxId: result.providerMailboxId,
        providerStatus: result.providerStatus,
        status: result.status,
        lastProvisionedAt: result.status === "ACTIVE" ? new Date() : null,
        metadata: (result.raw ?? {}) as Prisma.InputJsonValue,
      },
      include: { aliases: true, domain: true },
    });
    await appendAuditEvent({
      organizationId: organization.id,
      actorUserId: user?.id,
      action: "email.mailbox_created",
      entityType: "ManagedMailbox",
      entityId: updated.id,
      category: "INTEGRATION",
      after: { email: updated.email, status: updated.status, providerStatus: updated.providerStatus },
      retentionClass: "SECURITY_7Y",
    });
    return Response.json({ mailbox: updated, provisioningStatus: updated.status }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoho mailbox provisioning failed";
    const failed = await getDb().managedMailbox.update({
      where: { id: mailbox.id },
      data: { status: "PROVIDER_ERROR", providerStatus: "ERROR", lastProvisioningError: message },
      include: { aliases: true, domain: true },
    });
    await appendAuditEvent({
      organizationId: organization.id,
      actorUserId: user?.id,
      action: "email.mailbox_provisioning_failed",
      entityType: "ManagedMailbox",
      entityId: failed.id,
      category: "INTEGRATION",
      severity: "WARNING",
      outcome: "FAILURE",
      after: { email: failed.email, error: message },
      retentionClass: "SECURITY_7Y",
    });
    return Response.json({ mailbox: failed, provisioningStatus: "PROVIDER_ERROR", error: message }, { status: 502 });
  }
}
