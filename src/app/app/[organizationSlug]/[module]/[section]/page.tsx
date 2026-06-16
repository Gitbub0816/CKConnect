import { notFound } from "next/navigation";
import {
  AccountingSuite,
  getAccountingSection,
} from "@/components/accounting-suite";
import {
  AccountingAddendumWorkspace,
  CollaborationAddendumWorkspace,
  CrmAddendumWorkspace,
} from "@/components/addendum-workspaces";
import { AppShell } from "@/components/app-shell";
import { CrmSuite, getCrmSection } from "@/components/crm-suite";
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

  // Record detail pages for CRM / finance modules
  if (recordDetailModules.has(module)) {
    const permMap: Record<string, string> = {
      contacts: "accounts.read",
      leads: "accounts.read",
      deals: "accounts.read",
      accounts: "accounts.read",
      invoices: "invoices.read",
    };
    await requireOrganizationAccess(organizationSlug, permMap[module] ?? `${module}.read`);
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
          record={record}
        />
      </AppShell>
    );
  }

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

  // Collaboration has its own data source — skip the main bundle
  if (module === "crm" && section === "collaboration") {
    const collabData = await getModuleData(organizationSlug, "collaboration");
    const channels = ((collabData?.records as Record<string, unknown>[] | undefined) ?? []);
    const calendar = ((collabData?.calendar as Record<string, unknown>[] | undefined) ?? []);
    return (
      <AppShell active="crm" organizationSlug={organizationSlug}>
        <CrmSuite activeSection="collaboration" organizationSlug={organizationSlug}>
          <CollaborationAddendumWorkspace channels={channels} calendar={calendar} />
        </CrmSuite>
      </AppShell>
    );
  }

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
          section={suiteSection.slug}
        />
      </AccountingSuite>
    </AppShell>
  );
}
