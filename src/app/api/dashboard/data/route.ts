import { requireOrganizationAccess } from "@/lib/authorization";
import { getWorkspaceDashboard } from "@/lib/workspace-data";

export async function GET(request: Request) {
  const organizationSlug =
    new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization, user } = await requireOrganizationAccess(
    organizationSlug,
    "reports.read",
  );
  const dashboard = await getWorkspaceDashboard(organization.slug, user?.id);
  if (!dashboard) {
    return Response.json({ error: "Dashboard not found" }, { status: 404 });
  }
  return Response.json(
    {
      organization: {
        id: organization.publicId,
        name: organization.name,
        slug: organization.slug,
      },
      charts: {
        command: [
          { name: "Cash position", value: dashboard.stats.cash },
          { name: "Open pipeline", value: dashboard.stats.pipeline },
          { name: "Outstanding", value: dashboard.stats.outstanding },
          { name: "Collected", value: dashboard.stats.collected },
        ],
        pipeline: dashboard.openDeals.map((deal) => ({
          name: deal.name,
          stage: deal.stage,
          value: deal.amount,
          probability: deal.probability,
        })),
        exceptions: dashboard.attention.map((item) => ({
          name: item.label,
          module: item.module,
          severity: item.severity,
          value: item.count,
        })),
      },
      dashboards: dashboard.dashboards,
    },
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
  );
}
