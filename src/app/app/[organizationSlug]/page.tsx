import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getWorkspaceDashboard } from "@/lib/workspace-data";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const { user } = await requireOrganizationAccess(organizationSlug);
  const data = await getWorkspaceDashboard(organizationSlug, user?.id);
  if (!data) return null;
  return (
    <AppShell active="dashboard" organizationSlug={organizationSlug}>
      <Dashboard data={data} />
    </AppShell>
  );
}
