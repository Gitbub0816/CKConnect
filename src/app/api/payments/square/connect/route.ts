import { requireOrganizationAccess } from "@/lib/authorization";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const organizationSlug = new URL(request.url).searchParams.get("organizationSlug");
  if (!organizationSlug) return Response.json({ error: "Organization is required" }, { status: 400 });
  const { organization } = await requireOrganizationAccess(organizationSlug, "payments.write");
  if (!process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_REDIRECT_URI) return Response.json({ error: "Square is not configured" }, { status: 503 });
  const state = await createOAuthState(organization.id, "SQUARE");
  const url = new URL(process.env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com/oauth2/authorize" : "https://connect.squareupsandbox.com/oauth2/authorize");
  url.searchParams.set("client_id", process.env.SQUARE_APPLICATION_ID);
  url.searchParams.set("scope", "MERCHANT_PROFILE_READ PAYMENTS_WRITE PAYMENTS_READ ORDERS_WRITE ORDERS_READ");
  url.searchParams.set("session", "false");
  url.searchParams.set("state", state);
  return Response.redirect(url);
}
