import { createHmac } from "node:crypto";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function calculateAuditHash(payload: unknown, previousHash: string) {
  const key = process.env.AUDIT_HMAC_KEY;
  if (!key && process.env.NODE_ENV === "production") throw new Error("AUDIT_HMAC_KEY is required in production");
  return createHmac("sha256", key ?? "development-only-audit-key")
    .update(previousHash)
    .update("\n")
    .update(canonicalize(payload))
    .digest("hex");
}
