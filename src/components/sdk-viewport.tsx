"use client";

import type { SdkEmbedConfig } from "@/lib/sdk-embed";

function embedUrl(config: SdkEmbedConfig) {
  const path =
    config.kind === "collaboration"
      ? "/sdk-demo"
      : config.kind === "calendar"
        ? "/sandbox"
        : "/studio";
  const url = new URL(path, config.apiUrl);
  url.searchParams.set("embedded", "1");
  url.searchParams.set("tenantId", config.organizationId);
  url.searchParams.set("organizationSlug", config.organizationSlug);
  url.searchParams.set("userId", config.userId);
  url.searchParams.set("role", config.role);
  url.searchParams.set("theme", JSON.stringify(config.theme));
  if (config.apiKey) url.searchParams.set("apiKey", config.apiKey);
  if (config.token) {
    url.searchParams.set(config.kind === "dashboard" ? "apiToken" : "jwt", config.token);
    url.searchParams.set("token", config.token);
  }
  if (config.kind === "builder") {
    url.searchParams.set("projectId", config.organizationId);
    url.searchParams.set("mode", "edit");
  }
  return url.toString();
}

export function SdkViewport({ config }: { config: SdkEmbedConfig }) {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-white">
      <iframe
        allow="clipboard-read; clipboard-write; fullscreen"
        className="block h-full w-full border-0"
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl(config)}
        title={`${config.kind} workspace`}
      />
    </div>
  );
}
