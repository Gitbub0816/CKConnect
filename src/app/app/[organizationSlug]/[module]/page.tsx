import { notFound } from "next/navigation";
import { AppearanceStudio } from "@/components/appearance-studio";
import { AppShell } from "@/components/app-shell";
import { ModulePage } from "@/components/module-page";
import { PayrollPage } from "@/components/payroll-page";

const modules = new Set([
  "leads", "accounts", "contacts", "deals", "cases", "campaigns", "tasks", "calendar",
  "reports", "invoices", "payments", "expenses", "vendors", "accounting", "banking",
  "products", "tax-documents", "automations", "email", "documents", "notifications",
  "integrations", "team", "appearance", "audit", "admin", "settings",
  "payroll",
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
      {module === "appearance" ? (
        <AppearanceStudio organizationSlug={organizationSlug} />
      ) : module === "payroll" ? (
        <PayrollPage />
      ) : (
        <ModulePage module={module} />
      )}
    </AppShell>
  );
}
