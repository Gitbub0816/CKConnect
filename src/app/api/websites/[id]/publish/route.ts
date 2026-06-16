import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { publishWebsite } from "@/lib/website-publishing";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const website = await db.website.findUnique({ where: { id }, include: { organization: true } });
  if (!website) return Response.json({ error: "Website not found" }, { status: 404 });
  const { user } = await requireOrganizationAccess(website.organization.slug, "websites.publish");
  if (!user) return Response.json({ error: "A signed-in user is required" }, { status: 401 });
  try {
    const result = await publishWebsite({
      actorUserId: user.id,
      db,
      organizationId: website.organizationId,
      organizationSlug: website.organization.slug,
      request: {
        method: request.method,
        path: new URL(request.url).pathname,
        requestId: request.headers.get("x-vercel-id") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
      websiteId: id,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Website publication failed" },
      { status: 400 },
    );
  }
}
