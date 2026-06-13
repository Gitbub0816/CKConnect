import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const website = await getDb().website.findUnique({ where: { id }, include: { organization: true } });
  if (!website) return Response.json({ error: "Website not found" }, { status: 404 });
  await requireOrganizationAccess(website.organization.slug, "websites.publish");
  await getDb().websitePage.updateMany({ where: { websiteId: id }, data: { status: "PUBLISHED" } });
  return Response.json({ website: await getDb().website.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } }) });
}
