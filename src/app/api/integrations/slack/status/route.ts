import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { getIntegrationConfigStatus } from "@/lib/integrations/config";

export async function GET(request: Request) {
  const organizationSlug = z
    .string()
    .min(1)
    .parse(new URL(request.url).searchParams.get("organizationSlug"));
  const { organization } = await requireOrganizationAccess(
    organizationSlug,
    "integrations.manage",
  );
  const integration = await getDb().integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: organization.id,
        provider: "SLACK",
      },
    },
  });
  return Response.json({
    configured: getIntegrationConfigStatus().slack,
    connected: integration?.status === "ACTIVE",
    status: integration?.status ?? "DISCONNECTED",
    lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
    lastError: integration?.lastError ?? null,
    settings: integration?.settings ?? {},
  });
}
