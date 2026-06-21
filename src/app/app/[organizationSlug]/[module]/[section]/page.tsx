import { notFound } from "next/navigation";
import { getAccountingSection } from "@/components/accounting-suite";
import { AppShell } from "@/components/app-shell";
import { getCrmSection } from "@/components/crm-suite";
import { NativeBusinessWorkspace } from "@/components/native-workspaces";
import { RecordDetailView } from "@/components/record-detail-view";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getModuleData, getRecordDetail } from "@/lib/workspace-data";

const recordDetailModules = new Set([
  "contacts",
  "leads",
  "deals",
  "accounts",
  "invoices",
]);

export default async function WorkspaceModuleSectionPage({
  params,
}: {
  params: Promise<{
    organizationSlug: string;
    module: string;
    section: string;
  }>;
}) {
  const { organizationSlug, module, section } = await params;

  if (recordDetailModules.has(module)) {
    const permissionMap: Record<string, string> = {
      contacts: "accounts.read",
      leads: "accounts.read",
      deals: "accounts.read",
      accounts: "accounts.read",
      invoices: "invoices.read",
    };
    await requireOrganizationAccess(
      organizationSlug,
      permissionMap[module] ?? `${module}.read`,
    );
    const record = await getRecordDetail(organizationSlug, module, section);
    if (!record) notFound();
    const backLabel =
      module === "contacts"
        ? "Contacts"
        : module === "leads"
          ? "Leads"
          : module === "deals"
            ? "Deals"
            : module === "accounts"
              ? "Accounts"
              : "Invoices";
    return (
      <AppShell active={module} organizationSlug={organizationSlug}>
        <RecordDetailView
          backHref={`/app/${organizationSlug}/${module}`}
          backLabel={backLabel}
          organizationSlug={organizationSlug}
          record={record as Parameters<typeof RecordDetailView>[0]["record"]}
        />
      </AppShell>
    );
  }

  if (!["accounting", "crm"].includes(module)) notFound();
  const suiteSection =
    module === "accounting"
      ? getAccountingSection(section)
      : getCrmSection(section);
  if (suiteSection.slug !== section) notFound();

  await requireOrganizationAccess(
    organizationSlug,
    suiteSection.module === "settings"
      ? "settings.manage"
      : `${suiteSection.module}.read`,
  );

  const bundle = Object.fromEntries(
    [[suiteSection.module, await getModuleData(organizationSlug, suiteSection.module)]],
  );

  return (
    <AppShell active={module} fullViewport organizationSlug={organizationSlug}>
      <NativeBusinessWorkspace
        activeSection={suiteSection.slug}
        bundle={bundle}
        mode={module === "accounting" ? "accounting" : "crm"}
        organizationSlug={organizationSlug}
      />
    </AppShell>
  );
}
