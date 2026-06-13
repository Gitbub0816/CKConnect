# Architecture Compliance Audit

Audit source: `Architecture.md` supplied for ClearKey Connect.

## Alignment

| Requirement | Status | Implementation |
| --- | --- | --- |
| TypeScript-first application | Aligned | Next.js, React, route handlers, provider contracts, validation, and tests use TypeScript. |
| Next.js App Router frontend | Aligned | Routes live under `src/app`; server components are the default. |
| PostgreSQL primary database | Aligned | Neon PostgreSQL is the documented system of record. |
| Prisma ORM | Aligned | Prisma 7 schema covers tenant, CRM, finance, payroll, integration, and audit records. |
| Clerk authentication | Aligned | Clerk routes and proxy protection are prepared. |
| Multi-tenant organization model | Aligned | Tenant-owned models use `organizationId`; membership and permission data are explicit. |
| CRM modules | Aligned structurally | Leads, accounts/customers, contacts, deals, tasks, cases, campaigns, notes, and activities have schema or route surfaces. |
| Finance and accounting | Aligned structurally | Invoices, allocations, payments, bills, expenses, ledger, journals, tax records, and reconciliation are modeled. |
| Stripe and QuickBooks | Aligned structurally | Stripe boundaries and accounting-provider abstraction are present; live credentials and complete workflows remain pending. |
| Documents and R2 | Aligned structurally | Private-file metadata and R2 environment boundaries exist; signing and scanning workflows remain pending. |
| Audit logs | Aligned | Audit schema contains actor, tenant, entity, before/after state, request, IP, agent, and timestamp fields. |
| Deployment environments | Aligned by configuration | Environment template supports isolated provider credentials; actual Vercel/Neon environment provisioning remains pending. |
| Payroll extension | Aligned | Check/Finch provider-neutral schema, UI, jobs, OAuth token fields, history, and ledger-posting design are present. |

## Deliberate Current Deviations

### Separate NestJS API

`Architecture.md` recommends a Next.js frontend and separate NestJS API, while its final recommendation also says to begin as one TypeScript modular monolith. The current baseline implements the modular monolith in Next.js route handlers and server modules to reduce deployment complexity during foundation work.

Before high-volume public API or worker traffic, extract application services behind stable contracts into `apps/api` if independent scaling or release ownership is needed. No domain model depends on Next.js-specific request objects.

### Separate Worker and BullMQ/Redis

Queue job names and asynchronous boundaries are documented, but a deployed BullMQ/Redis worker does not yet exist. The accepted hosting plan uses Cloudflare Queues/Workers instead of BullMQ unless Redis-specific scheduling becomes necessary. This differs from the recommended product choice while preserving the required asynchronous behavior.

### Monorepo Shape

The repository is currently a single deployable package rather than `apps/*` and `packages/*`. It remains a modular monolith at code level. Splitting directories before multiple independently deployed applications exist would add build complexity without changing behavior.

## Missing Runtime Work

Architecture matching is structural, not a claim that all functionality is complete. Remaining runtime work includes:

- Server-side organization membership enforcement for every mutation and query
- Rate limiting and CSRF decisions per endpoint
- Complete CRUD/application services and audit emission
- R2 signed upload/download and malware scanning
- Queue consumers, retries, schedules, and dead-letter handling
- Email provider and delivery webhooks
- Stripe Billing, Accounts v2 onboarding, payment, refund, and dispute workflows
- QuickBooks OAuth, webhooks, mapping, and conflict resolution
- Tax-provider integration and filing review workflow
- PostHog taxonomy, Sentry releases, backups, restore tests, and production alerts

## Conclusion

The baseline matches the prescribed technology, domain boundaries, tenant model, and modular-monolith direction. It does not yet match the optional physical process split into Next.js, NestJS, and worker applications. That split should be performed when deployment or scaling requirements justify it, using the existing provider and domain contracts.
