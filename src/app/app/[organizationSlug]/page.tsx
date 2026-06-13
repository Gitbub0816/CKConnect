import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { getWorkspaceDashboard } from "@/lib/workspace-data";
import { notFound } from "next/navigation";
import { requireOrganizationAccess } from "@/lib/authorization";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  await requireOrganizationAccess(organizationSlug);
  const data = await getWorkspaceDashboard(organizationSlug);
  if (!data) notFound();
  return <AppShell active="dashboard" organizationSlug={organizationSlug}><Dashboard data={data} /></AppShell>;
}
