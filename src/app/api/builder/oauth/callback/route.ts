import { type NextRequest, NextResponse } from "next/server";

const BUILDER_API_URL =
  process.env.NEXT_PUBLIC_BUILDER_API_URL ?? "https://builder-api.cksites.dev";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  const clientId = process.env.BUILDER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.BUILDER_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.BUILDER_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Builder OAuth is not configured" }, { status: 500 });
  }

  try {
    const tokenRes = await fetch(`${BUILDER_API_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, clientId, clientSecret, redirectUri }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
    }

    const token = await tokenRes.json() as { redirectTo?: string };

    // Redirect back to the builder or workspace with success
    const destination = token.redirectTo ?? "/app";
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return NextResponse.json({ error: "OAuth callback error" }, { status: 500 });
  }
}
