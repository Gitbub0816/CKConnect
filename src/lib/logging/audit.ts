import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { calculateAuditHash } from "./audit-hash";
import { redact } from "./redact";

export type AuditEvent = {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  category?: "AUTH" | "SECURITY" | "FINANCIAL" | "ADMIN" | "BUSINESS" | "INTEGRATION";
  severity?: "INFO" | "WARNING" | "CRITICAL";
  outcome?: "SUCCESS" | "DENIED" | "FAILURE";
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  request?: {
    requestId?: string;
    correlationId?: string;
    method?: string;
    path?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  retentionClass?: "STANDARD" | "FINANCIAL_7Y" | "SECURITY_7Y" | "PERMANENT";
};

export async function appendAuditEvent(event: AuditEvent) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${event.organizationId}, 0))`;
    const head = await tx.auditChainHead.upsert({
      where: { organizationId: event.organizationId },
      create: { organizationId: event.organizationId },
      update: {},
    });
    const sequence = head.lastSequence + BigInt(1);
    const occurredAt = new Date();
    const safeBefore = redact(event.before) as Prisma.InputJsonValue | undefined;
    const safeAfter = redact(event.after) as Prisma.InputJsonValue | undefined;
    const safeMetadata = redact(event.metadata) as Prisma.InputJsonValue | undefined;
    const hashPayload = { ...event, before: safeBefore, after: safeAfter, metadata: safeMetadata, sequence: sequence.toString(), occurredAt: occurredAt.toISOString() };
    const recordHash = calculateAuditHash(hashPayload, head.lastHash);

    const record = await tx.auditLog.create({
      data: {
        organizationId: event.organizationId,
        actorUserId: event.actorUserId,
        sequence,
        category: event.category ?? "BUSINESS",
        severity: event.severity ?? "INFO",
        outcome: event.outcome ?? "SUCCESS",
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        beforeJson: safeBefore,
        afterJson: safeAfter,
        metadata: safeMetadata,
        requestId: event.request?.requestId,
        correlationId: event.request?.correlationId,
        requestMethod: event.request?.method,
        requestPath: event.request?.path,
        ipAddress: event.request?.ipAddress,
        userAgent: event.request?.userAgent,
        retentionClass: event.retentionClass ?? "STANDARD",
        previousHash: head.lastHash,
        recordHash,
        createdAt: occurredAt,
      },
    });
    await tx.auditChainHead.update({
      where: { organizationId: event.organizationId },
      data: { lastSequence: sequence, lastHash: recordHash },
    });
    return record;
  });
}
