import { requireOrganizationAccess } from "@/lib/authorization";
import { getWorkspaceDashboard } from "@/lib/workspace-data";
import { renderDashboardReportPdf } from "@/lib/reports/pdf";

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

  const body = await renderDashboardReportPdf({
    organizationName: organization.name,
    title: "Command center report",
    metrics: [
      { label: "Cash position", value: dashboard.stats.cash },
      { label: "Open pipeline", value: dashboard.stats.pipeline },
      { label: "Outstanding", value: dashboard.stats.outstanding },
      { label: "Collected", value: dashboard.stats.collected },
    ],
    rows: [
      ...dashboard.openDeals.map((deal) => ({
        Type: "Deal",
        Name: deal.name,
        Account: deal.account,
        Status: deal.stage,
        Value: deal.amount,
      })),
      ...dashboard.invoices.map((invoice) => ({
        Type: "Invoice",
        Name: invoice.number,
        Account: invoice.customer,
        Status: invoice.status,
        Value: invoice.balance,
      })),
    ],
  });

  return new Response(Buffer.from(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${organization.slug}-command-report.pdf"`,
      "content-type": "application/pdf",
    },
  });
}
