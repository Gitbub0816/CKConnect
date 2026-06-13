import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  return <AppShell active="dashboard" organizationSlug={organizationSlug}><Dashboard /></AppShell>;
}
