const siteRouter = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/media/")) {
      const object = await env.SITE_MEDIA.get(url.pathname.slice("/media/".length));
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }

    const cache = caches.default;
    const cacheKey = new Request(`https://site-config.internal/${url.hostname}`);
    let manifestResponse = await cache.match(cacheKey);
    if (!manifestResponse) {
      const manifest = await env.SITE_CONFIG.get(`site:${url.hostname}`, "json");
      if (!manifest) return new Response("Unknown ClearKey site", { status: 404 });
      manifestResponse = Response.json(manifest, { headers: { "cache-control": "public, max-age=60" } });
      ctx.waitUntil(cache.put(cacheKey, manifestResponse.clone()));
    }

    const origin = new URL(env.ORIGIN_URL);
    origin.pathname = `/site/${encodeURIComponent(url.hostname)}`;
    origin.search = url.search;
    const headers = new Headers(request.headers);
    headers.set("x-clearkey-site-host", url.hostname);
    return fetch(new Request(origin, { method: request.method, headers, body: request.body, redirect: "manual" }));
  },
};

export default siteRouter;
