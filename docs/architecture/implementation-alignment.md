# Implementation Alignment Notes

This codebase should follow the ClearKey Connect architecture references instead of growing by stacking one-off UI and API code into large files.

## Product Boundaries

- CRM follows a Salesforce-style object model: accounts, contacts, leads, deals, cases, campaigns, activities, notes, custom fields, saved views, automation, and reporting should be service-backed and tenant-scoped.
- Accounting follows a QuickBooks-style operating model: every posting path must preserve double-entry integrity, expose audit history, support imports/exports, and keep reports separate from transaction forms.
- Cloudflare-facing concerns belong in edge/domain/storage integration modules, not inside tenant UI components.
- Kira should use structured actions and permission-checked tools. Prompt text alone should not be used as the execution layer for financial, publishing, email, or security work.

## Code Organization Rules

- Route handlers should validate the request, authorize tenant access, call a service, and return a response.
- Server actions should orchestrate user intent, audit meaningful mutations, and revalidate affected app areas.
- Business rules belong in `src/lib/**` service modules.
- UI components should present workflows and call server actions; they should not own accounting math, integration protocols, import parsers, or report builders.
- Shared report/import/export definitions should be centralized so the Accounting page, Reports, Kira tools, and scheduled jobs do not drift.

## Current Cleanup Direction

- Spreadsheet export logic now lives in `src/lib/accounting/spreadsheet-export.ts`.
- The accounting export API route is intentionally thin.
- The ClearKey app icon is registered in app metadata and emitted as `src/app/icon.png`.

Future enrichment passes should keep moving stacked logic out of page/component files and into service modules with focused tests.
