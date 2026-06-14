import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/encryption";
import { appUrl } from "@/lib/integrations/stripe-workflows";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stored = cookieStore.get("zoho_oauth_state")?.value;
  cookieStore.delete("zoho_oauth_state");
  if (!code || !state || !stored?.startsWith(`${state}:`)) return Response.json({ error: "Invalid OAuth callback" }, { status: 400 });
  const organizationSlug = stored.slice(state.length + 1);
  const organization = await getDb().organization.findUnique({ where: { slug: organizationSlug } });
  if (!organization) return Response.json({ error: "Organization not found" }, { status: 404 });
  const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ZOHO_CLIENT_ID ?? "",
      client_secret: process.env.ZOHO_CLIENT_SECRET ?? "",
      redirect_uri: process.env.ZOHO_REDIRECT_URI ?? "",
      code,
    }),
  });
  const token = await tokenResponse.json() as { refresh_token?: string; error?: string };
  if (!tokenResponse.ok || !token.refresh_token) return Response.json({ error: token.error ?? "Zoho token exchange failed" }, { status: 502 });
  await getDb().integration.upsert({
    where: { organizationId_provider: { organizationId: organization.id, provider: "ZOHO_MAIL" } },
    create: { organizationId: organization.id, provider: "ZOHO_MAIL", status: "ACTIVE", encryptedCredentials: encryptSecret(JSON.stringify({ refreshToken: token.refresh_token })), settings: { tokenEndpoint: "https://accounts.zoho.com/oauth/v2/token" } },
    update: { status: "ACTIVE", encryptedCredentials: encryptSecret(JSON.stringify({ refreshToken: token.refresh_token })), lastError: null },
  });
  return Response.redirect(appUrl(`/app/${organization.slug}/email?zoho=connected`));
}
