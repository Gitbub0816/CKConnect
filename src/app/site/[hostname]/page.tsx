import { notFound } from "next/navigation";
import { PortalRenderer } from "@/components/portal-renderer";
import { getDb } from "@/lib/db";

export default async function HostedWebsitePage({ params }: { params: Promise<{ hostname: string }> }) {
  const { hostname: encodedHostname } = await params;
  const hostname = decodeURIComponent(encodedHostname).toLowerCase();
  let website = await getDb().website.findUnique({
    where: { defaultHostname: hostname },
    include: { organization: { include: { theme: true } }, pages: { where: { path: "/", status: "PUBLISHED" }, take: 1 } },
  });
  if (!website) {
    const domain = await getDb().organizationDomain.findFirst({ where: { hostname, status: "VERIFIED" } });
    if (domain) {
      website = await getDb().website.findFirst({
        where: { organizationId: domain.organizationId, status: "PUBLISHED" },
        include: { organization: { include: { theme: true } }, pages: { where: { path: "/", status: "PUBLISHED" }, take: 1 } },
      });
    }
  }
  const page = website?.pages[0];
  if (!website || !page || website.status !== "PUBLISHED") notFound();
  const content = page.contentJson as { navigation?: Array<{ label: string; href: string }>; blocks?: never[] };
  return <PortalRenderer organization={website.organization} navigation={content.navigation ?? []} blocks={content.blocks ?? []}/>;
}
