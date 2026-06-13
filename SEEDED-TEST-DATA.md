# Seeded Test Data

This guide describes the deterministic demo data created by `npm run db:seed`. Dates are generated relative to the day the seed runs, so calendar, due-date, payroll, and aging values move with the seed date.

> Warning: the seed replaces the three demo organizations below. Do not run it against a database containing valuable data under these slugs.

## Test Owner

- Email: `1morecruise@gmail.com`
- Role: platform administrator and owner of all three demo organizations
- Clerk linkage: the seed uses `seed_caleb_owner`; a real Clerk user or organization must be linked before testing authenticated production access

## Organizations

| Organization | Slug | Code | Plan | Primary site | Portal |
| --- | --- | --- | --- | --- | --- |
| Northstar Home Services | `northstar-home-services` | `NORTHSTAR` | Starter, 12 licensed users | `northstar-home-services.cksites.dev` | `/p/northstar-home-services` |
| Brightline Studio | `brightline-studio` | `BRIGHTLN` | Starter, 7 licensed users | `brightline-studio.cksites.dev` | `/p/brightline-studio` |
| Harbor Dental Group | `harbor-dental-group` | `HARBORDG` | Growth, 54 licensed users | `harbor-dental-group.cksites.dev` | `/p/harbor-dental-group` |

Each organization has a second seeded portal hostname at `<slug>.connect.clearkey.solutions`, a published endpoint page, and a published one-page website with organization-specific branding and content.

## Records Per Organization

Each tenant starts with:

- 2 CRM accounts: one customer and one prospect
- 2 contacts linked to those accounts
- 3 leads with scores `82`, `64`, and `91`
- 2 open deals with proposal and qualification stages
- 2 open tasks
- 1 in-progress support case linked to the customer and contact
- 1 active email campaign with response and conversion history
- 2 calendar events
- 2 products or services
- 1 partially paid invoice with 2 line items
- 1 successful payment allocated to that invoice
- 1 vendor, 1 open bill, and 2 expenses
- 4 ledger accounts and 1 posted invoice journal
- 1 connected bank account with 1 matched deposit and 1 debit awaiting review
- 1 department and 1 active employee with compensation
- 1 submitted time entry
- 1 pending PTO request for 16 hours
- 1 payroll run awaiting approval
- Stripe, QuickBooks, and PostHog integration records
- 1 overdue-invoice automation
- 1 billing email template and 1 delivered invoice email
- 1 action-required payroll notification
- 1 genesis audit event and audit-chain head

Northstar additionally has three managed mailbox records:

- `owner@northstar.example`
- `billing@northstar.example`
- `dispatch@northstar.example`

## Public Payment Pages

| Organization | Seeded payment URL |
| --- | --- |
| Northstar | `/pay/seed-northstar-home-services-invoice` |
| Brightline | `/pay/seed-brightline-studio-invoice` |
| Harbor Dental | `/pay/seed-harbor-dental-group-invoice` |

The invoices are partially paid and retain an outstanding balance, which makes collection and Stripe Checkout testing possible.

## Recommended End-to-End Tests

### Lead to Cash

1. Open **Leads** and convert the score-91 lead with opportunity creation enabled.
2. Open **Accounts** and confirm the account/contact/deal relationship.
3. Move the new deal through stages and close it as won.
4. Open **Invoices** and confirm a linked draft invoice was created.
5. Post and send the invoice.
6. Confirm the receivable and revenue journal in **Accounting**, the queued message in **Email**, and the new audit events in **Audit**.

### Service Case

1. Open **Cases**.
2. Move the seeded case to `WAITING_CUSTOMER`.
3. Add a resolution and move it to `RESOLVED` or `CLOSED`.
4. Confirm the case state, account 360 history, and audit event.

### Campaign and Email

1. Open **Campaigns**.
2. Pause the seeded active campaign.
3. Select customers or prospects, enter a subject and message, and launch the campaign.
4. Open **Email** and confirm one queued or configuration-pending message per eligible contact.
5. Pause or complete the campaign and verify its status.

### Calendar to Task

1. Open **Calendar**.
2. Add a follow-up commitment to a seeded meeting.
3. Open **Tasks** and complete the generated task.
4. Return to **Calendar** and complete or cancel the event.

### Banking to Ledger

1. Open **Banking**.
2. Resolve the unmatched vendor debit as an expense.
3. Confirm the new expense, posted journal, matched bank transaction, and audit event.

### Payroll Approval

1. Open **Payroll**.
2. Approve the submitted time entry.
3. Approve or deny the pending PTO request.
4. Approve the payroll run.
5. Submit the approved run to the seeded provider connection.
6. Confirm the status changes and financial audit events.

### Tenant Controls

1. Open **Settings** and change console/payment branding.
2. Disable a module and confirm it disappears from navigation and cannot be opened directly.
3. Open **Team** and change a member's granular permissions while retaining at least one owner.
4. Open **Appearance** and publish a public portal variation.

### Website, DNS, and Reports

1. Open **Websites**, change blocks and SEO, then publish.
2. Open the seeded `cksites.dev` hostname and confirm the published content.
3. Open **Domains** and run live DNS validation.
4. Open **Reports**, build a grouped invoice or deal report, save it, and confirm the rendered result.

## Environment-Dependent Results

- Without `MAILERSEND_API_KEY`, new messages use `PENDING_CONFIGURATION`.
- Without valid Cloudflare Worker/KV/R2 credentials, website publication remains available in the app but edge-manifest mirroring and media storage do not run.
- Stripe payment and billing actions require the configured Stripe secret and webhook.
- Payroll submission records the authorized handoff; live provider execution requires the Check or Finch provider integration.
