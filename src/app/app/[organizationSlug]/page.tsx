import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SdkEmbed } from "@/components/sdk-embed";
import { requireOrganizationAccess } from "@/lib/authorization";

const KPI_API_URL = process.env.NEXT_PUBLIC_KPI_API_URL ?? "https://kpi-api.clearkey.solutions";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const { user } = await requireOrganizationAccess(organizationSlug);
  if (!user) notFound();
  return (
    <AppShell active="dashboard" organizationSlug={organizationSlug}>
      <div className="flex h-full flex-1 overflow-hidden">
        <SdkEmbed
          apiUrl={KPI_API_URL}
          organizationSlug={organizationSlug}
          title="KPI Dashboard"
        />
      </div>
    </AppShell>
  );
}
