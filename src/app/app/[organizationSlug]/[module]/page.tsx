import { notFound } from "next/navigation";
import { AppearanceStudio } from "@/components/appearance-studio";
import { getAccountingSection } from "@/components/accounting-suite";
import { AppShell } from "@/components/app-shell";
import { getCrmSection } from "@/components/crm-suite";
import { ModulePage } from "@/components/module-page";
import { NativeBusinessWorkspace } from "@/components/native-workspaces";
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
  "slack",
  "support",
  "payment-settings",
  "data-studio",
  "compliance",
]);

export async function renderWorkspaceModulePage({
  params,
  searchParams,
}: {
  params: Promise<{
    organizationSlug: string;
    module: string;
    section?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationSlug, module, section } = await params;
  const sp = searchParams ? await searchParams : {};
  const activeTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeSection = section?.[0] ?? "overview";
  if (!modules.has(module)) notFound();
  const access = await requireOrganizationAccess(
    organizationSlug,
    ["settings", "appearance", "data-studio", "compliance"].includes(module)
      ? "settings.manage"
      : module === "crm"
        ? "accounts.read"
      : module === "slack"
        ? "collaboration.read"
        : `${module}.read`,
  );
  const configuration = access.organization;
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
  const bundleModules =
    module === "crm"
      ? [getCrmSection(activeSection).module]
      : module === "accounting"
        ? [getAccountingSection(activeSection).module]
        : [];
  const bundle = bundleModules.length
    ? Object.fromEntries(
        await Promise.all(
          bundleModules.map(async (key) => [
            key,
            await getModuleData(organizationSlug, key),
          ]),
        ),
      )
    : null;
  const data =
    module === "appearance"
      ? null
      : bundle
        ? null
        : await getModuleData(organizationSlug, module === "slack" ? "collaboration" : module);
  if (
    module === "appearance" &&
    (!endpoint || !endpoint.theme || !endpoint.endpointPages[0])
  )
    notFound();
  if (module !== "appearance" && !bundle && !data) notFound();

  return (
    <AppShell active={module} fullViewport={["crm", "accounting"].includes(module)} organizationSlug={organizationSlug}>
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
          <NativeBusinessWorkspace activeSection={activeSection} bundle={bundle!} mode="crm" organizationSlug={organizationSlug} />
        ) : module === "accounting" ? (
          <NativeBusinessWorkspace activeSection={activeSection} bundle={bundle!} mode="accounting" organizationSlug={organizationSlug} />
        ) : (
          <ModulePage
            activeTab={activeTab}
            data={data!}
            module={module}
            organizationSlug={organizationSlug}
          />
        )
      )}
    </AppShell>
  );
}

export default renderWorkspaceModulePage;
