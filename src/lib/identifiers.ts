import { z } from "zod";

export const reservedSlugs = new Set(["www", "admin", "api", "console", "support", "mail", "ftp", "root"]);

export const tenantSlugSchema = z.string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens")
  .refine((value) => !reservedSlugs.has(value), "This identifier is reserved");

export const orgCodeSchema = z.string().trim().toUpperCase().min(4).max(16).regex(/^[A-Z0-9]+$/);

export function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
}

export function assertTenantSiteHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized.endsWith(".cksites.dev")) return normalized;
  const slug = normalized.slice(0, -".cksites.dev".length);
  tenantSlugSchema.parse(slug);
  return normalized;
}
