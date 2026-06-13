import { notFound } from "next/navigation";
import { PortalRenderer } from "@/components/portal-renderer";
import { getPublishedEndpoint } from "@/lib/workspace-data";

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
    />
  );
}
