import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

export function normalizeOrgCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function resolveTenantByCode(code: string) {
  const normalized = normalizeOrgCode(code);
  if (!normalized) return null;
  return getDb().organization.findFirst({
    where: { orgCode: normalized, status: "ACTIVE", deletedAt: null },
    select: { clerkOrganizationId: true, slug: true, orgCode: true, name: true, theme: { select: { logoUrl: true, primaryColor: true } } },
  });
}

export async function resolveTenantBySlug(slug: string) {
  return getDb().organization.findFirst({
    where: { slug: slug.toLowerCase(), status: "ACTIVE", deletedAt: null },
    select: { id: true, clerkOrganizationId: true, slug: true, orgCode: true, name: true, theme: { select: { logoUrl: true, primaryColor: true } } },
  });
}

export async function verifyTenantAccess(slug: string) {
  const session = await auth();
  if (!session.userId) return { ok: false as const, reason: "SIGNED_OUT" as const };
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return { ok: false as const, reason: "TENANT_NOT_FOUND" as const };
  const user = await getDb().user.findUnique({ where: { clerkUserId: session.userId } });
  if (!user) return { ok: false as const, reason: "MEMBERSHIP_REQUIRED" as const };
  const membership = await getDb().organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: tenant.id, userId: user.id } },
  });
  if (!membership && !user.platformAdmin) return { ok: false as const, reason: "MEMBERSHIP_REQUIRED" as const };
  return { ok: true as const, tenant, user, membership };
}

export async function generateUniqueOrgCode(name: string) {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const compact = words.join("");
  const initials = words.map((word) => word[0]).join("");
  const base = normalizeOrgCode(compact.length <= 10 ? compact : `${initials}${words.at(-1) ?? ""}`).slice(0, 10).padEnd(4, "X");
  for (let suffix = 0; suffix < 1000; suffix++) {
    const candidate = suffix === 0 ? base : `${base.slice(0, Math.max(4, 10 - String(suffix).length))}${suffix}`;
    if (!await getDb().organization.findUnique({ where: { orgCode: candidate }, select: { id: true } })) return candidate;
  }
  throw new Error("Unable to generate a unique organization code");
}
