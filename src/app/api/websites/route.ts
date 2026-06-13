import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "websites.read");
  return Response.json({ websites: await getDb().website.findMany({ where: { organizationId: organization.id }, include: { pages: true } }) });
}

export async function POST(request: Request) {
  const input = z.object({ organizationSlug: z.string(), slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1) }).parse(await request.json());
  const { organization } = await requireOrganizationAccess(input.organizationSlug, "websites.write");
  const website = await getDb().website.create({
    data: {
      organizationId: organization.id,
      slug: input.slug,
      defaultHostname: `${organization.slug}.cksites.dev`,
      pages: { create: { path: "/", title: input.title, contentJson: { navigation: [], blocks: [] } } },
    },
    include: { pages: true },
  });
  return Response.json({ website }, { status: 201 });
}
