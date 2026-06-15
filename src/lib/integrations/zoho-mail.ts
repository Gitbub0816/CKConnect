import "server-only";

import { decryptSecret } from "@/lib/encryption";
import { getDb } from "@/lib/db";

type ZohoCredentials = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

type ZohoSettings = {
  accountEndpoint?: string;
  accountsEndpoint?: string;
  apiBaseUrl?: string;
  organizationId?: string;
  tokenEndpoint?: string;
};

type ZohoTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type ZohoMailboxProvisionInput = {
  organizationId: string;
  email: string;
  localPart: string;
  domain: string;
  displayName: string;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function defaultAccountsEndpoint(settings: ZohoSettings) {
  const base = settings.apiBaseUrl ?? process.env.ZOHO_MAIL_API_BASE_URL ?? "https://mail.zoho.com/api";
  const organizationId = settings.organizationId ?? process.env.ZOHO_ORGANIZATION_ID;
  if (!organizationId) return null;
  return `${base}/organization/${organizationId}/accounts`;
}

async function getAccessToken(encryptedCredentials: string, settings: ZohoSettings) {
  const credentials = JSON.parse(decryptSecret(encryptedCredentials)) as ZohoCredentials;
  if (credentials.accessToken && credentials.expiresAt && new Date(credentials.expiresAt) > new Date(Date.now() + 60_000)) {
    return credentials.accessToken;
  }
  if (!credentials.refreshToken) throw new Error("Zoho refresh token is not stored");
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zoho OAuth client credentials are not configured");
  const response = await fetch(settings.tokenEndpoint ?? "https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refreshToken,
    }),
    cache: "no-store",
  });
  const token = (await response.json()) as ZohoTokenResponse;
  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description ?? token.error ?? "Zoho token refresh failed");
  }
  return token.access_token;
}

export async function provisionZohoMailbox(input: ZohoMailboxProvisionInput) {
  const integration = await getDb().integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: input.organizationId,
        provider: "ZOHO_MAIL",
      },
    },
  });
  if (!integration || integration.status !== "ACTIVE" || !integration.encryptedCredentials) {
    return {
      providerMailboxId: null,
      providerStatus: "NOT_CONNECTED",
      status: "PENDING_CONFIGURATION",
      raw: null,
    };
  }

  const settings = asRecord(integration.settings) as ZohoSettings;
  const endpoint =
    settings.accountEndpoint ??
    settings.accountsEndpoint ??
    process.env.ZOHO_MAIL_ACCOUNTS_ENDPOINT ??
    defaultAccountsEndpoint(settings);
  if (!endpoint) {
    return {
      providerMailboxId: null,
      providerStatus: "MISSING_ORGANIZATION_ID",
      status: "PENDING_CONFIGURATION",
      raw: null,
    };
  }

  const accessToken = await getAccessToken(integration.encryptedCredentials, settings);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Zoho-oauthtoken ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accountName: input.localPart,
      displayName: input.displayName,
      emailAddress: input.email,
      domainName: input.domain,
      primaryEmailAddress: input.email,
    }),
    cache: "no-store",
  });
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = String(raw?.message ?? raw?.error ?? "Zoho mailbox provisioning failed");
    throw new Error(message);
  }
  const rawData = asRecord(raw?.data);
  const providerMailboxId = String(
    raw?.accountId ?? rawData.accountId ?? raw?.id ?? input.email,
  );
  return {
    providerMailboxId,
    providerStatus: "PROVISIONED",
    status: "ACTIVE",
    raw,
  };
}
