# Delivery Roadmap

The requested phase-one scope includes the complete product. Delivery is organized as vertical slices so each increment has UI, authorization, persistence, audit logging, validation, and tests.

## Foundation

- Repository and deployment setup
- Clerk identity and organization onboarding
- Neon schema, migrations, seed data, and tenant policies
- Application shell and customization system
- Audit and webhook infrastructure

## CRM And Operations

- Leads, conversion, accounts, contacts, deals, and activities
- Tasks, calendar, bookings, cases, campaigns, products, and files
- Custom fields, saved views, import/export, search, and duplicate management
- Notifications and automation builder

## Finance

- Invoice lifecycle and public payment pages
- Stripe Billing and Connect
- Chart of accounts and posting engine
- Receivables, payables, expenses, vendors, banking, reconciliation, inventory, and sales tax
- Financial statements and accountant exports

## Integrations

- QuickBooks OAuth, mappings, synchronization, conflict queue, and health dashboard
- R2 document storage and signed delivery
- Queue workers and schedules
- PostHog event taxonomy
- Sentry releases and alerting

## Launch Controls

- Tenant isolation test suite
- Permission matrix tests
- Accounting lifecycle tests
- Webhook replay tests
- Accessibility and responsive review
- Backup, retention, deletion, and incident procedures
- Legal copy reviewed by qualified counsel
