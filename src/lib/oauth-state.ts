import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";

function secret() {
  const value = process.env.OAUTH_STATE_SECRET ?? process.env.AUDIT_HMAC_KEY;
  if (!value) throw new Error("OAUTH_STATE_SECRET is not configured");
  return value;
}

export async function createOAuthState(organizationId: string, provider: string) {
  const nonce = nanoid(32);
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await getDb().oAuthState.create({ data: { organizationId, provider, nonce, expiresAt } });
  const payload = Buffer.from(JSON.stringify({ organizationId, provider, nonce, exp: expiresAt.getTime() })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function consumeOAuthState(value: string, provider: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error("Invalid OAuth state signature");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { organizationId: string; provider: string; nonce: string; exp: number };
  if (decoded.provider !== provider || decoded.exp < Date.now()) throw new Error("OAuth state expired");
  const state = await getDb().oAuthState.findUnique({ where: { nonce: decoded.nonce } });
  if (!state || state.usedAt || state.expiresAt < new Date() || state.organizationId !== decoded.organizationId) throw new Error("OAuth state was already used or is invalid");
  await getDb().oAuthState.update({ where: { id: state.id }, data: { usedAt: new Date() } });
  return decoded.organizationId;
}
