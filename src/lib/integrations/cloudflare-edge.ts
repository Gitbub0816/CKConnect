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
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/site:${encodeURIComponent(manifest.hostname)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(manifest),
  });
  if (!response.ok) throw new Error(`Cloudflare KV publication failed: ${response.status}`);
  return { mirrored: true };
}
