import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { decryptSlackCredentials, slackApi } from "@/lib/integrations/slack";

const schema = z.object({
  organizationSlug: z.string().min(1),
  channelId: z.string().min(1),
  message: z.string().trim().min(1).max(1000).default("ClearKey Connect Slack test message."),
});

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const { organization } = await requireOrganizationAccess(
    input.organizationSlug,
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
  if (!integration?.encryptedCredentials || integration.status !== "ACTIVE") {
    return Response.json({ error: "Slack is not connected" }, { status: 409 });
  }
  const credentials = decryptSlackCredentials(integration.encryptedCredentials);
  await slackApi(credentials.botToken, "chat.postMessage", {
    channel: input.channelId,
    text: input.message,
  });
  return Response.json({ ok: true });
}
