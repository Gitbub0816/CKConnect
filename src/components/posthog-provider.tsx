"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "true") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: "identified_only",
      mask_all_text: false,
      mask_all_element_attributes: false,
    });
  }, []);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "true") return;
    if (!posthog.__loaded) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", { $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}` });
  }, [pathname, searchParams]);
  return children;
}
