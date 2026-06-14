import { resolveTenantByCode } from "@/lib/tenant";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const tenant = await resolveTenantByCode(code);
  if (!tenant) return Response.json({ ok: false, error: "Unknown company code." }, { status: 404 });
  return Response.json({ ok: true, tenant: { clerkOrgId: tenant.clerkOrganizationId, slug: tenant.slug, orgCode: tenant.orgCode, displayName: tenant.name } });
}
