import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PortalRenderer } from "@/components/portal-renderer";
import { getPublishedEndpoint } from "@/lib/workspace-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  const organization = await getPublishedEndpoint(organizationSlug);
  if (!organization) return {};
  return {
    title: organization.theme?.portalHeadline
      ? `${organization.theme.portalHeadline} | ${organization.name}`
      : `${organization.name} | Client Services`,
    description: organization.theme?.portalSubhead ?? undefined,
    icons: organization.theme?.faviconUrl
      ? { icon: organization.theme.faviconUrl }
      : undefined,
  };
}

export default async function PublicClientEndpoint({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const organization = await getPublishedEndpoint(organizationSlug);
  const page = organization?.endpointPages[0];
  if (!organization || !page) notFound();

  return (
    <PortalRenderer
      blocks={page.blocksJson as never[]}
      navigation={page.navigationJson as never[]}
      organization={organization}
      settings={page.settingsJson as never}
    />
  );
}
