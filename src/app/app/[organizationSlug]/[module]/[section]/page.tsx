import { notFound } from "next/navigation";
import {
  AccountingSuite,
  getAccountingSection,
} from "@/components/accounting-suite";
import { AppShell } from "@/components/app-shell";
import { CrmSuite, getCrmSection } from "@/components/crm-suite";
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
  if (!["accounting", "crm"].includes(module)) notFound();

  const suiteSection =
    module === "accounting" ? getAccountingSection(section) : getCrmSection(section);
  if (suiteSection.slug !== section) notFound();

  await requireOrganizationAccess(
    organizationSlug,
    suiteSection.module === "settings"
      ? "settings.manage"
      : `${suiteSection.module}.read`,
  );

  const data = await getModuleData(organizationSlug, suiteSection.module);
  if (!data) notFound();

  if (module === "crm") {
    return (
      <AppShell active="crm" organizationSlug={organizationSlug}>
        <CrmSuite activeSection={suiteSection.slug} organizationSlug={organizationSlug}>
          <ModulePage
            data={data}
            embedded
            module={suiteSection.module}
            organizationSlug={organizationSlug}
          />
        </CrmSuite>
      </AppShell>
    );
  }

  return (
    <AppShell active="accounting" organizationSlug={organizationSlug}>
      <AccountingSuite
        activeSection={suiteSection.slug}
        organizationSlug={organizationSlug}
      >
        <ModulePage
          data={data}
          embedded
          module={suiteSection.module}
          organizationSlug={organizationSlug}
        />
      </AccountingSuite>
    </AppShell>
  );
}
