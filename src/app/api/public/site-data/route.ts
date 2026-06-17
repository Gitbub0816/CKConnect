import { getDb } from "@/lib/db";

const blockScopes: Record<string, string[]> = {
  business: ["business_profile.read"],
  inventory: ["inventory.read", "pricing.read"],
  locations: ["locations.read"],
  services: ["services.read", "pricing.read"],
};

async function resolveWebsite(hostname: string) {
  const db = getDb();
  const normalized = hostname.toLowerCase();
  const direct = await db.website.findUnique({
    where: { defaultHostname: normalized },
    include: { organization: { include: { theme: true } } },
  });
  if (direct) return direct;
  const domain = await db.organizationDomain.findFirst({
    where: { hostname: normalized, status: "VERIFIED" },
  });
  if (!domain) return null;
  return db.website.findFirst({
    where: { organizationId: domain.organizationId, status: "PUBLISHED" },
    include: { organization: { include: { theme: true } } },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hostname = url.searchParams.get("hostname") ?? "";
  const block = url.searchParams.get("block") ?? "business";
  const requiredScopes = blockScopes[block];
  if (!hostname || !requiredScopes) {
    return Response.json({ error: "Unsupported site data request" }, { status: 400 });
  }
  const db = getDb();
  const website = await resolveWebsite(hostname);
  if (!website || website.status !== "PUBLISHED") {
    return Response.json({ error: "Site not found" }, { status: 404 });
  }
  const grants = await db.dataLink.findMany({
    where: {
      active: true,
      organizationId: website.organizationId,
      relationship: "approved_scope",
      sourceId: website.id,
      sourceType: "Website",
      targetId: { in: requiredScopes },
      targetType: "WebsiteDataScope",
    },
  });
  const granted = new Set(grants.flatMap((grant) => grant.permissions));
  const missing = requiredScopes.filter((scope) => !granted.has(scope));
  if (missing.length) {
    return Response.json(
      {
        block,
        error: "Missing approved website data scope",
        missingScopes: missing,
      },
      { status: 403 },
    );
  }
  await Promise.all(
    grants.map((grant) =>
      db.dataLink.update({
        where: { id: grant.id },
        data: {
          metadataJson: {
            ...(grant.metadataJson as Record<string, unknown>),
            lastUsedAt: new Date().toISOString(),
          },
        },
      }),
    ),
  );
  if (block === "services" || block === "inventory") {
    const products = await db.product.findMany({
      where: {
        active: true,
        organizationId: website.organizationId,
        type: block === "services" ? "SERVICE" : { not: "SERVICE" },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        description: true,
        name: true,
        price: true,
        quantityOnHand: true,
        sku: true,
        type: true,
      },
      take: 24,
    });
    return Response.json({
      block,
      records: products.map((product) => ({
        description: product.description,
        name: product.name,
        price: product.price.toString(),
        quantityOnHand: product.quantityOnHand.toString(),
        sku: product.sku,
        type: product.type,
      })),
    });
  }
  return Response.json({
    block,
    profile: {
      name: website.organization.name,
      portalTitle:
        website.organization.theme?.portalHeadline ?? website.organization.name,
      website: website.defaultHostname,
    },
  });
}
