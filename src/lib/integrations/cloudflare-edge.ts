import "server-only";

type SiteManifest = {
  organizationId: string;
  websiteId: string;
  hostname: string;
  publishedAt: string;
};

export async function publishSiteManifest(manifest: SiteManifest) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.CLOUDFLARE_SITE_CONFIG_KV_NAMESPACE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !namespaceId || !token) return { mirrored: false, reason: "Cloudflare KV is not configured" };
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/site:${encodeURIComponent(manifest.hostname)}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(manifest),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn("Cloudflare KV publication failed", {
        hostname: manifest.hostname,
        status: response.status,
      });
      return {
        mirrored: false,
        reason: `Cloudflare KV publication failed: ${response.status}`,
      };
    }
    return { mirrored: true };
  } catch (error) {
    console.warn("Cloudflare KV publication failed", {
      hostname: manifest.hostname,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return {
      mirrored: false,
      reason:
        error instanceof Error
          ? error.message
          : "Cloudflare KV publication failed",
    };
  }
}
