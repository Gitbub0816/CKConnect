import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { KiraAssistant } from "@/components/kira-assistant";
import { buildInfo, buildVersionLabel } from "@/lib/build-info";
import { getOrganizationContext } from "@/lib/organization-context";

export async function AppShell({
  organizationSlug,
  active,
  children,
  fullViewport = false,
}: {
  organizationSlug: string;
  active: string;
  children: React.ReactNode;
  fullViewport?: boolean;
}) {
  const base = `/app/${organizationSlug}`;
  const organization = await getOrganizationContext(organizationSlug);
  const theme = organization?.theme;
  const enabled = organization?.moduleConfiguration as Record<
    string,
    unknown
  > | null;
  const slackIntegration = organization?.integrations?.find(
    (integration) =>
      integration.provider === "SLACK" &&
      ["ACTIVE", "CONNECTING", "REAUTH_REQUIRED"].includes(integration.status),
  );
  const slackSettings =
    slackIntegration?.settings && typeof slackIntegration.settings === "object"
      ? (slackIntegration.settings as Record<string, unknown>)
      : {};
  const slackMode = slackIntegration
    ? slackSettings.navigationMode === "replace"
      ? "replace"
      : "alongside"
    : null;
  const shellStyle = {
    "--console-primary": theme?.consolePrimaryColor ?? "#5B5FCF",
    "--console-sidebar": theme?.consoleSidebarColor ?? "#15171E",
    "--background": theme?.consoleBackgroundColor ?? "#F7F8FA",
    "--surface": theme?.consoleSurfaceColor ?? "#FFFFFF",
    "--surface-muted": `color-mix(in srgb, ${theme?.consoleSurfaceColor ?? "#FFFFFF"} 88%, ${theme?.consoleBackgroundColor ?? "#F7F8FA"})`,
    "--foreground": theme?.consoleTextColor ?? "#0F1117",
    "--muted": theme?.consoleMutedColor ?? "#52576B",
    "--primary": theme?.consolePrimaryColor ?? "#5B5FCF",
    "--primary-strong": theme?.consolePrimaryColor ?? "#393DAD",
    "--radius": `${theme?.consoleRadius ?? 14}px`,
    fontFamily: theme?.consoleFont ?? "Geist",
    backgroundImage: theme?.consoleBackgroundImageUrl
      ? `linear-gradient(rgb(247 248 250 / 94%), rgb(247 248 250 / 94%)), url("${theme.consoleBackgroundImageUrl}")`
      : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as React.CSSProperties;

  return (
    <div
      className={`ck-app-shell flex min-h-screen lg:h-screen lg:overflow-hidden ${theme?.consoleDensity === "compact" ? "console-compact" : theme?.consoleDensity === "spacious" ? "console-spacious" : ""}`}
      style={shellStyle}
    >
      <AppSidebar
        active={active}
        base={base}
        enabled={enabled}
        logoUrl={theme?.consoleLogoUrl}
        navigationStyle={theme?.consoleNavigationStyle}
        organizationSlug={organizationSlug}
        slackMode={slackMode}
        title={theme?.consoleTitle ?? organization?.name ?? "ClearKey Connect"}
      />
      <div className={`flex min-w-0 flex-1 flex-col lg:h-screen ${fullViewport ? "overflow-hidden" : "lg:overflow-y-auto"}`}>
        {!fullViewport && <header className="ck-topbar flex h-16 shrink-0 items-center justify-between border-b px-5 lg:px-7">
          <div>
            <div className="ck-section-label">ClearKey workspace</div>
            <div className="text-sm font-semibold capitalize text-[var(--ck-ink-primary)]">
              {organizationSlug.replaceAll("-", " ")}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="ck-button ck-button-secondary"
              href={`/p/${organizationSlug}`}
            >
              View client endpoint
            </Link>
            <div className="grid size-9 place-items-center rounded-full bg-[var(--ck-chrome-base)] text-xs font-semibold text-white shadow-sm">
              CB
            </div>
          </div>
        </header>}
        <main className={`flex-1 ${fullViewport ? "min-h-0 overflow-hidden" : ""}`}>{children}</main>
        {!fullViewport && <footer className="ck-app-footer flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-[10px] lg:px-7">
          <span>
            ClearKey Connect - Tenant {organization?.publicId} -{" "}
            <span
              title={`Ref ${buildInfo.ref}${buildInfo.deployment ? ` · ${buildInfo.deployment}` : ""}`}
            >
              {buildVersionLabel()}
            </span>
          </span>
          <span>
            <Link href="/legal/terms">Terms</Link> -{" "}
            <Link href="/legal/privacy">Privacy</Link> -{" "}
            <Link href="/legal/security">Security</Link> -{" "}
            <Link href="/legal/accessibility">Accessibility</Link>
          </span>
        </footer>}
      </div>
      {!fullViewport && <KiraAssistant
        activeModule={active}
        organizationSlug={organizationSlug}
      />}
    </div>
  );
}
