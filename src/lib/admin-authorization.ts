import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],
  platform_admin: ["tenants.manage", "platform.read", "support.manage"],
  support_admin: ["tenants.read", "platform.read", "support.manage"],
  billing_admin: ["tenants.read", "billing.manage", "platform.read"],
  security_admin: ["tenants.read", "security.manage", "audit.read", "platform.read"],
  developer_admin: ["tenants.read", "integrations.manage", "platform.read", "audit.read"],
  read_only_admin: ["tenants.read", "platform.read", "audit.read"],
};

export async function requirePlatformAdmin(permission = "platform.read") {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("Admin authentication is not configured");
    const user = await getDb().user.findFirst({ where: { platformAdmin: true } });
    if (!user) throw new Error("No development administrator is configured");
    return user;
  }
  const session = await auth();
  if (!session.userId) throw new Error("Administrator authentication required");
  let user = await getDb().user.findUnique({ where: { clerkUserId: session.userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!email) throw new Error("A verified administrator email is required");
    user = await getDb().user.upsert({
      where: { email },
      update: { clerkUserId: session.userId, firstName: clerkUser.firstName, lastName: clerkUser.lastName },
      create: { clerkUserId: session.userId, email, firstName: clerkUser.firstName, lastName: clerkUser.lastName },
    });
  }
  if (!user.platformAdmin || !user.adminRole) throw new Error("ClearKey administrator access required");
  const allowed = rolePermissions[user.adminRole] ?? [];
  if (!allowed.includes("*") && !allowed.includes(permission)) throw new Error(`Missing administrator permission: ${permission}`);
  return user;
}
