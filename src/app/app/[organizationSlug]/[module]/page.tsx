import { notFound } from "next/navigation";
import { AppearanceStudio } from "@/components/appearance-studio";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";
import { getModuleData, getPublishedEndpoint } from "@/lib/workspace-data";

const modules = new Set([
  "leads", "accounts", "contacts", "deals", "cases", "campaigns", "tasks", "calendar",
  "reports", "invoices", "payments", "expenses", "vendors", "accounting", "banking",
  "products", "tax-documents", "automations", "email", "documents", "notifications",
  "integrations", "team", "appearance", "audit", "admin", "settings",
  "payroll", "billing", "websites", "domains",
]);

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; module: string }>;
}) {
  const { organizationSlug, module } = await params;
  if (!modules.has(module)) notFound();
  const endpoint = module === "appearance" ? await getPublishedEndpoint(organizationSlug) : null;
  const data = module === "appearance" ? null : await getModuleData(organizationSlug, module);
  if (module === "appearance" && (!endpoint || !endpoint.theme || !endpoint.endpointPages[0])) notFound();
  if (module !== "appearance" && !data) notFound();

  return (
    <AppShell active={module} organizationSlug={organizationSlug}>
      {module === "appearance" ? (
        <AppearanceStudio
          initialBlocks={endpoint!.endpointPages[0].blocksJson as never[]}
          initialNavigation={endpoint!.endpointPages[0].navigationJson as never[]}
          initialTheme={endpoint!.theme!}
          organizationSlug={organizationSlug}
        />
      ) : (
        <ModulePage data={data!} module={module} organizationSlug={organizationSlug} />
      )}
    </AppShell>
  );
}
