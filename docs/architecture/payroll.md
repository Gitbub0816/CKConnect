# Payroll Architecture

ClearKey Connect owns employee records, compensation history, departments, time tracking, PTO, approvals, payroll history, reporting, and general-ledger posting.

ClearKey Connect initially delegates regulated payroll execution to specialized providers:

- **Check** for an embedded, native ClearKey Payroll experience.
- **Finch** for OAuth connections to an organization's existing payroll provider.

ClearKey does not initially calculate or remit payroll taxes, process direct deposits, collect W-4 data, file W-2/940/941 forms, or process garnishments.

## Provider Boundary

The frontend calls ClearKey application services only. Provider tokens and provider APIs remain server-side behind `PayrollProvider`.

```text
Payroll UI
  -> Payroll application service
  -> PayrollProvider
     -> CheckPayrollProvider
     -> FinchPayrollProvider
```

Provider access and refresh tokens are encrypted before storage. ClearKey never requests provider passwords or MFA codes.

## Accounting Posting

Completed payroll runs create balanced journal entries using consistent ClearKey account mappings regardless of provider:

```text
Debit  Payroll expense
Debit  Employer payroll tax expense
Credit Cash / payroll clearing
Credit Payroll tax liability
Credit Employee withholding liability
Credit Benefit and deduction liabilities
```

Provider data is snapshotted on the payroll run before posting. Posted entries remain immutable and corrections use reversals.

## Synchronization

Synchronization runs on initial connection, nightly, on manual sync, and from validated provider webhooks. For connected providers, the provider remains the source of truth. Incoming changes update ClearKey records and produce audit events.
