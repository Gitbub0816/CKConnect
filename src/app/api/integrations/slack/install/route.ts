import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { createOAuthState } from "@/lib/oauth-state";
import { SLACK_SCOPES, slackEnv } from "@/lib/integrations/slack";

export async function GET(request: Request) {
  const organizationSlug = z
    .string()
    .min(1)
    .parse(new URL(request.url).searchParams.get("organizationSlug"));
  const { organization } = await requireOrganizationAccess(
    organizationSlug,
    "integrations.manage",
  );
  const { clientId, redirectUri } = slackEnv();
  if (!clientId || !redirectUri) {
    return Response.json({ error: "Slack OAuth is not configured" }, { status: 503 });
  }
  const state = await createOAuthState(organization.id, "SLACK");
  const authorization = new URL("https://slack.com/oauth/v2/authorize");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("scope", SLACK_SCOPES);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("state", state);
  return Response.redirect(authorization);
}
