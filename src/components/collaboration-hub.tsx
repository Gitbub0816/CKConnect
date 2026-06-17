"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { SdkEmbed } from "@/components/sdk-embed";

const CKCOLLAB_API_URL =
  process.env.NEXT_PUBLIC_CKCOLLAB_API_URL ?? "https://ckcollab-api.clearkey.solutions";

export function CollaborationHub({
  organizationSlug,
  slackUrl,
}: {
  organizationSlug: string;
  slackUrl?: string;
}) {
  const [mode, setMode] = useState<"ck" | "slack">("ck");

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 8.5rem)" }}>
      <div className="flex shrink-0 items-center gap-2 border-b bg-white px-4 py-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          View via
        </span>
        <button
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            mode === "ck"
              ? "bg-indigo-600 text-white"
              : "border text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() => setMode("ck")}
          type="button"
        >
          CK Collab
        </button>
        <button
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            mode === "slack"
              ? "bg-[#4A154B] text-white"
              : "border text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() => setMode("slack")}
          type="button"
        >
          Slack
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {mode === "ck" ? (
          <SdkEmbed
            apiUrl={CKCOLLAB_API_URL}
            organizationSlug={organizationSlug}
            title="CK Collaboration"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <MessageSquare className="mx-auto text-[#4A154B]" size={40} />
            <h3 className="mt-4 text-xl font-semibold">Slack workspace</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Open your connected Slack workspace or link one to use Slack as the
              collaboration layer for this tenant.
            </p>
            {slackUrl ? (
              <a
                className="ck-button mt-6"
                href={slackUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open in Slack →
              </a>
            ) : (
              <a
                className="ck-button mt-6"
                href="https://slack.com/oauth/v2/authorize"
                rel="noreferrer"
                target="_blank"
              >
                Connect Slack workspace
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
