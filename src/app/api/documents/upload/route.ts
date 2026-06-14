import { nanoid } from "nanoid";
import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { signR2Upload } from "@/lib/integrations/r2";
import { appendAuditEvent } from "@/lib/logging/audit";
import { assertTrustedMutationOrigin } from "@/lib/request-security";

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "font/woff",
  "font/woff2",
  "text/css",
  "text/csv",
  "text/plain",
  "application/javascript",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  assertTrustedMutationOrigin(request);
  const input = z
    .object({
      organizationSlug: z.string().min(1),
      fileName: z.string().trim().min(1).max(180),
      contentType: z.string().min(1),
      sizeBytes: z
        .number()
        .int()
        .positive()
        .max(250 * 1024 * 1024),
      relatedType: z.string().trim().max(50).optional(),
      relatedId: z.string().uuid().optional(),
    })
    .parse(await request.json());
  const permission =
    input.relatedType === "WEBSITE_PAGE" ? "websites.write" : "documents.write";
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    permission,
  );
  const policyScope =
    input.relatedType === "WEBSITE_PAGE" ? "WEBSITE_ASSETS" : "DOCUMENTS";
  const policy = await getDb().storagePolicy.findUnique({
    where: {
      organizationId_scope: {
        organizationId: organization.id,
        scope: policyScope,
      },
    },
  });
  const configuredTypes = Array.isArray(policy?.allowedTypesJson)
    ? policy.allowedTypesJson.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const permittedTypes = configuredTypes.length
    ? new Set(configuredTypes)
    : allowedTypes;
  if (!permittedTypes.has(input.contentType))
    return Response.json(
      { error: "File type is not allowed by the storage policy" },
      { status: 415 },
    );
  if (policy && BigInt(input.sizeBytes) > policy.maxFileSizeBytes)
    return Response.json(
      { error: "File exceeds the storage policy size limit" },
      { status: 413 },
    );
  const objectKey = `${organization.id}/${new Date().getUTCFullYear()}/${nanoid(24)}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const file = await getDb().storedFile.create({
    data: {
      organizationId: organization.id,
      objectKey,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: BigInt(input.sizeBytes),
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      uploadedById: user?.id,
      status: "PENDING_UPLOAD",
      scanStatus: "PENDING",
      retentionClass: policy?.retentionClass ?? "STANDARD",
    },
  });
  const uploadUrl = await signR2Upload({
    key: objectKey,
    contentType: input.contentType,
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "document.upload.created",
    entityType: "StoredFile",
    entityId: file.id,
    after: {
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: input.sizeBytes,
    },
    category: "BUSINESS",
  });
  return Response.json({ fileId: file.id, uploadUrl });
}

export async function PATCH(request: Request) {
  assertTrustedMutationOrigin(request);
  const input = z
    .object({ organizationSlug: z.string(), fileId: z.string().uuid() })
    .parse(await request.json());
  const pending = await getDb().storedFile.findUniqueOrThrow({
    where: { id: input.fileId },
  });
  const permission =
    pending.relatedType === "WEBSITE_PAGE"
      ? "websites.write"
      : "documents.write";
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    permission,
  );
  const file = await getDb().storedFile.findFirstOrThrow({
    where: { id: input.fileId, organizationId: organization.id },
  });
  const updated = await getDb().storedFile.update({
    where: { id: file.id },
    data: { status: "AVAILABLE", scanStatus: "PENDING" },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user?.id,
    action: "document.upload.completed",
    entityType: "StoredFile",
    entityId: file.id,
    before: file,
    after: updated,
    category: "BUSINESS",
  });
  return Response.json({
    file: { ...updated, sizeBytes: Number(updated.sizeBytes) },
  });
}
