import "server-only";

import { createHmac } from "node:crypto";

type EmbedKind = "builder" | "calendar" | "collaboration" | "dashboard";

type EmbedIdentity = {
  id?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  platformAdmin?: boolean;
};

type EmbedMembership = {
  role?: string | null;
} | null;

type EmbedOrganization = {
  publicId: string;
  slug: string;
  theme?: {
    consolePrimaryColor?: string | null;
    consoleBackgroundColor?: string | null;
    consoleSurfaceColor?: string | null;
    consoleTextColor?: string | null;
    consoleMutedColor?: string | null;
    consoleFont?: string | null;
    consoleRadius?: number | null;
  } | null;
};

export type SdkEmbedConfig = {
  apiKey?: string;
  apiUrl: string;
  kind: EmbedKind;
  organizationId: string;
  organizationSlug: string;
  role: string;
  theme: Record<string, string | number>;
  token?: string;
  userId: string;
};

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret?: string) {
  if (!secret) return undefined;
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function requireApiUrl(value: string | undefined, kind: EmbedKind) {
  if (!value) throw new Error(`${kind} SDK API URL is not configured`);
  const url = new URL(value);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error(`${kind} SDK API URL must use HTTPS`);
  }
  return url.origin;
}

export function createSdkEmbedConfig({
  kind,
  membership,
  organization,
  user,
}: {
  kind: EmbedKind;
  membership: EmbedMembership;
  organization: EmbedOrganization;
  user: EmbedIdentity | null;
}): SdkEmbedConfig {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 60 * 30;
  const userId = user?.id ?? `tenant:${organization.publicId}`;
  const elevated = Boolean(
    user?.platformAdmin || ["OWNER", "ADMIN"].includes(membership?.role ?? ""),
  );
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Workspace user";
  const theme = {
    primary: organization.theme?.consolePrimaryColor ?? "#5B5FCF",
    background: organization.theme?.consoleBackgroundColor ?? "#F7F8FA",
    surface: organization.theme?.consoleSurfaceColor ?? "#FFFFFF",
    text: organization.theme?.consoleTextColor ?? "#0F1117",
    textMuted: organization.theme?.consoleMutedColor ?? "#52576B",
    border: "color-mix(in srgb, currentColor 16%, transparent)",
    font: organization.theme?.consoleFont ?? "Geist",
    radius: organization.theme?.consoleRadius ?? 12,
  };
  const common = {
    exp: expiresAt,
    iat: now,
    sub: userId,
    tenant_id: organization.publicId,
  };

  if (kind === "dashboard") {
    return {
      apiKey: process.env.KPI_API_KEY,
      apiUrl: requireApiUrl(process.env.NEXT_PUBLIC_KPI_API_URL, kind),
      kind,
      organizationId: organization.publicId,
      organizationSlug: organization.slug,
      role: elevated ? "tenant_admin" : "viewer",
      theme,
      token: process.env.KPI_API_KEY,
      userId,
    };
  }

  if (kind === "collaboration") {
    return {
      apiKey: process.env.CKCOLLAB_API_KEY,
      apiUrl: requireApiUrl(process.env.NEXT_PUBLIC_CKCOLLAB_API_URL, kind),
      kind,
      organizationId: organization.publicId,
      organizationSlug: organization.slug,
      role: elevated ? "admin" : "member",
      theme,
      token: signJwt(
        {
          ...common,
          name: displayName,
          role: elevated ? "admin" : "member",
          workspaceId: organization.publicId,
        },
        process.env.CKCOLLAB_WEBHOOK_SECRET,
      ),
      userId,
    };
  }

  if (kind === "calendar") {
    return {
      apiKey: process.env.CALENDAR_API_KEY,
      apiUrl: requireApiUrl(process.env.NEXT_PUBLIC_CALENDAR_API_URL, kind),
      kind,
      organizationId: organization.publicId,
      organizationSlug: organization.slug,
      role: elevated ? "admin" : "member",
      theme,
      token: signJwt(
        {
          ...common,
          calendar_id: `tenant:${organization.publicId}`,
          iss: process.env.CALENDAR_API_KEY,
          permissions: {
            canCreate: elevated,
            canDelete: elevated,
            canEdit: elevated,
          },
          scope: "tenant",
          theme,
        },
        process.env.CALENDAR_SHARED_SECRET,
      ),
      userId,
    };
  }

  const builderSecret =
    process.env.BUILDER_OAUTH_CLIENT_SECRET ??
    process.env.BUILDER_WEBHOOK_KEY ??
    process.env.BUILDER_API_KEY;
  return {
    apiKey: process.env.BUILDER_API_KEY,
    apiUrl: requireApiUrl(process.env.NEXT_PUBLIC_BUILDER_API_URL, kind),
    kind,
    organizationId: organization.publicId,
    organizationSlug: organization.slug,
    role: elevated ? "admin" : "editor",
    theme,
    token: signJwt(
      {
        ...common,
        ck_project: organization.publicId,
        ck_role: elevated ? "admin" : "editor",
        ck_studio: true,
        org: organization.publicId,
      },
      builderSecret,
    ),
    userId,
  };
}
