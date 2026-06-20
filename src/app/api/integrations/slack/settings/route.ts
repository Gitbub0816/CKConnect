import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

const schema = z.object({
  organizationSlug: z.string().min(1),
  defaultChannelId: z.string().max(80).optional().default(""),
  defaultChannelName: z.string().max(120).optional().default(""),
  navigationMode: z.enum(["alongside", "replace"]).default("alongside"),
  notifications: z.record(z.string(), z.boolean()).default({}),
});

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const { organization } = await requireOrganizationAccess(
    input.organizationSlug,
    "integrations.manage",
  );
  const db = getDb();
  const integration = await db.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: organization.id,
        provider: "SLACK",
      },
    },
  });
  if (!integration || integration.status !== "ACTIVE") {
    return Response.json({ error: "Slack is not connected" }, { status: 409 });
  }
  const currentSettings =
    integration.settings && typeof integration.settings === "object"
      ? (integration.settings as Record<string, unknown>)
      : {};
  const settings = {
    ...currentSettings,
    defaultChannelId: input.defaultChannelId || null,
    defaultChannelName: input.defaultChannelName || null,
    navigationMode: input.navigationMode,
    notifications: input.notifications,
  };
  await db.integration.update({
    where: { id: integration.id },
    data: { settings },
  });
  return Response.json({ ok: true, settings });
}
