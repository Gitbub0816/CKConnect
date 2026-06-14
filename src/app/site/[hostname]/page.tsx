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
  const srcDoc =
    code && (code.html || code.css || code.javascript)
      ? `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>html,body{margin:0;min-height:100%;font-family:system-ui}${code.css ?? ""}</style></head><body>${code.html ?? ""}<script>${code.javascript ?? ""}<\/script></body></html>`
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
