import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { publishSiteManifest } from "@/lib/integrations/cloudflare-edge";
import { appendAuditEvent } from "@/lib/logging/audit";

type PublishWebsiteInput = {
  actorUserId: string;
  db: PrismaClient;
  organizationId: string;
  organizationSlug: string;
  request?: {
    method?: string;
    path?: string;
    requestId?: string;
    userAgent?: string;
  };
  websiteId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizePath(path: string) {
  return path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export async function publishWebsite({
  actorUserId,
  db,
  organizationId,
  organizationSlug,
  request,
  websiteId,
}: PublishWebsiteInput) {
  const before = await db.website.findFirstOrThrow({
    where: { id: websiteId, organizationId },
    include: {
      pages: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  const publishablePages = before.pages.filter((page) => {
    const content = asRecord(page.contentJson);
    const blocks = Array.isArray(content.blocks) ? content.blocks : [];
    const code = asRecord(content.code);
    return blocks.length > 0 || Boolean(code.html || code.css || code.javascript);
  });
  if (!publishablePages.length) {
    throw new Error("Add at least one page section or code canvas before publishing.");
  }
  if (!publishablePages.some((page) => normalizePath(page.path) === "/")) {
    throw new Error("A published website needs a home page at /.");
  }

  const publishedAt = new Date();
  const pageManifest = publishablePages.map((page) => ({
    id: page.id,
    path: normalizePath(page.path),
    title: page.title,
    updatedAt: page.updatedAt.toISOString(),
  }));
  const deployment = {
    id: `deploy_${publishedAt.getTime().toString(36)}`,
    createdAt: publishedAt.toISOString(),
    hostname: before.defaultHostname,
    pageCount: pageManifest.length,
    pages: pageManifest,
    source: "clearkey-next",
    status: "LIVE",
  };

  const edgeMirror = await publishSiteManifest({
    organizationId,
    websiteId: before.id,
    hostname: before.defaultHostname,
    publishedAt: publishedAt.toISOString(),
  });

  const previousConfig = asRecord(before.configJson);
  const after = await db.$transaction(async (tx) => {
    await tx.websitePage.updateMany({
      where: { id: { in: publishablePages.map((page) => page.id) } },
      data: { status: "PUBLISHED" },
    });
    await tx.websitePage.updateMany({
      where: {
        websiteId: before.id,
        id: { notIn: publishablePages.map((page) => page.id) },
      },
      data: { status: "DRAFT" },
    });
    return tx.website.update({
      where: { id: before.id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        configJson: {
          ...previousConfig,
          lastDeployment: deployment,
          publication: {
            edgeMirror,
            lastPublishedAt: publishedAt.toISOString(),
            publishedBy: actorUserId,
          },
        } as Prisma.InputJsonValue,
      },
      include: { pages: true },
    });
  });

  await appendAuditEvent({
    organizationId,
    actorUserId,
    action: "website.published",
    entityType: "Website",
    entityId: before.id,
    before,
    after: { website: after, deployment, edgeMirror },
    category: "BUSINESS",
    metadata: {
      hostname: before.defaultHostname,
      organizationSlug,
      pageCount: pageManifest.length,
    },
    request,
  });

  return { deployment, edgeMirror, website: after };
}
