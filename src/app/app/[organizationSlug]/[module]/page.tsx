import { notFound } from "next/navigation";
import { AppearanceStudio } from "@/components/appearance-studio";
import { AppShell } from "@/components/app-shell";
import { AccountingSuite } from "@/components/accounting-suite";
import { CrmSuite } from "@/components/crm-suite";
import { ModulePage } from "@/components/module-page";
import { getModuleData, getPublishedEndpoint } from "@/lib/workspace-data";
import { requireOrganizationAccess } from "@/lib/authorization";

const modules = new Set([
  "crm",
  "leads",
  "accounts",
  "contacts",
  "deals",
  "cases",
  "campaigns",
  "tasks",
  "calendar",
  "reports",
  "invoices",
  "payments",
  "expenses",
  "vendors",
  "accounting",
  "banking",
  "products",
  "tax-documents",
  "automations",
  "email",
  "documents",
  "notifications",
  "integrations",
  "team",
  "appearance",
  "audit",
  "admin",
  "settings",
  "payroll",
  "billing",
  "websites",
  "domains",
  "bookings",
  "submissions",
  "collaboration",
  "support",
  "payment-settings",
  "data-studio",
]);

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; module: string }>;
}) {
  const { organizationSlug, module } = await params;
  if (!modules.has(module)) notFound();
  const { organization: configuration } = await requireOrganizationAccess(
    organizationSlug,
    ["settings", "appearance", "data-studio"].includes(module)
      ? "settings.manage"
      : module === "crm"
        ? "accounts.read"
      : `${module}.read`,
  );
  const featureMap: Record<string, string> = {
    leads: "crm",
    accounts: "crm",
    contacts: "crm",
    deals: "crm",
    cases: "cases",
    campaigns: "campaigns",
    reports: "reports",
    accounting: "accounting",
    expenses: "accounting",
    vendors: "accounting",
    invoices: "accounting",
    payments: "accounting",
    banking: "banking",
    payroll: "payroll",
    automations: "automations",
    websites: "websites",
    appearance: "websites",
    domains: "domains",
    email: "managedEmail",
  };
  const feature = featureMap[module];
  if (
    feature &&
    (configuration?.moduleConfiguration as Record<string, unknown> | null)?.[
      feature
    ] === false
  )
    notFound();
  const endpoint =
    module === "appearance"
      ? await getPublishedEndpoint(organizationSlug)
      : null;
  const data =
    module === "appearance"
      ? null
      : await getModuleData(
          organizationSlug,
          module === "crm" ? "accounts" : module,
        );
  if (
    module === "appearance" &&
    (!endpoint || !endpoint.theme || !endpoint.endpointPages[0])
  )
    notFound();
  if (module !== "appearance" && !data) notFound();

  return (
    <AppShell active={module} organizationSlug={organizationSlug}>
      {module === "appearance" ? (
        <AppearanceStudio
          initialBlocks={endpoint!.endpointPages[0].blocksJson as never[]}
          initialNavigation={
            endpoint!.endpointPages[0].navigationJson as never[]
          }
          initialSettings={endpoint!.endpointPages[0].settingsJson as never}
          initialTheme={endpoint!.theme!}
          organizationSlug={organizationSlug}
        />
      ) : (
        module === "crm" ? (
          <CrmSuite activeSection="overview" organizationSlug={organizationSlug}>
            <ModulePage
              data={data!}
              embedded
              module="accounts"
              organizationSlug={organizationSlug}
            />
          </CrmSuite>
        ) : module === "accounting" ? (
          <AccountingSuite
            activeSection="overview"
            organizationSlug={organizationSlug}
          >
            <ModulePage
              data={data!}
              embedded
              module={module}
              organizationSlug={organizationSlug}
            />
          </AccountingSuite>
        ) : (
          <ModulePage
            data={data!}
            module={module}
            organizationSlug={organizationSlug}
          />
        )
      )}
    </AppShell>
  );
}
