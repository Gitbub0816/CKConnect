import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

export async function requireOrganizationAccess(slug: string, permission?: string) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("Authentication is not configured");
    const organization = await getDb().organization.findUnique({ where: { slug } });
    if (!organization) throw new Error("Organization not found");
    return { organization, user: null, membership: null };
  }

  const session = await auth();
  if (!session.userId) throw new Error("Authentication required");
  const db = getDb();
  let user = await db.user.findUnique({ where: { clerkUserId: session.userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!email) throw new Error("A verified email address is required");
    user = await db.user.upsert({
      where: { email },
      update: { clerkUserId: session.userId, firstName: clerkUser.firstName, lastName: clerkUser.lastName },
      create: { clerkUserId: session.userId, email, firstName: clerkUser.firstName, lastName: clerkUser.lastName },
    });
  }
  const organization = await db.organization.findUnique({ where: { slug } });
  if (!organization) throw new Error("Organization not found");
  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
  });
  if (!membership && !user.platformAdmin) throw new Error("Organization access denied");
  if (organization.operationalStatus !== "ACTIVE" && !user.platformAdmin) throw new Error(`Organization access is ${organization.operationalStatus.toLowerCase().replaceAll("_", " ")}`);
  if (permission && membership && !["OWNER", "ADMIN"].includes(membership.role) && !membership.permissions.includes("*") && !membership.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
  return { organization, user, membership };
}
