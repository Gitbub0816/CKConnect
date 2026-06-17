import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/encryption";

export const SLACK_SCOPES = [
  "channels:read",
  "chat:write",
  "commands",
  "team:read",
  "users:read",
].join(",");

export type SlackCredentials = {
  botToken: string;
  incomingWebhookUrl?: string;
};

export type SlackInstallSettings = {
  teamId?: string;
  teamName?: string;
  appId?: string;
  botUserId?: string;
  defaultChannelId?: string;
  defaultChannelName?: string;
  notifications?: Record<string, boolean>;
};

export function slackEnv() {
  return {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    redirectUri:
      process.env.SLACK_REDIRECT_URI ??
      "https://connect.clearkey.solutions/api/integrations/slack/oauth/callback",
  };
}

export function encryptSlackCredentials(credentials: SlackCredentials) {
  return encryptSecret(JSON.stringify(credentials));
}

export function decryptSlackCredentials(value: string) {
  return JSON.parse(decryptSecret(value)) as SlackCredentials;
}

export function verifySlackSignature(headers: Headers, rawBody: string) {
  const { signingSecret } = slackEnv();
  if (!signingSecret) return false;
  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 60 * 5) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function slackApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error ?? `Slack ${method} failed`);
  }
  return payload;
}
