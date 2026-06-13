import "server-only";

import { calculateOrganizationPrice } from "@/lib/billing/pricing";
import { getDb } from "@/lib/db";

const money = (value: unknown) => Number(value ?? 0);
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export async function getOrganization(slug: string) {
  return getDb().organization.findUnique({
    where: { slug },
    include: { theme: true, domains: { orderBy: { isPrimary: "desc" } } },
  });
}

export async function getWorkspaceDashboard(slug: string) {
  const db = getDb();
  const organization = await db.organization.findUnique({ where: { slug } });
  if (!organization) return null;
  const organizationId = organization.id;
  const [openDeals, invoices, tasks, leads, activity, bankAccounts, payroll] = await Promise.all([
    db.deal.findMany({ where: { organizationId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, orderBy: { amount: "desc" }, take: 5, include: { account: true } }),
    db.invoice.findMany({ where: { organizationId }, orderBy: { dueDate: "asc" }, take: 8, include: { account: true } }),
    db.task.findMany({ where: { organizationId, status: { not: "COMPLETED" } }, orderBy: { dueAt: "asc" }, take: 6 }),
    db.lead.count({ where: { organizationId, status: "NEW" } }),
    db.activity.findMany({ where: { organizationId }, orderBy: { occurredAt: "desc" }, take: 6 }),
    db.bankAccount.findMany({ where: { organizationId } }),
    db.payrollRun.findFirst({ where: { organizationId }, orderBy: { checkDate: "desc" } }),
  ]);
  const pipeline = openDeals.reduce((sum, deal) => sum + money(deal.amount), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + money(invoice.balanceDue), 0);
  const collected = invoices.reduce((sum, invoice) => sum + money(invoice.amountPaid), 0);
  return {
    organization,
    stats: { pipeline, outstanding, collected, newLeads: leads, cash: bankAccounts.reduce((sum, account) => sum + money(account.bookBalance), 0) },
    openDeals: openDeals.map((deal) => ({ id: deal.id, name: deal.name, account: deal.account?.name ?? "Unassigned", amount: money(deal.amount), stage: deal.stage, probability: deal.probability })),
    invoices: invoices.map((invoice) => ({ id: invoice.id, number: invoice.invoiceNumber, customer: invoice.account?.name ?? "Direct customer", status: invoice.status, dueDate: iso(invoice.dueDate), balance: money(invoice.balanceDue) })),
    tasks: tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, dueAt: iso(task.dueAt), relatedType: task.relatedType })),
    activity: activity.map((item) => ({ id: item.id, type: item.type, subject: item.subject, occurredAt: iso(item.occurredAt) })),
    payroll: payroll ? { status: payroll.status, checkDate: iso(payroll.checkDate), grossPay: money(payroll.grossPay), employerCost: money(payroll.totalEmployerCost) } : null,
  };
}

