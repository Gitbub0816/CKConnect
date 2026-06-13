"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export function BillingActions({ organizationSlug, hasSubscription }: { organizationSlug: string; hasSubscription: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function open(path: string) {
    setLoading(true);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationSlug }),
    });
    const result = await response.json() as { url?: string; error?: string };
    if (result.url) return window.location.assign(result.url);
    setError(result.error ?? "Unable to open Stripe billing");
    setLoading(false);
  }
  return <div>
    <button className="ck-button w-full !min-h-12" disabled={loading} onClick={() => open(hasSubscription ? "/api/stripe/billing/portal" : "/api/stripe/billing/checkout")} type="button">
      {loading ? <LoaderCircle className="animate-spin" size={16}/> : <CreditCard size={16}/>}
      {hasSubscription ? "Manage subscription" : "Start subscription"}
    </button>
    {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
