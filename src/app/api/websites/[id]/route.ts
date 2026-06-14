import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const website = await getDb().website.findUnique({ where: { id }, include: { organization: true, pages: true } });
  if (!website) return Response.json({ error: "Website not found" }, { status: 404 });
  await requireOrganizationAccess(website.organization.slug, "websites.read");
  return Response.json({ website });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getDb().website.findUnique({ where: { id }, include: { organization: true } });
  if (!current) return Response.json({ error: "Website not found" }, { status: 404 });
  await requireOrganizationAccess(current.organization.slug, "websites.write");
  const input = z.object({ themeJson: z.record(z.string(), z.unknown()).optional(), configJson: z.record(z.string(), z.unknown()).optional() }).parse(await request.json());
  return Response.json({ website: await getDb().website.update({
    where: { id },
    data: {
      themeJson: input.themeJson as Prisma.InputJsonValue | undefined,
      configJson: input.configJson as Prisma.InputJsonValue | undefined,
    },
  }) });
}