export async function getModuleData(slug: string, module: string) {
  const db = getDb();
  const organization = await db.organization.findUnique({ where: { slug } });
  if (!organization) return null;
  const organizationId = organization.id;

  switch (module) {
    case "billing": {
      const pricing = await calculateOrganizationPrice(organizationId);
      return {
        kind: "billing",
        pricing,
        records: pricing.lines.map((line) => ({ id: line.key, name: line.label, quantity: line.quantity, unitPrice: line.unitAmountCents / 100, total: line.amountCents / 100 })),
        metrics: [
          { label: "Monthly total", value: pricing.totalCents / 100, format: "currency" },
          { label: "Licensed users", value: pricing.licensedUsers },
          { label: "Billing tier", value: pricing.tier === "starter" ? 1 : pricing.tier === "growth" ? 2 : 3, suffix: ` - ${pricing.tier}` },
        ],
      };
    }
    case "websites": {
      const records = await db.website.findMany({ where: { organizationId }, include: { pages: true }, orderBy: { updatedAt: "desc" } });
      return {
        kind: "websites",
        records: records.map((website) => ({ id: website.id, name: website.slug, hostname: website.defaultHostname, status: website.status, pages: website.pages.length, publishedAt: iso(website.publishedAt), updatedAt: iso(website.updatedAt) })),
        metrics: [{ label: "Websites", value: records.length }, { label: "Published", value: records.filter((website) => website.status === "PUBLISHED").length }, { label: "Pages", value: records.reduce((sum, website) => sum + website.pages.length, 0) }],
      };
    }
    case "domains": {
      const records = await db.organizationDomain.findMany({ where: { organizationId }, include: { dnsRecords: true }, orderBy: { isPrimary: "desc" } });
      return {
        kind: "domains",
        records: records.map((domain) => ({ id: domain.id, hostname: domain.hostname, type: domain.kind, status: domain.status, ssl: domain.sslEnabled, dnsRecords: domain.dnsRecords.length, healthyRecords: domain.dnsRecords.filter((record) => record.status === "HEALTHY").length, updatedAt: iso(domain.updatedAt) })),
        metrics: [{ label: "Domains", value: records.length }, { label: "Verified", value: records.filter((domain) => domain.status === "VERIFIED").length }, { label: "SSL enabled", value: records.filter((domain) => domain.sslEnabled).length }, { label: "DNS needs attention", value: records.flatMap((domain) => domain.dnsRecords).filter((record) => record.status !== "HEALTHY").length }],
      };
    }
    case "leads": {
      const records = await db.lead.findMany({ where: { organizationId }, orderBy: [{ score: "desc" }, { createdAt: "desc" }] });
      return { kind: "leads", records: records.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName ?? ""}`.trim(), company: r.company, status: r.status, source: r.source, score: r.score, value: money(r.estimatedValue), email: r.email })), metrics: [{ label: "New", value: records.filter((r) => r.status === "NEW").length }, { label: "Qualified", value: records.filter((r) => r.status === "QUALIFIED").length }, { label: "Pipeline value", value: records.reduce((s, r) => s + money(r.estimatedValue), 0), format: "currency" }, { label: "Average score", value: Math.round(records.reduce((s, r) => s + r.score, 0) / Math.max(1, records.length)) }] };
    }
    case "accounts": {
      const records = await db.crmAccount.findMany({ where: { organizationId }, include: { contacts: true, deals: true, invoices: true }, orderBy: { name: "asc" } });
      return { kind: "accounts", records: records.map((r) => ({ id: r.id, name: r.name, type: r.accountType, industry: r.industry, contacts: r.contacts.length, pipeline: r.deals.reduce((s, d) => s + money(d.amount), 0), receivable: r.invoices.reduce((s, i) => s + money(i.balanceDue), 0) })), metrics: [{ label: "Customers", value: records.filter((r) => r.accountType === "CUSTOMER").length }, { label: "Prospects", value: records.filter((r) => r.accountType === "PROSPECT").length }, { label: "Total pipeline", value: records.flatMap((r) => r.deals).reduce((s, d) => s + money(d.amount), 0), format: "currency" }] };
    }
    case "contacts": {
      const records = await db.contact.findMany({ where: { organizationId }, include: { account: true }, orderBy: { firstName: "asc" } });
      return { kind: "contacts", records: records.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName ?? ""}`.trim(), account: r.account?.name, title: r.jobTitle, email: r.email, phone: r.phone, lifecycle: r.lifecycleStatus, preferred: r.preferredContactMethod })), metrics: [{ label: "Total contacts", value: records.length }, { label: "Customers", value: records.filter((r) => r.lifecycleStatus === "CUSTOMER").length }, { label: "Emailable", value: records.filter((r) => r.email && !r.emailOptOut).length }] };
    }
    case "deals": {
      const records = await db.deal.findMany({ where: { organizationId }, include: { account: true, primaryContact: true }, orderBy: { expectedCloseDate: "asc" } });
      return { kind: "deals", records: records.map((r) => ({ id: r.id, name: r.name, account: r.account?.name, contact: r.primaryContact ? `${r.primaryContact.firstName} ${r.primaryContact.lastName ?? ""}` : null, stage: r.stage, amount: money(r.amount), probability: r.probability, closeDate: iso(r.expectedCloseDate), nextStep: r.nextStep })), metrics: [{ label: "Open pipeline", value: records.filter((r) => !r.stage.startsWith("CLOSED")).reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Weighted forecast", value: records.reduce((s, r) => s + money(r.amount) * r.probability / 100, 0), format: "currency" }, { label: "Open deals", value: records.filter((r) => !r.stage.startsWith("CLOSED")).length }] };
    }
    case "cases": {
      const records = await db.supportCase.findMany({ where: { organizationId }, include: { account: true, contact: true }, orderBy: { updatedAt: "desc" } });
      return { kind: "cases", records: records.map((r) => ({ id: r.id, number: r.caseNumber, subject: r.subject, customer: r.account?.name, contact: r.contact ? `${r.contact.firstName} ${r.contact.lastName ?? ""}` : null, priority: r.priority, status: r.status, updatedAt: iso(r.updatedAt) })), metrics: [{ label: "Open", value: records.filter((r) => r.status !== "CLOSED").length }, { label: "High priority", value: records.filter((r) => r.priority === "HIGH").length }, { label: "Resolved", value: records.filter((r) => r.status === "CLOSED").length }] };
    }
    case "campaigns": {
      const records = await db.campaign.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
      return { kind: "campaigns", records: records.map((r) => ({ id: r.id, name: r.name, type: r.type, status: r.status, members: r.memberCount, responses: r.responseCount, conversions: r.conversionCount, startsAt: iso(r.startsAt) })), metrics: [{ label: "Active campaigns", value: records.filter((r) => r.status === "ACTIVE").length }, { label: "Audience reached", value: records.reduce((s, r) => s + r.memberCount, 0) }, { label: "Conversions", value: records.reduce((s, r) => s + r.conversionCount, 0) }] };
    }
    case "tasks": {
      const records = await db.task.findMany({ where: { organizationId }, orderBy: { dueAt: "asc" } });
      return { kind: "tasks", records: records.map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, dueAt: iso(r.dueAt), relatedType: r.relatedType })), metrics: [{ label: "Open", value: records.filter((r) => r.status === "OPEN").length }, { label: "Overdue", value: records.filter((r) => r.dueAt && r.dueAt < new Date() && r.status !== "COMPLETED").length }, { label: "Completed", value: records.filter((r) => r.status === "COMPLETED").length }] };
    }
    case "calendar": {
      const records = await db.calendarEvent.findMany({ where: { organizationId }, orderBy: { startsAt: "asc" } });
      return { kind: "calendar", records: records.map((r) => ({ id: r.id, title: r.title, type: r.eventType, startsAt: iso(r.startsAt), endsAt: iso(r.endsAt), location: r.location, status: r.status })), metrics: [{ label: "Upcoming", value: records.filter((r) => r.startsAt >= new Date()).length }, { label: "Meetings", value: records.filter((r) => r.eventType === "MEETING").length }] };
    }
    case "reports": {
      const [deals, invoices, expenses, payroll, accounts] = await Promise.all([
        db.deal.findMany({ where: { organizationId } }),
        db.invoice.findMany({ where: { organizationId } }),
        db.expense.findMany({ where: { organizationId } }),
        db.payrollRun.findMany({ where: { organizationId, status: "COMPLETED" } }),
        db.crmAccount.findMany({ where: { organizationId }, include: { invoices: true } }),
      ]);
      const revenue = invoices.reduce((sum, item) => sum + money(item.amountPaid), 0);
      const operatingExpense = expenses.reduce((sum, item) => sum + money(item.amount), 0);
      const payrollExpense = payroll.reduce((sum, item) => sum + money(item.totalEmployerCost), 0);
      return {
        kind: "reports",
        records: [
          { name: "Profit & loss", category: "Financial", value: revenue - operatingExpense - payrollExpense, period: "Current period", status: "Ready" },
          { name: "Accounts receivable aging", category: "Financial", value: invoices.reduce((sum, item) => sum + money(item.balanceDue), 0), period: "As of today", status: "Ready" },
          { name: "Sales pipeline forecast", category: "Sales", value: deals.reduce((sum, item) => sum + money(item.amount) * item.probability / 100, 0), period: "Open pipeline", status: "Ready" },
          { name: "Customer revenue", category: "CRM", value: accounts.reduce((sum, account) => sum + account.invoices.reduce((inner, invoice) => inner + money(invoice.amountPaid), 0), 0), period: "Lifetime", status: "Ready" },
        ],
        metrics: [{ label: "Revenue", value: revenue, format: "currency" }, { label: "Operating expense", value: operatingExpense, format: "currency" }, { label: "Payroll expense", value: payrollExpense, format: "currency" }, { label: "Net operating result", value: revenue - operatingExpense - payrollExpense, format: "currency" }],
      };
    }
    case "invoices": {
      const records = await db.invoice.findMany({ where: { organizationId }, include: { account: true, items: true }, orderBy: { issueDate: "desc" } });
      return { kind: "invoices", records: records.map((r) => ({ id: r.id, number: r.invoiceNumber, customer: r.account?.name, status: r.status, issueDate: iso(r.issueDate), dueDate: iso(r.dueDate), total: money(r.total), paid: money(r.amountPaid), balance: money(r.balanceDue), items: r.items.length })), metrics: [{ label: "Receivables", value: records.reduce((s, r) => s + money(r.balanceDue), 0), format: "currency" }, { label: "Collected", value: records.reduce((s, r) => s + money(r.amountPaid), 0), format: "currency" }, { label: "Overdue", value: records.filter((r) => r.status === "OVERDUE" || (r.balanceDue.greaterThan(0) && r.dueDate < new Date())).length }] };
    }
    case "payments": {
      const records = await db.payment.findMany({ where: { organizationId }, include: { allocations: { include: { invoice: true } } }, orderBy: { receivedAt: "desc" } });
      return { kind: "payments", records: records.map((r) => ({ id: r.id, reference: r.referenceNumber, status: r.status, method: r.method, amount: money(r.amount), receivedAt: iso(r.receivedAt), invoices: r.allocations.map((a) => a.invoice.invoiceNumber).join(", ") })), metrics: [{ label: "Received", value: records.filter((r) => r.status === "SUCCEEDED").reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Successful", value: records.filter((r) => r.status === "SUCCEEDED").length }, { label: "Failed", value: records.filter((r) => r.status === "FAILED").length }] };
    }
    case "expenses": {
      const records = await db.expense.findMany({ where: { organizationId }, include: { vendor: true }, orderBy: { incurredAt: "desc" } });
      return { kind: "expenses", records: records.map((r) => ({ id: r.id, description: r.description, vendor: r.vendor?.name, category: r.category, amount: money(r.amount), incurredAt: iso(r.incurredAt), posted: Boolean(r.postedJournalId) })), metrics: [{ label: "This period", value: records.reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Transactions", value: records.length }, { label: "Needs posting", value: records.filter((r) => !r.postedJournalId).length }] };
    }
    case "vendors": {
      const records = await db.vendor.findMany({ where: { organizationId }, include: { bills: true }, orderBy: { name: "asc" } });
      return { kind: "vendors", records: records.map((r) => ({ id: r.id, name: r.name, email: r.email, eligible1099: r.eligible1099, openBills: r.bills.filter((b) => b.status !== "PAID").length, balance: r.bills.reduce((s, b) => s + money(b.total) - money(b.amountPaid), 0) })), metrics: [{ label: "Open payables", value: records.flatMap((r) => r.bills).reduce((s, b) => s + money(b.total) - money(b.amountPaid), 0), format: "currency" }, { label: "Vendors", value: records.length }, { label: "1099 eligible", value: records.filter((r) => r.eligible1099).length }] };
    }
    case "accounting": {
      const [entries, accounts] = await Promise.all([db.journalEntry.findMany({ where: { organizationId }, include: { lines: true }, orderBy: { entryDate: "desc" } }), db.ledgerAccount.findMany({ where: { organizationId }, include: { lines: true }, orderBy: { code: "asc" } })]);
      return { kind: "accounting", records: entries.map((r) => ({ id: r.id, number: r.entryNumber, date: iso(r.entryDate), description: r.description, source: r.sourceModule, status: r.status, debit: r.lines.reduce((s, l) => s + money(l.debit), 0), credit: r.lines.reduce((s, l) => s + money(l.credit), 0) })), accounts: accounts.map((r) => ({ code: r.code, name: r.name, type: r.type, balance: r.lines.reduce((s, l) => s + money(l.debit) - money(l.credit), 0) })), metrics: [{ label: "Posted entries", value: entries.filter((r) => r.status === "POSTED").length }, { label: "Draft entries", value: entries.filter((r) => r.status === "DRAFT").length }, { label: "Chart accounts", value: accounts.length }] };
    }
    case "banking": {
      const records = await db.bankAccount.findMany({ where: { organizationId }, include: { transactions: { orderBy: { postedAt: "desc" } } } });
      return { kind: "banking", records: records.map((r) => ({ id: r.id, institution: r.institutionName, name: r.accountName, type: r.accountType, mask: r.mask, bookBalance: money(r.bookBalance), availableBalance: money(r.availableBalance), status: r.connectionStatus, lastSyncAt: iso(r.lastSyncedAt), transactions: r.transactions.map((t) => ({ id: t.id, date: iso(t.postedAt), description: t.description, amount: money(t.amount), status: t.status, category: t.category })) })), metrics: [{ label: "Book balance", value: records.reduce((s, r) => s + money(r.bookBalance), 0), format: "currency" }, { label: "Available", value: records.reduce((s, r) => s + money(r.availableBalance), 0), format: "currency" }, { label: "Needs review", value: records.flatMap((r) => r.transactions).filter((t) => t.status !== "MATCHED").length }] };
    }
    case "products": {
      const records = await db.product.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
      return { kind: "products", records: records.map((r) => ({ id: r.id, sku: r.sku, name: r.name, type: r.type, price: money(r.price), cost: money(r.cost), margin: money(r.price) - money(r.cost), onHand: money(r.quantityOnHand), active: r.active })), metrics: [{ label: "Active offerings", value: records.filter((r) => r.active).length }, { label: "Catalog value", value: records.reduce((s, r) => s + money(r.price), 0), format: "currency" }, { label: "Inventory value", value: records.reduce((s, r) => s + money(r.quantityOnHand) * money(r.cost), 0), format: "currency" }] };
    }
    case "payroll": {
      const [connection, employees, runs, time, timeOff] = await Promise.all([db.payrollConnection.findUnique({ where: { organizationId } }), db.employee.findMany({ where: { organizationId }, include: { department: true, compensations: { orderBy: { effectiveFrom: "desc" }, take: 1 } } }), db.payrollRun.findMany({ where: { organizationId }, orderBy: { checkDate: "desc" } }), db.timeEntry.findMany({ where: { organizationId }, include: { employee: true }, orderBy: { workDate: "desc" } }), db.timeOffRequest.findMany({ where: { organizationId }, include: { employee: true }, orderBy: { startsOn: "asc" } })]);
      return { kind: "payroll", connection: connection ? { provider: connection.provider, mode: connection.mode, status: connection.status, lastSyncAt: iso(connection.lastSyncAt) } : null, employees: employees.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, number: r.employeeNumber, department: r.department?.name, title: r.jobTitle, status: r.status, compensation: money(r.compensations[0]?.rate), schedule: r.compensations[0]?.paySchedule })), runs: runs.map((r) => ({ id: r.id, period: `${r.payPeriodStart.toLocaleDateString()} – ${r.payPeriodEnd.toLocaleDateString()}`, checkDate: iso(r.checkDate), status: r.status, grossPay: money(r.grossPay), netPay: money(r.netPay), employerCost: money(r.totalEmployerCost) })), time: time.map((r) => ({ employee: `${r.employee.firstName} ${r.employee.lastName}`, date: iso(r.workDate), regular: money(r.regularHours), overtime: money(r.overtimeHours), status: r.status })), timeOff: timeOff.map((r) => ({ employee: `${r.employee.firstName} ${r.employee.lastName}`, type: r.policyType, startsOn: iso(r.startsOn), endsOn: iso(r.endsOn), hours: money(r.hours), status: r.status })), metrics: [{ label: "Active employees", value: employees.filter((r) => r.status === "ACTIVE").length }, { label: "Next gross payroll", value: money(runs[0]?.grossPay), format: "currency" }, { label: "Employer cost", value: money(runs[0]?.totalEmployerCost), format: "currency" }, { label: "Time awaiting approval", value: time.filter((r) => r.status === "SUBMITTED").reduce((s, r) => s + money(r.regularHours) + money(r.overtimeHours), 0), suffix: " hrs" }] };
    }
    case "integrations": {
      const records = await db.integration.findMany({ where: { organizationId }, include: { syncRuns: { orderBy: { startedAt: "desc" }, take: 1 } }, orderBy: { provider: "asc" } });
      return { kind: "integrations", records: records.map((r) => ({ id: r.id, provider: r.provider, status: r.status, direction: r.syncDirection, lastSyncAt: iso(r.lastSyncAt), lastError: r.lastError, lastRun: r.syncRuns[0]?.status })), metrics: [{ label: "Connected", value: records.filter((r) => r.status === "ACTIVE").length }, { label: "Needs attention", value: records.filter((r) => ["ERROR", "REAUTH_REQUIRED"].includes(r.status)).length }] };
    }
    case "automations": {
      const records = await db.automationRule.findMany({ where: { organizationId }, include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } }, orderBy: { name: "asc" } });
      return { kind: "automations", records: records.map((r) => ({ id: r.id, name: r.name, trigger: r.triggerType, active: r.active, lastRunAt: iso(r.lastRunAt), runs: r.runs.length, failures: r.runs.filter((run) => run.status === "FAILED").length })), metrics: [{ label: "Active rules", value: records.filter((r) => r.active).length }, { label: "Recent runs", value: records.reduce((s, r) => s + r.runs.length, 0) }, { label: "Failures", value: records.flatMap((r) => r.runs).filter((r) => r.status === "FAILED").length }] };
    }
    case "email": {
      const [templates, messages] = await Promise.all([db.emailTemplate.findMany({ where: { organizationId } }), db.emailMessage.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } })]);
      return { kind: "email", templates: templates.map((r) => ({ id: r.id, name: r.name, subject: r.subject, category: r.category, active: r.active })), records: messages.map((r) => ({ id: r.id, recipient: r.recipientName ?? r.recipientEmail, email: r.recipientEmail, subject: r.subject, status: r.status, sentAt: iso(r.sentAt), error: r.lastError })), metrics: [{ label: "Delivered", value: messages.filter((r) => r.status === "DELIVERED").length }, { label: "Queued", value: messages.filter((r) => r.status === "QUEUED").length }, { label: "Templates", value: templates.length }] };
    }
    case "notifications": {
      const records = await db.notification.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
      return { kind: "notifications", records: records.map((r) => ({ id: r.id, title: r.title, body: r.body, type: r.type, actionUrl: r.actionUrl, read: Boolean(r.readAt), createdAt: iso(r.createdAt) })), metrics: [{ label: "Unread", value: records.filter((r) => !r.readAt).length }, { label: "Total", value: records.length }] };
    }
    case "audit": {
      const records = await db.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
      return { kind: "audit", records: records.map((r) => ({ id: r.id, sequence: r.sequence?.toString(), action: r.action, category: r.category, severity: r.severity, outcome: r.outcome, entity: r.entityType, entityId: r.entityId, requestId: r.requestId, recordHash: r.recordHash, createdAt: iso(r.createdAt) })), metrics: [{ label: "Events", value: records.length }, { label: "Security events", value: records.filter((r) => r.category === "SECURITY").length }, { label: "Failures", value: records.filter((r) => r.outcome === "FAILURE").length }] };
    }
    case "team": {
      const records = await db.organizationMembership.findMany({ where: { organizationId }, include: { user: true }, orderBy: { role: "asc" } });
      return { kind: "team", records: records.map((r) => ({ id: r.id, name: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email, email: r.user.email, role: r.role, permissions: r.permissions, platformAdmin: r.user.platformAdmin, joinedAt: iso(r.createdAt) })), metrics: [{ label: "Members", value: records.length }, { label: "Admins", value: records.filter((r) => ["OWNER", "ADMIN"].includes(r.role)).length }] };
    }
    case "settings": {
      const [theme, domains, customFields] = await Promise.all([
        db.organizationTheme.findUnique({ where: { organizationId } }),
        db.organizationDomain.findMany({ where: { organizationId }, orderBy: { isPrimary: "desc" } }),
        db.customFieldDefinition.findMany({ where: { organizationId }, orderBy: [{ objectType: "asc" }, { sortOrder: "asc" }] }),
      ]);
      return { kind: "settings", records: [
        { name: "Legal name", value: organization.legalName, scope: "Organization", status: "Configured" },
        { name: "Timezone", value: organization.timezone, scope: "Organization", status: "Configured" },
        { name: "Currency", value: organization.defaultCurrency, scope: "Accounting", status: "Configured" },
        { name: "Accounting provider", value: organization.accountingProvider, scope: "Accounting", status: "Configured" },
        { name: "Primary domain", value: domains[0]?.hostname, scope: "Endpoint", status: domains[0]?.status ?? "Missing" },
        { name: "Endpoint theme", value: `${theme?.headingFont ?? "Default"} / ${theme?.bodyFont ?? "Default"}`, scope: "Appearance", status: theme ? "Configured" : "Missing" },
        { name: "Custom fields", value: String(customFields.length), scope: "CRM", status: "Configured" },
      ], metrics: [{ label: "Verified domains", value: domains.filter((domain) => domain.status === "VERIFIED").length }, { label: "Custom fields", value: customFields.length }, { label: "Endpoint versions", value: await db.endpointPage.count({ where: { organizationId } }) }] };
    }
    case "admin": {
      const records = await db.organization.findMany({ include: { memberships: true, integrations: true, _count: { select: { contacts: true, invoices: true, auditLogs: true } } }, orderBy: { createdAt: "desc" } });
      return { kind: "admin", records: records.map((item) => ({ id: item.id, name: item.name, status: item.status, plan: item.stripeSubscriptionStatus ?? "TRIAL", members: item.memberships.length, contacts: item._count.contacts, invoices: item._count.invoices, integrations: item.integrations.filter((integration) => integration.status === "ACTIVE").length, auditEvents: item._count.auditLogs })), metrics: [{ label: "Organizations", value: records.length }, { label: "Active tenants", value: records.filter((item) => item.status === "ACTIVE").length }, { label: "Connected providers", value: records.flatMap((item) => item.integrations).filter((integration) => integration.status === "ACTIVE").length }] };
    }
    case "tax-documents": {
      const records = await db.taxDocument.findMany({ where: { organizationId }, orderBy: [{ taxYear: "desc" }, { generatedAt: "desc" }] });
      return { kind: "tax-documents", records: records.map((r) => ({ id: r.id, type: r.documentType, year: r.taxYear, status: r.status, provider: r.provider, version: r.version, generatedAt: iso(r.generatedAt), submittedAt: iso(r.submittedAt) })), metrics: [{ label: "Drafts", value: records.filter((r) => r.status === "DRAFT").length }, { label: "Filed", value: records.filter((r) => r.status === "FILED").length }] };
    }
    case "documents": {
      const records = await db.storedFile.findMany({ where: { organizationId, deletedAt: null }, orderBy: { createdAt: "desc" } });
      return { kind: "documents", records: records.map((r) => ({ id: r.id, name: r.fileName, type: r.contentType, size: Number(r.sizeBytes), relatedType: r.relatedType, createdAt: iso(r.createdAt) })), metrics: [{ label: "Documents", value: records.length }, { label: "Storage used", value: Math.round(records.reduce((s, r) => s + Number(r.sizeBytes), 0) / 1024 / 1024), suffix: " MB" }] };
    }
    default:
      return { kind: module, records: [], metrics: [] };
  }
}

export async function getPublishedEndpoint(slug: string, pageSlug = "home") {
  const db = getDb();
  return db.organization.findUnique({
    where: { slug },
    include: {
      theme: true,
      domains: { where: { status: "VERIFIED" }, orderBy: { isPrimary: "desc" } },
      endpointPages: { where: { slug: pageSlug, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 },
    },
  });
}
