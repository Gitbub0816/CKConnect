import { notFound } from "next/navigation";
import {
  AccountingSuite,
  getAccountingSection,
} from "@/components/accounting-suite";
import {
  AccountingAddendumWorkspace,
  CrmAddendumWorkspace,
} from "@/components/addendum-workspaces";
import { AppShell } from "@/components/app-shell";
import { CrmSuite, getCrmSection } from "@/components/crm-suite";
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

  const bundleModules =
    module === "crm"
      ? ["leads", "accounts", "contacts", "deals", "cases", "tasks", "invoices"]
      : [
          "accounting",
          "invoices",
          "payments",
          "vendors",
          "expenses",
          "banking",
          "products",
        ];
  const bundle = Object.fromEntries(
    await Promise.all(
      bundleModules.map(async (key) => [
        key,
        await getModuleData(organizationSlug, key),
      ]),
    ),
  );
  if (!bundle[suiteSection.module]) notFound();

  if (module === "crm") {
    return (
      <AppShell active="crm" organizationSlug={organizationSlug}>
        <CrmSuite activeSection={suiteSection.slug} organizationSlug={organizationSlug}>
          <CrmAddendumWorkspace
            data={bundle}
            organizationSlug={organizationSlug}
            section={suiteSection.slug}
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
        <AccountingAddendumWorkspace
          data={bundle}
          organizationSlug={organizationSlug}
        />
      </AccountingSuite>
    </AppShell>
  );
}
