"use client";

import { SdkEmbed } from "@/components/sdk-embed";

const CALENDAR_API_URL =
  process.env.NEXT_PUBLIC_CALENDAR_API_URL ?? "https://calendar-api.clearkey.solutions";

export function CalendarWorkbench({
  organizationSlug,
}: {
  records?: unknown[];
  organizationSlug: string;
}) {
  return (
    <div className="flex h-full flex-1 overflow-hidden" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <SdkEmbed
        apiUrl={CALENDAR_API_URL}
        organizationSlug={organizationSlug}
        title="Calendar"
      />
    </div>
  );
}
