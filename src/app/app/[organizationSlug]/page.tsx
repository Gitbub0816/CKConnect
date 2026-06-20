import { AppShell } from "@/components/app-shell";
import { SdkViewport } from "@/components/sdk-viewport";
import { requireOrganizationAccess } from "@/lib/authorization";
import { createSdkEmbedConfig } from "@/lib/sdk-embed";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const { membership, organization, user } = await requireOrganizationAccess(organizationSlug);
  const config = createSdkEmbedConfig({
    kind: "dashboard",
    membership,
    organization,
    user,
  });
  return (
    <AppShell active="dashboard" fullViewport organizationSlug={organizationSlug}>
      <SdkViewport config={config} />
    </AppShell>
  );
}
