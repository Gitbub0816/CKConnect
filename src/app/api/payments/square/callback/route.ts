import { encryptSecret } from "@/lib/encryption";
import { getDb } from "@/lib/db";
import { consumeOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_APPLICATION_SECRET || !process.env.SQUARE_REDIRECT_URI) return Response.json({ error: "Square callback is incomplete" }, { status: 400 });
  const organizationId = await consumeOAuthState(state, "SQUARE");
  const endpoint = process.env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com/oauth2/token" : "https://connect.squareupsandbox.com/oauth2/token";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SQUARE_APPLICATION_ID, client_secret: process.env.SQUARE_APPLICATION_SECRET, code, grant_type: "authorization_code", redirect_uri: process.env.SQUARE_REDIRECT_URI }),
  });
  const token = await response.json() as { access_token?: string; refresh_token?: string; merchant_id?: string; expires_at?: string; message?: string };
  if (!response.ok || !token.access_token || !token.merchant_id) return Response.json({ error: token.message ?? "Square token exchange failed" }, { status: 502 });
  const organization = await getDb().organization.findUniqueOrThrow({ where: { id: organizationId } });
  await getDb().paymentProviderConnection.upsert({
    where: { organizationId_provider: { organizationId, provider: "SQUARE" } },
    update: { status: "ACTIVE", merchantId: token.merchant_id, encryptedAccessToken: encryptSecret(token.access_token), encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null, tokenExpiresAt: token.expires_at ? new Date(token.expires_at) : null },
    create: { organizationId, provider: "SQUARE", status: "ACTIVE", merchantId: token.merchant_id, encryptedAccessToken: encryptSecret(token.access_token), encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null, tokenExpiresAt: token.expires_at ? new Date(token.expires_at) : null },
  });
  return Response.redirect(new URL(`/app/${organization.slug}/payment-settings?square=connected`, request.url));
}
