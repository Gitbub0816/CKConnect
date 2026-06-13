import { notFound } from "next/navigation";
import { AppearanceStudio } from "@/components/appearance-studio";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";

const modules = new Set([
  "leads", "accounts", "contacts", "deals", "cases", "campaigns", "tasks", "calendar",
  "reports", "invoices", "payments", "expenses", "vendors", "accounting", "banking",
  "products", "automations", "integrations", "team", "appearance", "audit", "settings",
]);

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; module: string }>;
}) {
  const { organizationSlug, module } = await params;
  if (!modules.has(module)) notFound();

  return (
    <AppShell active={module} organizationSlug={organizationSlug}>
      {module === "appearance" ? <AppearanceStudio organizationSlug={organizationSlug} /> : <ModulePage module={module} />}
    </AppShell>
  );
}
