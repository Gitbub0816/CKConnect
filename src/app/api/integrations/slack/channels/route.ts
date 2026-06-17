import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { decryptSlackCredentials, slackApi } from "@/lib/integrations/slack";

type SlackChannels = {
  channels?: Array<{ id: string; name: string; is_archived?: boolean; is_private?: boolean }>;
};

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
  if (!integration?.encryptedCredentials || integration.status !== "ACTIVE") {
    return Response.json({ error: "Slack is not connected" }, { status: 409 });
  }
  const credentials = decryptSlackCredentials(integration.encryptedCredentials);
  const result = await slackApi<SlackChannels>(credentials.botToken, "conversations.list", {
    exclude_archived: true,
    limit: 200,
    types: "public_channel,private_channel",
  });
  return Response.json({
    channels: (result.channels ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      private: Boolean(channel.is_private),
    })),
  });
}
