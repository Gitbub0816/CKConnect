import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function tokenSecret() {
  const value = process.env.CUSTOMER_WORKSPACE_SECRET ?? process.env.AUDIT_HMAC_KEY;
  if (!value) throw new Error("CUSTOMER_WORKSPACE_SECRET is not configured");
  return value;
}

export function createCustomerWorkspaceToken(channelPublicId: string, expiresInDays = 30) {
  const payload = Buffer.from(JSON.stringify({ channelPublicId, exp: Date.now() + expiresInDays * 86_400_000 })).toString("base64url");
  const signature = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyCustomerWorkspaceToken(value: string, expectedPublicId: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", tokenSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { channelPublicId: string; exp: number };
  return decoded.channelPublicId === expectedPublicId && decoded.exp > Date.now();
}
