import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";

export async function GET(request: Request) {
  const organizationSlug = z.string().min(1).parse(new URL(request.url).searchParams.get("organizationSlug"));
  await requireOrganizationAccess(organizationSlug, "email.write");
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;
  if (!clientId || !redirectUri) return Response.json({ error: "Zoho OAuth is not configured" }, { status: 503 });
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("zoho_oauth_state", `${state}:${organizationSlug}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  const authorization = new URL("https://accounts.zoho.com/oauth/v2/auth");
  authorization.searchParams.set("scope", "ZohoMail.organization.accounts.ALL,ZohoMail.organization.alias.ALL");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("state", state);
  return Response.redirect(authorization);
}
