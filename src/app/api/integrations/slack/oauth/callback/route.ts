import { getDb } from "@/lib/db";
import { consumeOAuthState } from "@/lib/oauth-state";
import {
  encryptSlackCredentials,
  type SlackInstallSettings,
  slackEnv,
} from "@/lib/integrations/slack";

type SlackOAuthResponse = {
  ok?: boolean;
  error?: string;
  access_token?: string;
  app_id?: string;
  bot_user_id?: string;
  team?: { id?: string; name?: string };
  incoming_webhook?: { channel_id?: string; channel?: string; url?: string };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { clientId, clientSecret, redirectUri } = slackEnv();
  if (!code || !state || !clientId || !clientSecret || !redirectUri) {
    return Response.json({ error: "Slack OAuth callback is incomplete" }, { status: 400 });
  }
  const organizationId = await consumeOAuthState(state, "SLACK");
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const token = (await response.json()) as SlackOAuthResponse;
  if (!response.ok || !token.ok || !token.access_token || !token.team?.id) {
    return Response.json({ error: token.error ?? "Slack token exchange failed" }, { status: 502 });
  }
  const db = getDb();
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const settings: SlackInstallSettings = {
    teamId: token.team.id,
    teamName: token.team.name,
    appId: token.app_id,
    botUserId: token.bot_user_id,
    defaultChannelId: token.incoming_webhook?.channel_id,
    defaultChannelName: token.incoming_webhook?.channel,
    notifications: {
      newLead: true,
      newBooking: true,
      invoicePaid: true,
      invoiceOverdue: true,
      customerMessage: true,
      lowInventory: true,
      kiraAutomation: true,
    },
  };
  await db.integration.upsert({
    where: { organizationId_provider: { organizationId, provider: "SLACK" } },
    create: {
      organizationId,
      provider: "SLACK",
      status: "ACTIVE",
      syncDirection: "BIDIRECTIONAL",
      encryptedCredentials: encryptSlackCredentials({
        botToken: token.access_token,
        incomingWebhookUrl: token.incoming_webhook?.url,
      }),
      settings,
      lastSyncAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      syncDirection: "BIDIRECTIONAL",
      encryptedCredentials: encryptSlackCredentials({
        botToken: token.access_token,
        incomingWebhookUrl: token.incoming_webhook?.url,
      }),
      settings,
      lastError: null,
      lastSyncAt: new Date(),
    },
  });
  return Response.redirect(new URL(`/app/${organization.slug}/integrations?tab=connections&slack=connected`, request.url));
}
