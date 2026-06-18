"use client";

import { useEffect, useRef } from "react";

export type SdkTheme = {
  primary: string;
  sidebar: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  radius: string;
  font: string;
  logoUrl?: string;
};

function readTheme(): SdkTheme {
  if (typeof window === "undefined")
    return { primary: "#5B5FCF", sidebar: "#15171E", background: "#F7F8FA", surface: "#FFFFFF", foreground: "#0F1117", muted: "#52576B", radius: "14px", font: "Geist" };
  const el = (document.querySelector(".ck-app-shell") as HTMLElement) ?? document.documentElement;
  const s = getComputedStyle(el);
  const get = (v: string) => s.getPropertyValue(v).trim() || undefined;
  return {
    primary: get("--console-primary") ?? get("--primary") ?? "#5B5FCF",
    sidebar: get("--console-sidebar") ?? "#15171E",
    background: get("--background") ?? "#F7F8FA",
    surface: get("--surface") ?? "#FFFFFF",
    foreground: get("--foreground") ?? "#0F1117",
    muted: get("--muted") ?? "#52576B",
    radius: get("--radius") ?? "14px",
    font: el.style.fontFamily || "Geist",
  };
}

export function SdkEmbed({
  apiUrl,
  organizationSlug,
  extraParams,
  onMessage,
  title = "ClearKey SDK",
}: {
  apiUrl: string;
  organizationSlug: string;
  extraParams?: Record<string, string>;
  onMessage?: (data: unknown) => void;
  title?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  const src = (() => {
    try {
      const url = new URL(apiUrl);
      url.searchParams.set("org", organizationSlug);
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
      }
      return url.toString();
    } catch {
      return apiUrl;
    }
  })();

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    const sendConfig = () => {
      const theme = readTheme();
      try {
        iframe.contentWindow?.postMessage(
          {
            type: "ck:init",
            payload: {
              organizationSlug,
              theme,
              locale: navigator.language,
            },
          },
          new URL(apiUrl).origin,
        );
      } catch {}
    };

    iframe.addEventListener("load", sendConfig);
    return () => iframe.removeEventListener("load", sendConfig);
  }, [apiUrl, organizationSlug]);

  useEffect(() => {
    if (!onMessage) return;
    let origin: string;
    try { origin = new URL(apiUrl).origin; } catch { return; }

    const handler = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (typeof event.data === "object" && event.data !== null) {
        onMessage(event.data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [apiUrl, onMessage]);

  return (
    <iframe
      allow="camera; microphone; clipboard-write; fullscreen; payment"
      className="h-full w-full border-0"
      ref={ref}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
      src={src}
      title={title}
    />
  );
}
