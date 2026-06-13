import "server-only";

import { normalizeHostname } from "@/lib/identifiers";

const trustedExactHosts = new Set([
  "localhost",
  "127.0.0.1",
  "connect.clearkey.solutions",
  "console.clearkey.solutions",
  "admin.connect.clearkey.solutions",
  "clearkey.solutions",
  "www.clearkey.solutions",
  "cksites.dev",
  "www.cksites.dev",
]);

function isTrustedHost(hostname: string) {
  const host = normalizeHostname(hostname.split(":")[0]);
  return trustedExactHosts.has(host)
    || host.endsWith(".connect.clearkey.solutions")
    || host.endsWith(".cksites.dev")
    || host.endsWith(".vercel.app");
}

export function assertTrustedMutationOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw new Error("Cross-site mutation rejected");
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  let hostname = "";
  try {
    hostname = new URL(origin).hostname;
  } catch {
    throw new Error("Invalid request origin");
  }
  if (!isTrustedHost(hostname)) throw new Error("Untrusted request origin");
}
