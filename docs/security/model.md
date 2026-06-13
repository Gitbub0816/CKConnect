# Security Model

## Trust Boundaries

- Browser input is untrusted.
- URL organization slugs are routing hints, not authorization.
- Webhook payloads are untrusted until signature verification succeeds.
- External synchronization data is untrusted and validated before persistence.
- Public endpoint tokens are scoped, opaque, expiring, and revocable.

## Authorization

Every protected request resolves:

1. Clerk user identity.
2. Local user record.
3. Organization membership.
4. Role and explicit permission overrides.
5. Resource ownership by `organizationId`.

Platform administrator access is separately granted and every override is audited.

## Financial Controls

- Database transactions wrap posting operations.
- Balanced journal validation occurs on the server.
- Posted entries are append-only.
- Reversals reference the original entry.
- Idempotency keys protect payment and webhook processing.
- Money uses decimal database fields or integer minor units at provider boundaries.
- Reports query posted journal lines, never dashboard cache values.

## Secrets

- Secrets remain in Vercel or Cloudflare secret stores.
- OAuth refresh tokens and tax identifiers are encrypted at application level before database storage.
- Secret values are never sent to the browser, logs, PostHog, or Sentry.
- The exposed Neon credential from the original Markdown must be rotated before use.

## Data Protection

- TLS is required in transit.
- Provider-managed encryption protects managed storage at rest.
- R2 objects are private and delivered through signed URLs.
- Files are type-checked, size-limited, and scanned before general availability.
- Audit retention is longer than ordinary application logs.
