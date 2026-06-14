import { resolveTenantBySlug } from "@/lib/tenant";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return Response.json({ ok: false, error: "This organization is not active." }, { status: 404 });
  return Response.json({ ok: true, tenant: { clerkOrgId: tenant.clerkOrganizationId, slug: tenant.slug, orgCode: tenant.orgCode, displayName: tenant.name } });
}
