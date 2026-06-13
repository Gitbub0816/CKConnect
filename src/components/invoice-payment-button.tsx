"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export function InvoicePaymentButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/invoice-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start checkout");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="ck-button w-full !min-h-12" disabled={loading} onClick={checkout} type="button">
        {loading ? <LoaderCircle className="animate-spin" size={17}/> : <CreditCard size={17}/>}
        {loading ? "Opening secure checkout" : "Pay securely with Stripe"}
      </button>
      {error && <p className="mt-3 text-center text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
