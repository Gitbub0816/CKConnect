# ClearKey Connect

ClearKey Connect is a multi-tenant operating platform for small businesses. It combines CRM, service, scheduling, invoicing, payments, proprietary double-entry accounting, reporting, automations, customizable client endpoints, and optional QuickBooks Online synchronization.

## Current Foundation

- Next.js 16 App Router with React 19 and TypeScript
- Clerk-ready authentication and organization routing
- Neon PostgreSQL with Prisma 7
- Tenant-scoped schema for CRM, accounting, payments, integrations, customization, and audit history
- Stripe Billing and Connect integration boundaries
- QuickBooks provider abstraction and external ID mapping
- Cloudflare R2 and queue environment boundaries
- PostHog and Sentry environment boundaries
- Branded public client endpoints and appearance studio
- Vitest coverage for financial invariants

The app runs without secrets in preview mode at:

```text
/
/app/demo
/app/demo/appearance
/p/demo
/api/health
```

## Local Setup

Requirements:

- Node.js 20.9 or newer
- A rotated Neon connection string
- Clerk application keys
- Stripe sandbox keys

```bash
npm install
copy .env.example .env.local
npm run db:generate
npm run dev
```

Do not commit `.env.local` or store provider secrets in organization records.

## Database

The schema is in `prisma/schema.prisma`.

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

Database migrations should be developed on a Neon branch, verified, and then applied to the production branch.

Core accounting invariants:

1. Debits equal credits.
2. Posted entries are never deleted or edited.
3. Corrections use reversal or adjusting entries.
4. Financial reports derive from posted journal lines.
5. Reconciled activity is locked.
6. Every financial mutation receives an audit record.

## Architecture

```text
Browser
  |
  v
Next.js on Vercel
  |-- Clerk authentication
  |-- Server Components and Server Actions
  |-- Public APIs and signed client endpoints
  |
  +--> Neon PostgreSQL
  +--> Stripe Billing and Connect
  +--> Cloudflare R2
  +--> Cloudflare Queues / worker
  +--> QuickBooks Online
  +--> PostHog
  +--> Sentry
```

The first deployment is a modular monolith. External queues and workers handle webhook processing, imports, exports, sync, document generation, reminders, and automation runs.

## Tenant Security

- URLs identify a workspace, but never authorize access.
- Server-side membership resolution is required for every protected operation.
- All tenant-owned records include `organizationId`.
- Compound uniqueness constraints are tenant-aware.
- External IDs are persisted in mapping records; names are never used as sync identity.
- Public invoices, forms, portals, and booking pages use signed or random opaque tokens.
- Provider credentials are encrypted before persistence.
- Platform administration is separate from organization roles.

## Required Secrets

Copy key names from `.env.example` into the Vercel project. Secret values should only be added through the Vercel or provider secret manager.

Immediate setup order:

1. Rotate the Neon credential previously stored in Markdown.
2. Connect the GitHub repository to Vercel.
3. Add the Vercel Neon integration and pull `DATABASE_URL`.
4. Create Clerk and add its publishable, secret, and webhook keys.
5. Add Stripe sandbox keys, price IDs, and webhook secret.
6. Create a Cloudflare R2 bucket and queue resources.
7. Add Intuit sandbox OAuth credentials.
8. Connect PostHog and Sentry projects.

## Verification

```bash
npm run check
npm run build
```

The production build is designed to succeed before external services are configured. Routes that require a provider report a clear pending state until its environment keys exist.

## Documentation

- [System architecture](docs/architecture/system.md)
- [Architecture compliance audit](docs/architecture/compliance-audit.md)
- [Payroll architecture](docs/architecture/payroll.md)
- [Delivery roadmap](docs/architecture/roadmap.md)
- [Security model](docs/security/model.md)
