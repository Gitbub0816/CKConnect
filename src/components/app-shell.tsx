import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { KiraAssistant } from "@/components/kira-assistant";
import { getOrganizationContext } from "@/lib/organization-context";

export async function AppShell({
  organizationSlug,
  active,
  children,
}: {
  organizationSlug: string;
  active: string;
  children: React.ReactNode;
}) {
  const base = `/app/${organizationSlug}`;
  const organization = await getOrganizationContext(organizationSlug);
  const theme = organization?.theme;
  const enabled = organization?.moduleConfiguration as Record<
    string,
    unknown
  > | null;
  const shellStyle = {
    "--console-primary": theme?.consolePrimaryColor ?? "#c9a033",
    "--console-sidebar": theme?.consoleSidebarColor ?? "#1c1917",
    "--background": theme?.consoleBackgroundColor ?? "#f5f0e8",
    "--surface": theme?.consoleSurfaceColor ?? "#ffffff",
    "--surface-muted": `color-mix(in srgb, ${theme?.consoleSurfaceColor ?? "#ffffff"} 92%, ${theme?.consoleBackgroundColor ?? "#f5f0e8"})`,
    "--foreground": theme?.consoleTextColor ?? "#1c1917",
    "--muted": theme?.consoleMutedColor ?? "#746c64",
    "--primary": theme?.consolePrimaryColor ?? "#c9a033",
    "--primary-strong": theme?.consolePrimaryColor ?? "#c9a033",
    "--radius": `${theme?.consoleRadius ?? 8}px`,
    fontFamily: theme?.consoleFont ?? "Geist",
    backgroundImage: theme?.consoleBackgroundImageUrl
      ? `linear-gradient(rgb(245 240 232 / 92%), rgb(245 240 232 / 92%)), url("${theme.consoleBackgroundImageUrl}")`
      : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as React.CSSProperties;

  return (
    <div
      className={`grid min-h-screen lg:h-screen lg:overflow-hidden ${theme?.consoleNavigationStyle === "rail" ? "lg:grid-cols-[82px_1fr]" : "lg:grid-cols-[238px_1fr]"} ${theme?.consoleDensity === "compact" ? "console-compact" : theme?.consoleDensity === "spacious" ? "console-spacious" : ""}`}
      style={shellStyle}
    >
      <AppSidebar
        active={active}
        base={base}
        enabled={enabled}
        logoUrl={theme?.consoleLogoUrl}
        navigationStyle={theme?.consoleNavigationStyle}
        organizationSlug={organizationSlug}
        title={theme?.consoleTitle ?? organization?.name ?? "ClearKey Connect"}
      />
      <div className="flex min-w-0 flex-col lg:h-screen lg:overflow-y-auto">
        <header
          className="flex h-16 shrink-0 items-center justify-between border-b px-5 lg:px-7"
          style={{ background: theme?.consoleHeaderColor ?? "#ffffff" }}
        >
          <div>
            <div className="text-xs text-slate-500">ClearKey workspace</div>
            <div className="text-sm font-semibold capitalize">
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
            <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              CB
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-3 text-[10px] text-slate-400 lg:px-7">
          <span>ClearKey Connect - Tenant {organization?.publicId}</span>
          <span>
            <Link href="/legal/terms">Terms</Link> -{" "}
            <Link href="/legal/privacy">Privacy</Link> -{" "}
            <Link href="/legal/security">Security</Link> -{" "}
            <Link href="/legal/accessibility">Accessibility</Link>
          </span>
        </footer>
      </div>
      <KiraAssistant
        activeModule={active}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}
