# System Architecture

## Product Boundary

ClearKey Connect owns the CRM, proprietary accounting ledger, invoices, operational records, customization, audit trail, and integration state. Stripe owns card and bank payment data. QuickBooks is an optional external accounting provider and never becomes a hidden dependency of CRM workflows.

## Application Layers

### Presentation

- Marketing and authentication
- Organization workspace
- Internal platform administration
- Customer portal
- Public payment, booking, form, and document endpoints
- Organization theme and page-block renderer

### Application

- Authentication and membership resolution
- Permission policies
- CRM workflows
- Invoice lifecycle
- Accounting posting engine
- Payment orchestration
- Automation engine
- Integration synchronization
- Reporting and export

### Persistence

- Neon PostgreSQL as the system of record
- Cloudflare R2 for files and generated documents
- Cloudflare Queues for asynchronous work
- Immutable webhook inbox and audit history

## Module Boundaries

```text
identity
organizations
permissions
crm
sales
service
scheduling
catalog
invoicing
payments
accounting
banking
reporting
automations
documents
integrations
customization
administration
audit
```

Modules may share IDs and application contracts, but financial posting stays inside the accounting boundary.

## Accounting Provider Strategy

`AccountingProvider` is the CRM-facing contract.

- `ClearKeyAccountingProvider` posts into the proprietary ledger.
- `QuickBooksProvider` maps and synchronizes supported entities through Intuit OAuth and APIs.
- The active provider is selected at organization level.
- Provider changes require explicit migration and reconciliation workflows.
- Persistent external mappings prevent duplicate creation.

## Stripe Strategy

Two distinct systems are maintained:

1. Stripe Billing for ClearKey subscriptions.
2. Stripe Connect for organizations collecting customer payments.

New connected accounts use Accounts v2 and explicit controller responsibilities. Customer payments use one consistent destination-charge model. Webhooks are signature verified, persisted idempotently, and processed asynchronously.

## Customization

Each organization receives a structured theme:

- Logo and favicon
- Primary, accent, surface, background, and text colors
- Heading and body fonts
- Density and radius
- Dark mode
- Navigation configuration
- Reorderable page blocks
- Endpoint-specific content
- Restricted custom CSS

Customization is resolved server-side and converted to CSS variables. Uploaded CSS must be sanitized and cannot override security UI, payment provider elements, or legal disclosures.
