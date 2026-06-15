import { notFound } from "next/navigation";
import {
  AccountingSuite,
  getAccountingSection,
} from "@/components/accounting-suite";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getModuleData } from "@/lib/workspace-data";

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
  if (module !== "accounting") notFound();

  const accountingSection = getAccountingSection(section);
  if (accountingSection.slug !== section) notFound();

  await requireOrganizationAccess(
    organizationSlug,
    accountingSection.module === "settings"
      ? "settings.manage"
      : `${accountingSection.module}.read`,
  );

  const data = await getModuleData(organizationSlug, accountingSection.module);
  if (!data) notFound();

  return (
    <AppShell active="accounting" organizationSlug={organizationSlug}>
      <AccountingSuite
        activeSection={accountingSection.slug}
        organizationSlug={organizationSlug}
      >
        <ModulePage
          data={data}
          embedded
          module={accountingSection.module}
          organizationSlug={organizationSlug}
        />
      </AccountingSuite>
    </AppShell>
  );
}
