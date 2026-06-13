# Logging and Audit Standard

ClearKey Connect uses two complementary records. Structured operational logs explain system behavior in Vercel and Sentry. The PostgreSQL audit ledger proves who changed protected business data and whether its history remains intact.

## Operational logs

- Emit JSON through `src/lib/logging/logger.ts`.
- Include an event name, timestamp, environment, request ID, HTTP method, and path.
- Never log request bodies, credentials, cookies, authorization headers, payment details, tax IDs, or provider payloads.
- The shared redactor recursively masks sensitive keys and truncates oversized values.
- Errors are sent to Sentry when configured. Vercel captures the same structured server output.

## Audit ledger

- Every financial, permission, authentication, integration, payroll, and administrative mutation must call `appendAuditEvent` in the same business workflow.
- Audit records are append-only. Application roles receive no update or delete permission on `AuditLog`.
- Each organization has a serialized chain head protected by a PostgreSQL advisory transaction lock.
- Every record contains a monotonic sequence, previous hash, and HMAC-SHA256 record hash.
- `AUDIT_HMAC_KEY` is mandatory in production and must live in the deployment secret manager.
- Financial and security events use seven-year retention. Legal holds override deletion schedules.

## Verification

A scheduled integrity job must replay each organization chain, compare every `previousHash`, recalculate `recordHash`, and alert through Sentry on the first mismatch. Audit exports include chain hashes so an external reviewer can verify them independently.

## Access and retention

- Audit access is restricted to organization owners, designated compliance roles, and authorized ClearKey security administrators.
- Viewing or exporting audit data is itself audited.
- Operational logs default to 30 days unless incident or legal requirements require longer retention.
- Audit records default to seven years for financial and security categories.
