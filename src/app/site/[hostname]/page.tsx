import { notFound } from "next/navigation";
import { PortalRenderer } from "@/components/portal-renderer";
import { getDb } from "@/lib/db";

export default async function HostedWebsitePage({
  params,
}: {
  params: Promise<{ hostname: string }>;
}) {
  const { hostname: encodedHostname } = await params;
  const hostname = decodeURIComponent(encodedHostname).toLowerCase();
  let website = await getDb().website.findUnique({
    where: { defaultHostname: hostname },
    include: {
      organization: { include: { theme: true } },
      pages: { where: { path: "/", status: "PUBLISHED" }, take: 1 },
    },
  });
  if (!website) {
    const domain = await getDb().organizationDomain.findFirst({
      where: { hostname, status: "VERIFIED" },
    });
    if (domain) {
      website = await getDb().website.findFirst({
        where: { organizationId: domain.organizationId, status: "PUBLISHED" },
        include: {
          organization: { include: { theme: true } },
          pages: { where: { path: "/", status: "PUBLISHED" }, take: 1 },
        },
      });
    }
  }
  const page = website?.pages[0];
  if (!website || !page || website.status !== "PUBLISHED") notFound();
  const content = page.contentJson as {
    navigation?: Array<{ label: string; href: string }>;
    blocks?: never[];
    code?: { html?: string; css?: string; javascript?: string };
  };
  const code = content.code;
  const dynamicRuntime = `
    (() => {
      const blockMap = {
        "ck-business-hours": "business",
        "ck-inventory": "inventory",
        "ck-location": "locations",
        "ck-services": "services"
      };
      document.querySelectorAll("[data-ck-block]").forEach(async (node) => {
        const block = node.getAttribute("data-ck-block");
        const query = blockMap[block];
        if (!query) return;
        try {
          const response = await fetch("/api/public/site-data?hostname=${hostname}&block=" + encodeURIComponent(query));
          const payload = await response.json();
          if (!response.ok) {
            node.querySelector("[data-ck-preview]")?.replaceChildren(document.createTextNode(payload.error || "This block needs authorization."));
            return;
          }
          if (Array.isArray(payload.records)) {
            const list = document.createElement("div");
            list.className = "ck-live-records";
            payload.records.forEach((record) => {
              const item = document.createElement("article");
              item.innerHTML = "<h3></h3><p></p><strong></strong>";
              item.querySelector("h3").textContent = record.name || "Item";
              item.querySelector("p").textContent = record.description || "";
              item.querySelector("strong").textContent = record.price ? "$" + record.price : "";
              list.appendChild(item);
            });
            node.querySelector("[data-ck-preview]")?.replaceWith(list);
          } else if (payload.profile) {
            node.querySelector("[data-ck-preview]")?.replaceChildren(document.createTextNode(payload.profile.name || ""));
          }
        } catch {
          node.querySelector("[data-ck-preview]")?.replaceChildren(document.createTextNode("Live data is temporarily unavailable."));
        }
      });
    })();
  `;
  const srcDoc =
    code && (code.html || code.css || code.javascript)
      ? `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>html,body{margin:0;min-height:100%;font-family:system-ui}.ck-live-records{display:grid;gap:16px}.ck-live-records article{border:1px solid #e5e7eb;padding:16px}${code.css ?? ""}</style></head><body>${code.html ?? ""}<script>${dynamicRuntime}${code.javascript ?? ""}<\/script></body></html>`
      : null;
  return (
    <>
      <PortalRenderer
        organization={website.organization}
        navigation={content.navigation ?? []}
        blocks={content.blocks ?? []}
      />
      {srcDoc && (
        <iframe
          className="min-h-screen w-full border-0"
          sandbox="allow-forms allow-scripts"
          srcDoc={srcDoc}
          title={`${website.slug} custom website canvas`}
        />
      )}
    </>
  );
}
