import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)", "/internal-admin(.*)", "/api/v1(.*)", "/api/admin(.*)"]);

function endpointRewrite(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (!hostname) return;
  const url = request.nextUrl.clone();
  if (hostname === "cksites.dev") return NextResponse.redirect(new URL("https://www.cksites.dev", request.url), 308);
  if (hostname === "admin.connect.clearkey.solutions") {
    if (!request.nextUrl.pathname.startsWith("/internal-admin")) {
      url.pathname = request.nextUrl.pathname === "/" ? "/internal-admin" : `/internal-admin${request.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
    }
    return;
  }
  if (request.nextUrl.pathname !== "/") return;
  const portalSuffix = ".connect.clearkey.solutions";
  if (hostname.endsWith(portalSuffix) && hostname !== "connect.clearkey.solutions") {
    const slug = hostname.slice(0, -portalSuffix.length);
    if (slug && !slug.includes(".")) {
      url.pathname = `/p/${slug}`;
      return NextResponse.rewrite(url);
    }
  }
  const websiteSuffix = ".cksites.dev";
  if (hostname.endsWith(websiteSuffix) && hostname !== "cksites.dev" && hostname !== "www.cksites.dev") {
    url.pathname = `/site/${encodeURIComponent(hostname)}`;
    return NextResponse.rewrite(url);
  }
  const applicationHosts = new Set(["localhost", "127.0.0.1", "connect.clearkey.solutions", "console.clearkey.solutions", "admin.connect.clearkey.solutions", "clearkey.solutions", "www.clearkey.solutions", "www.cksites.dev", "cksites.dev"]);
  if (!applicationHosts.has(hostname) && !hostname.endsWith(".vercel.app")) {
    url.pathname = `/site/${encodeURIComponent(hostname)}`;
    return NextResponse.rewrite(url);
  }
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  const rewrite = endpointRewrite(request);
  if (rewrite) return rewrite;
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest) {
  if (request.headers.has("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 400 });
  }
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return endpointRewrite(request) ?? NextResponse.next();
  }
  return clerkProxy(request, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
