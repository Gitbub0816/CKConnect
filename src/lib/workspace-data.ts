import "server-only";

import { calculateOrganizationPrice } from "@/lib/billing/pricing";
import { createCustomerWorkspaceToken } from "@/lib/customer-workspace-token";
import { getDb } from "@/lib/db";

const money = (value: unknown) => Number(value ?? 0);
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

type ReportDefinition = {
  dataset: "invoices" | "deals" | "expenses" | "customers";
  metric: "count" | "sum" | "average";
  valueField?: "total" | "balanceDue" | "amount" | "estimatedValue" | "annualRevenue";
  groupBy: "status" | "stage" | "source" | "industry" | "month" | "none";
  filterField: "status" | "stage" | "source" | "industry" | "none";
  filterValue?: string;
};

async function executeReportDefinition(organizationId: string, definition: ReportDefinition) {
  const db = getDb();
  let rows: Array<Record<string, unknown>>;
  if (definition.dataset === "invoices") rows = (await db.invoice.findMany({ where: { organizationId } })).map((row) => ({ status: row.status, total: money(row.total), balanceDue: money(row.balanceDue), month: row.issueDate.toISOString().slice(0, 7) }));
  else if (definition.dataset === "deals") rows = (await db.deal.findMany({ where: { organizationId } })).map((row) => ({ stage: row.stage, amount: money(row.amount), month: row.createdAt.toISOString().slice(0, 7) }));
  else if (definition.dataset === "expenses") rows = (await db.expense.findMany({ where: { organizationId } })).map((row) => ({ amount: money(row.amount), month: row.incurredAt.toISOString().slice(0, 7) }));
  else rows = (await db.crmAccount.findMany({ where: { organizationId } })).map((row) => ({ industry: row.industry ?? "Uncategorized", annualRevenue: money(row.annualRevenue), month: row.createdAt.toISOString().slice(0, 7) }));
  if (definition.filterField !== "none" && definition.filterValue) rows = rows.filter((row) => String(row[definition.filterField] ?? "").toLowerCase() === definition.filterValue!.toLowerCase());
  const groupKey = definition.groupBy;
  const groups = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const key = groupKey === "none" ? "All records" : String(row[groupKey] ?? "Uncategorized");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].map(([group, items]) => {
    const values = definition.valueField ? items.map((item) => Number(item[definition.valueField!] ?? 0)) : [];
    const value = definition.metric === "count" ? items.length : definition.metric === "average" ? values.reduce((sum, item) => sum + item, 0) / Math.max(1, values.length) : values.reduce((sum, item) => sum + item, 0);
    return { group, value, records: items.length };
  }).sort((a, b) => b.value - a.value);
}

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
  const [openDeals, invoices, tasks, leads, activity, bankAccounts, payroll, unmatchedBanking, automationFailures] = await Promise.all([
    db.deal.findMany({ where: { organizationId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, orderBy: { amount: "desc" }, take: 5, include: { account: true } }),
    db.invoice.findMany({ where: { organizationId }, orderBy: { dueDate: "asc" }, take: 8, include: { account: true } }),
    db.task.findMany({ where: { organizationId, status: { not: "COMPLETED" } }, orderBy: { dueAt: "asc" }, take: 6 }),
    db.lead.count({ where: { organizationId, status: "NEW" } }),
    db.activity.findMany({ where: { organizationId }, orderBy: { occurredAt: "desc" }, take: 6 }),
    db.bankAccount.findMany({ where: { organizationId } }),
    db.payrollRun.findFirst({ where: { organizationId }, orderBy: { checkDate: "desc" } }),
    db.bankTransaction.count({ where: { organizationId, status: { not: "MATCHED" } } }),
    db.automationRun.count({ where: { organizationId, status: "FAILED", startedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
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
    attention: [
      {
        key: "overdue-tasks",
        label: "Overdue tasks",
        count: tasks.filter((task) => task.dueAt && task.dueAt < new Date() && task.status !== "COMPLETED").length,
        severity: "high",
        module: "tasks",
        description: "Commitments that have passed their due date.",
      },
      {
        key: "at-risk-deals",
        label: "At-risk opportunities",
        count: openDeals.filter((deal) => (deal.expectedCloseDate && deal.expectedCloseDate < new Date()) || !deal.nextStep).length,
        severity: "high",
        module: "deals",
        description: "Open revenue without a current next step or valid close date.",
      },
      {
        key: "draft-invoices",
        label: "Draft invoices",
        count: invoices.filter((invoice) => invoice.status === "DRAFT").length,
        severity: "medium",
        module: "invoices",
        description: "Won or completed work that has not entered collections.",
      },
      {
        key: "unmatched-banking",
        label: "Bank feed review",
        count: unmatchedBanking,
        severity: "medium",
        module: "banking",
        description: "Imported transactions waiting for payment matching or ledger posting.",
      },
      {
        key: "automation-failures",
        label: "Automation failures",
        count: automationFailures,
        severity: "high",
        module: "automations",
        description: "Workflow executions that failed during the last seven days.",
      },
    ],
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
        websites: records.map((website) => ({ id: website.id, name: website.slug, hostname: website.defaultHostname, status: website.status, theme: website.themeJson, config: website.configJson, publishedAt: iso(website.publishedAt), updatedAt: iso(website.updatedAt), pages: website.pages.map((page) => ({ id: page.id, path: page.path, title: page.title, status: page.status, seo: page.seoJson, content: page.contentJson })) })),
        metrics: [{ label: "Websites", value: records.length }, { label: "Published", value: records.filter((website) => website.status === "PUBLISHED").length }, { label: "Pages", value: records.reduce((sum, website) => sum + website.pages.length, 0) }],
      };
    }
    case "domains": {
      const records = await db.organizationDomain.findMany({ where: { organizationId }, include: { dnsRecords: true }, orderBy: { isPrimary: "desc" } });
      return {
        kind: "domains",
        records: records.map((domain) => ({ id: domain.id, hostname: domain.hostname, type: domain.kind, status: domain.status, ssl: domain.sslEnabled, verificationName: `_clearkey.${domain.hostname}`, verificationToken: domain.verificationToken, checks: domain.dnsRecords.filter((record) => record.recordType === "HEALTH").map((record) => ({ key: record.name, value: record.value, status: record.status, checkedAt: iso(record.lastCheckedAt) })), dnsRecords: domain.dnsRecords.length, healthyRecords: domain.dnsRecords.filter((record) => record.status === "HEALTHY").length, updatedAt: iso(domain.updatedAt) })),
        metrics: [{ label: "Domains", value: records.length }, { label: "Verified", value: records.filter((domain) => domain.status === "VERIFIED").length }, { label: "SSL enabled", value: records.filter((domain) => domain.sslEnabled).length }, { label: "DNS needs attention", value: records.flatMap((domain) => domain.dnsRecords).filter((record) => record.status !== "HEALTHY").length }],
      };
    }
    case "leads": {
      const records = await db.lead.findMany({ where: { organizationId }, orderBy: [{ score: "desc" }, { createdAt: "desc" }] });
      return {
        kind: "leads",
        records: records.map((r) => ({
          id: r.id,
          name: `${r.firstName} ${r.lastName ?? ""}`.trim(),
          company: r.company,
          status: r.status,
          source: r.source,
          score: r.score,
          value: money(r.estimatedValue),
          email: r.email,
          phone: r.phone,
          priority: r.score >= 80 ? "HOT" : r.score >= 60 ? "WARM" : "NURTURE",
          recommendation: r.status === "CONVERTED" ? "Converted" : r.score >= 70 ? "Convert to opportunity" : "Complete qualification",
          createdAt: iso(r.createdAt),
        })),
        metrics: [{ label: "New", value: records.filter((r) => r.status === "NEW").length }, { label: "Qualified", value: records.filter((r) => r.status === "QUALIFIED").length }, { label: "Pipeline value", value: records.reduce((s, r) => s + money(r.estimatedValue), 0), format: "currency" }, { label: "Average score", value: Math.round(records.reduce((s, r) => s + r.score, 0) / Math.max(1, records.length)) }],
      };
    }
    case "accounts": {
      const records = await db.crmAccount.findMany({
        where: { organizationId },
        include: {
          contacts: true,
          deals: { orderBy: { updatedAt: "desc" } },
          invoices: { orderBy: { dueDate: "desc" } },
          cases: { orderBy: { updatedAt: "desc" } },
        },
        orderBy: { name: "asc" },
      });
      return {
        kind: "accounts",
        accounts: records.map((r) => {
          const receivable = r.invoices.reduce((s, i) => s + money(i.balanceDue), 0);
          const revenue = r.invoices.reduce((s, i) => s + money(i.amountPaid), 0);
          const openCases = r.cases.filter((item) => item.status !== "CLOSED").length;
          const openPipeline = r.deals.filter((deal) => !deal.stage.startsWith("CLOSED")).reduce((s, d) => s + money(d.amount), 0);
          const health = Math.max(0, 100 - openCases * 15 - (receivable > 0 ? 10 : 0) + (revenue > 0 ? 10 : 0));
          return {
            id: r.id,
            name: r.name,
            type: r.accountType,
            industry: r.industry,
            phone: r.phone,
            website: r.website,
            health,
            lifetimeValue: revenue,
            openPipeline,
            receivable,
            contacts: r.contacts.map((contact) => ({ id: contact.id, name: `${contact.firstName} ${contact.lastName ?? ""}`.trim(), title: contact.jobTitle, email: contact.email, phone: contact.phone })),
            deals: r.deals.map((deal) => ({ id: deal.id, name: deal.name, stage: deal.stage, amount: money(deal.amount), probability: deal.probability, nextStep: deal.nextStep })),
            invoices: r.invoices.map((invoice) => ({ id: invoice.id, number: invoice.invoiceNumber, status: invoice.status, total: money(invoice.total), balance: money(invoice.balanceDue), dueDate: iso(invoice.dueDate) })),
            cases: r.cases.map((item) => ({ id: item.id, number: item.caseNumber, subject: item.subject, status: item.status, priority: item.priority })),
          };
        }),
        metrics: [{ label: "Customers", value: records.filter((r) => r.accountType === "CUSTOMER").length }, { label: "Prospects", value: records.filter((r) => r.accountType === "PROSPECT").length }, { label: "Total pipeline", value: records.flatMap((r) => r.deals).reduce((s, d) => s + money(d.amount), 0), format: "currency" }, { label: "Customer receivables", value: records.flatMap((r) => r.invoices).reduce((s, i) => s + money(i.balanceDue), 0), format: "currency" }],
      };
    }
    case "contacts": {
      const records = await db.contact.findMany({ where: { organizationId }, include: { account: true }, orderBy: { firstName: "asc" } });
      return { kind: "contacts", records: records.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName ?? ""}`.trim(), account: r.account?.name, title: r.jobTitle, email: r.email, phone: r.phone, lifecycle: r.lifecycleStatus, preferred: r.preferredContactMethod })), metrics: [{ label: "Total contacts", value: records.length }, { label: "Customers", value: records.filter((r) => r.lifecycleStatus === "CUSTOMER").length }, { label: "Emailable", value: records.filter((r) => r.email && !r.emailOptOut).length }] };
    }
    case "deals": {
      const records = await db.deal.findMany({ where: { organizationId }, include: { account: true, primaryContact: true }, orderBy: { expectedCloseDate: "asc" } });
      return { kind: "deals", records: records.map((r) => {
        const daysToClose = r.expectedCloseDate ? Math.ceil((r.expectedCloseDate.getTime() - Date.now()) / 86_400_000) : null;
        return {
          id: r.id,
          name: r.name,
          account: r.account?.name,
          contact: r.primaryContact ? `${r.primaryContact.firstName} ${r.primaryContact.lastName ?? ""}` : null,
          stage: r.stage,
          amount: money(r.amount),
          probability: r.probability,
          closeDate: iso(r.expectedCloseDate),
          nextStep: r.nextStep,
          daysToClose,
          risk: !r.stage.startsWith("CLOSED") && (daysToClose !== null && daysToClose < 0) ? "PAST_DUE" : !r.nextStep ? "NO_NEXT_STEP" : "ON_TRACK",
        };
      }), metrics: [{ label: "Open pipeline", value: records.filter((r) => !r.stage.startsWith("CLOSED")).reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Weighted forecast", value: records.reduce((s, r) => s + money(r.amount) * r.probability / 100, 0), format: "currency" }, { label: "Open deals", value: records.filter((r) => !r.stage.startsWith("CLOSED")).length }, { label: "Won revenue", value: records.filter((r) => r.stage === "CLOSED_WON").reduce((s, r) => s + money(r.amount), 0), format: "currency" }] };
    }
    case "cases": {
      const records = await db.supportCase.findMany({ where: { organizationId }, include: { account: true, contact: true }, orderBy: { updatedAt: "desc" } });
      return { kind: "cases", records: records.map((r) => ({ id: r.id, number: r.caseNumber, subject: r.subject, description: r.description, customer: r.account?.name, contact: r.contact ? `${r.contact.firstName} ${r.contact.lastName ?? ""}` : null, priority: r.priority, status: r.status, resolution: r.resolution, ageHours: Math.max(1, Math.round((Date.now() - r.createdAt.getTime()) / 3_600_000)), updatedAt: iso(r.updatedAt) })), metrics: [{ label: "Open", value: records.filter((r) => r.status !== "CLOSED").length }, { label: "Waiting on customer", value: records.filter((r) => r.status === "WAITING_CUSTOMER").length }, { label: "High priority", value: records.filter((r) => ["HIGH", "URGENT"].includes(r.priority)).length }, { label: "Resolved", value: records.filter((r) => ["RESOLVED", "CLOSED"].includes(r.status)).length }] };
    }
    case "campaigns": {
      const records = await db.campaign.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
      return { kind: "campaigns", records: records.map((r) => ({ id: r.id, name: r.name, type: r.type, status: r.status, audience: (r.audienceJson as { segment?: string }).segment ?? "Legacy audience", members: r.memberCount, responses: r.responseCount, conversions: r.conversionCount, responseRate: r.memberCount ? r.responseCount / r.memberCount * 100 : 0, conversionRate: r.memberCount ? r.conversionCount / r.memberCount * 100 : 0, startsAt: iso(r.startsAt) })), metrics: [{ label: "Active campaigns", value: records.filter((r) => r.status === "ACTIVE").length }, { label: "Audience reached", value: records.reduce((s, r) => s + r.memberCount, 0) }, { label: "Responses", value: records.reduce((s, r) => s + r.responseCount, 0) }, { label: "Conversions", value: records.reduce((s, r) => s + r.conversionCount, 0) }] };
    }
    case "tasks": {
      const records = await db.task.findMany({ where: { organizationId }, orderBy: { dueAt: "asc" } });
      return { kind: "tasks", records: records.map((r) => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, dueAt: iso(r.dueAt), relatedType: r.relatedType })), metrics: [{ label: "Open", value: records.filter((r) => r.status === "OPEN").length }, { label: "Overdue", value: records.filter((r) => r.dueAt && r.dueAt < new Date() && r.status !== "COMPLETED").length }, { label: "Completed", value: records.filter((r) => r.status === "COMPLETED").length }] };
    }
    case "calendar": {
      const records = await db.calendarEvent.findMany({ where: { organizationId }, orderBy: { startsAt: "asc" } });
      return { kind: "calendar", records: records.map((r) => ({ id: r.id, title: r.title, type: r.eventType, startsAt: iso(r.startsAt), endsAt: iso(r.endsAt), timeRange: `${r.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${r.endsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`, location: r.location, attendees: Array.isArray(r.attendeeJson) ? r.attendeeJson.length : 0, status: r.status })), metrics: [{ label: "Upcoming", value: records.filter((r) => r.startsAt >= new Date() && r.status !== "CANCELED").length }, { label: "Meetings", value: records.filter((r) => r.eventType === "MEETING").length }, { label: "Completed", value: records.filter((r) => r.status === "COMPLETED").length }, { label: "Canceled", value: records.filter((r) => r.status === "CANCELED").length }] };
    }
    case "reports": {
      const [deals, invoices, expenses, payroll, accounts, savedViews] = await Promise.all([
        db.deal.findMany({ where: { organizationId } }),
        db.invoice.findMany({ where: { organizationId } }),
        db.expense.findMany({ where: { organizationId } }),
        db.payrollRun.findMany({ where: { organizationId, status: "COMPLETED" } }),
        db.crmAccount.findMany({ where: { organizationId }, include: { invoices: true } }),
        db.savedView.findMany({ where: { organizationId, module: "reports" }, orderBy: { updatedAt: "desc" } }),
      ]);
      const revenue = invoices.reduce((sum, item) => sum + money(item.amountPaid), 0);
      const operatingExpense = expenses.reduce((sum, item) => sum + money(item.amount), 0);
      const payrollExpense = payroll.reduce((sum, item) => sum + money(item.totalEmployerCost), 0);
      const queryReports = await Promise.all(savedViews.map(async (view) => {
        const definition = view.filtersJson as unknown as ReportDefinition;
        return { id: view.id, name: view.name, shared: view.shared, definition, rows: await executeReportDefinition(organizationId, definition) };
      }));
      return {
        kind: "reports",
        records: [
          { name: "Profit & loss", category: "Financial", value: revenue - operatingExpense - payrollExpense, period: "Current period", status: "Ready" },
          { name: "Accounts receivable aging", category: "Financial", value: invoices.reduce((sum, item) => sum + money(item.balanceDue), 0), period: "As of today", status: "Ready" },
          { name: "Sales pipeline forecast", category: "Sales", value: deals.reduce((sum, item) => sum + money(item.amount) * item.probability / 100, 0), period: "Open pipeline", status: "Ready" },
          { name: "Customer revenue", category: "CRM", value: accounts.reduce((sum, account) => sum + account.invoices.reduce((inner, invoice) => inner + money(invoice.amountPaid), 0), 0), period: "Lifetime", status: "Ready" },
        ],
        queryReports,
        metrics: [{ label: "Revenue", value: revenue, format: "currency" }, { label: "Operating expense", value: operatingExpense, format: "currency" }, { label: "Payroll expense", value: payrollExpense, format: "currency" }, { label: "Net operating result", value: revenue - operatingExpense - payrollExpense, format: "currency" }],
      };
    }
    case "invoices": {
      const records = await db.invoice.findMany({ where: { organizationId }, include: { account: true, contact: true, items: true }, orderBy: { issueDate: "desc" } });
      return { kind: "invoices", records: records.map((r) => ({
        id: r.id,
        number: r.invoiceNumber,
        customer: r.account?.name,
        contact: r.contact ? `${r.contact.firstName} ${r.contact.lastName ?? ""}`.trim() : null,
        email: r.contact?.email,
        status: r.status,
        issueDate: iso(r.issueDate),
        dueDate: iso(r.dueDate),
        total: money(r.total),
        paid: money(r.amountPaid),
        balance: money(r.balanceDue),
        items: r.items.map((item) => ({ description: item.description, quantity: money(item.quantity), unitPrice: money(item.unitPrice), total: money(item.lineTotal) })),
        posted: Boolean(r.postedJournalId),
        sentAt: iso(r.sentAt),
        publicTokenId: r.publicTokenId,
        collectionState: r.balanceDue.equals(0) ? "SETTLED" : r.dueDate < new Date() ? "OVERDUE" : r.status === "DRAFT" ? "READY_TO_SEND" : "AWAITING_PAYMENT",
      })), metrics: [{ label: "Receivables", value: records.reduce((s, r) => s + money(r.balanceDue), 0), format: "currency" }, { label: "Collected", value: records.reduce((s, r) => s + money(r.amountPaid), 0), format: "currency" }, { label: "Overdue", value: records.filter((r) => r.status === "OVERDUE" || (r.balanceDue.greaterThan(0) && r.dueDate < new Date())).length }, { label: "Drafts to send", value: records.filter((r) => r.status === "DRAFT").length }] };
    }
    case "payments": {
      const [records, openInvoices] = await Promise.all([db.payment.findMany({ where: { organizationId }, include: { allocations: { include: { invoice: true } } }, orderBy: { receivedAt: "desc" } }), db.invoice.findMany({ where: { organizationId, balanceDue: { gt: 0 }, status: { notIn: ["PAID", "VOID"] } }, include: { account: true }, orderBy: { dueDate: "asc" } })]);
      return { kind: "payments", records: records.map((r) => ({ id: r.id, reference: r.referenceNumber, status: r.status, method: r.method, amount: money(r.amount), receivedAt: iso(r.receivedAt), invoices: r.allocations.map((a) => a.invoice.invoiceNumber).join(", "), posted: Boolean(r.postedJournalId) })), openInvoices: openInvoices.map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNumber} - ${invoice.account?.name ?? "Customer"} - ${money(invoice.balanceDue).toFixed(2)}` })), metrics: [{ label: "Received", value: records.filter((r) => r.status === "SUCCEEDED").reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Successful", value: records.filter((r) => r.status === "SUCCEEDED").length }, { label: "Unallocated", value: records.filter((r) => !r.allocations.length).length }, { label: "Failed", value: records.filter((r) => r.status === "FAILED").length }] };
    }
    case "expenses": {
      const records = await db.expense.findMany({ where: { organizationId }, include: { vendor: true }, orderBy: { incurredAt: "desc" } });
      return { kind: "expenses", records: records.map((r) => ({ id: r.id, description: r.description, vendor: r.vendor?.name, category: r.category, amount: money(r.amount), incurredAt: iso(r.incurredAt), posted: Boolean(r.postedJournalId) })), metrics: [{ label: "This period", value: records.reduce((s, r) => s + money(r.amount), 0), format: "currency" }, { label: "Transactions", value: records.length }, { label: "Needs posting", value: records.filter((r) => !r.postedJournalId).length }] };
    }
    case "vendors": {
      const records = await db.vendor.findMany({ where: { organizationId }, include: { bills: true }, orderBy: { name: "asc" } });
      return { kind: "vendors", records: records.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, eligible1099: r.eligible1099, openBills: r.bills.filter((b) => b.status !== "PAID").length, balance: r.bills.reduce((s, b) => s + money(b.total) - money(b.amountPaid), 0), bills: r.bills.map((bill) => ({ id: bill.id, number: bill.billNumber, status: bill.status, issueDate: iso(bill.issueDate), dueDate: iso(bill.dueDate), total: money(bill.total), paid: money(bill.amountPaid), balance: money(bill.total) - money(bill.amountPaid), posted: Boolean(bill.postedJournalId) })) })), metrics: [{ label: "Open payables", value: records.flatMap((r) => r.bills).reduce((s, b) => s + money(b.total) - money(b.amountPaid), 0), format: "currency" }, { label: "Past due", value: records.flatMap((r) => r.bills).filter((b) => b.status !== "PAID" && b.dueDate < new Date()).length }, { label: "Vendors", value: records.length }, { label: "1099 eligible", value: records.filter((r) => r.eligible1099).length }] };
    }
    case "accounting": {
      const [entries, accounts, periods] = await Promise.all([db.journalEntry.findMany({ where: { organizationId }, include: { lines: { include: { ledgerAccount: true } } }, orderBy: { entryDate: "desc" } }), db.ledgerAccount.findMany({ where: { organizationId }, include: { lines: true }, orderBy: { code: "asc" } }), db.accountingPeriod.findMany({ where: { organizationId }, orderBy: { startsOn: "desc" } })]);
      const accountRows = accounts.map((r) => { const debitBalance = ["ASSET", "EXPENSE", "COST_OF_GOODS_SOLD"].includes(r.type); return { id: r.id, code: r.code, name: r.name, type: r.type, balance: r.lines.reduce((s, l) => s + (debitBalance ? money(l.debit) - money(l.credit) : money(l.credit) - money(l.debit)), 0) }; });
      const byType = (types: string[]) => accountRows.filter((account) => types.includes(String(account.type))).reduce((sum, account) => sum + Number(account.balance), 0);
      return { kind: "accounting", records: entries.map((r) => ({ id: r.id, number: r.entryNumber, date: iso(r.entryDate), description: r.description, source: r.sourceModule, status: r.status, debit: r.lines.reduce((s, l) => s + money(l.debit), 0), credit: r.lines.reduce((s, l) => s + money(l.credit), 0), reversalOfId: r.reversalOfId, lines: r.lines.map((line) => ({ account: `${line.ledgerAccount.code} - ${line.ledgerAccount.name}`, debit: money(line.debit), credit: money(line.credit), description: line.description })) })), accounts: accountRows, periods: periods.map((period) => ({ id: period.id, name: period.name, startsOn: iso(period.startsOn), endsOn: iso(period.endsOn), status: period.status, lockedAt: iso(period.lockedAt) })), statements: { assets: byType(["ASSET"]), liabilities: byType(["LIABILITY"]), equity: byType(["EQUITY"]), income: byType(["INCOME", "OTHER_INCOME"]), expenses: byType(["EXPENSE", "COST_OF_GOODS_SOLD", "OTHER_EXPENSE"]) }, metrics: [{ label: "Net income", value: byType(["INCOME", "OTHER_INCOME"]) - byType(["EXPENSE", "COST_OF_GOODS_SOLD", "OTHER_EXPENSE"]), format: "currency" }, { label: "Posted entries", value: entries.filter((r) => r.status === "POSTED").length }, { label: "Locked periods", value: periods.filter((period) => period.status === "LOCKED").length }, { label: "Chart accounts", value: accounts.length }] };
    }
    case "banking": {
      const [records, openInvoices, reconciliations] = await Promise.all([
        db.bankAccount.findMany({ where: { organizationId }, include: { transactions: { orderBy: { postedAt: "desc" } } } }),
        db.invoice.findMany({ where: { organizationId, balanceDue: { gt: 0 }, status: { notIn: ["VOID", "PAID"] } }, include: { account: true }, orderBy: { dueDate: "asc" } }),
        db.reconciliationSession.findMany({ where: { organizationId }, orderBy: { statementDate: "desc" }, take: 12 }),
      ]);
      return {
        kind: "banking",
        records: records.map((r) => ({ id: r.id, ledgerAccountId: r.ledgerAccountId, institution: r.institutionName, name: r.accountName, type: r.accountType, mask: r.mask, bookBalance: money(r.bookBalance), availableBalance: money(r.availableBalance), status: r.connectionStatus, lastSyncAt: iso(r.lastSyncedAt), transactions: r.transactions.map((t) => ({ id: t.id, date: iso(t.postedAt), description: t.description, amount: money(t.amount), direction: t.direction, status: t.status, category: t.category, suggestedResolution: t.direction === "CREDIT" ? "PAYMENT" : "EXPENSE" })) })),
        openInvoices: openInvoices.map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNumber} - ${invoice.account?.name ?? "Customer"} - ${money(invoice.balanceDue).toFixed(2)}`, balance: money(invoice.balanceDue) })),
        reconciliations: reconciliations.map((session) => ({ id: session.id, ledgerAccountId: session.ledgerAccountId, statementDate: iso(session.statementDate), statementBalance: money(session.statementBalance), clearedBalance: money(session.clearedBalance), difference: money(session.difference), status: session.status, completedAt: iso(session.completedAt) })),
        metrics: [{ label: "Book balance", value: records.reduce((s, r) => s + money(r.bookBalance), 0), format: "currency" }, { label: "Available", value: records.reduce((s, r) => s + money(r.availableBalance), 0), format: "currency" }, { label: "Needs review", value: records.flatMap((r) => r.transactions).filter((t) => t.status !== "MATCHED").length }, { label: "Matched", value: records.flatMap((r) => r.transactions).filter((t) => t.status === "MATCHED").length }],
      };
    }
    case "products": {
      const records = await db.product.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
      return { kind: "products", records: records.map((r) => ({ id: r.id, sku: r.sku, name: r.name, type: r.type, price: money(r.price), cost: money(r.cost), margin: money(r.price) - money(r.cost), onHand: money(r.quantityOnHand), active: r.active })), metrics: [{ label: "Active offerings", value: records.filter((r) => r.active).length }, { label: "Catalog value", value: records.reduce((s, r) => s + money(r.price), 0), format: "currency" }, { label: "Inventory value", value: records.reduce((s, r) => s + money(r.quantityOnHand) * money(r.cost), 0), format: "currency" }] };
    }
    case "payroll": {
      const [connection, employees, runs, time, timeOff] = await Promise.all([db.payrollConnection.findUnique({ where: { organizationId } }), db.employee.findMany({ where: { organizationId }, include: { department: true, compensations: { orderBy: { effectiveFrom: "desc" }, take: 1 } } }), db.payrollRun.findMany({ where: { organizationId }, include: { employees: true }, orderBy: { checkDate: "desc" } }), db.timeEntry.findMany({ where: { organizationId }, include: { employee: true }, orderBy: { workDate: "desc" } }), db.timeOffRequest.findMany({ where: { organizationId }, include: { employee: true }, orderBy: { startsOn: "asc" } })]);
      return { kind: "payroll", connection: connection ? { provider: connection.provider, mode: connection.mode, status: connection.status, lastSyncAt: iso(connection.lastSyncAt) } : null, employees: employees.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, number: r.employeeNumber, department: r.department?.name, title: r.jobTitle, status: r.status, compensation: money(r.compensations[0]?.rate), schedule: r.compensations[0]?.paySchedule })), runs: runs.map((r) => ({ id: r.id, period: `${r.payPeriodStart.toLocaleDateString()} - ${r.payPeriodEnd.toLocaleDateString()}`, checkDate: iso(r.checkDate), status: r.status, grossPay: money(r.grossPay), netPay: money(r.netPay), employerCost: money(r.totalEmployerCost), employeeCount: r.employees.length })), time: time.map((r) => ({ id: r.id, employee: `${r.employee.firstName} ${r.employee.lastName}`, date: iso(r.workDate), regular: money(r.regularHours), overtime: money(r.overtimeHours), status: r.status })), timeOff: timeOff.map((r) => ({ id: r.id, employee: `${r.employee.firstName} ${r.employee.lastName}`, type: r.policyType, startsOn: iso(r.startsOn), endsOn: iso(r.endsOn), hours: money(r.hours), status: r.status })), metrics: [{ label: "Active employees", value: employees.filter((r) => r.status === "ACTIVE").length }, { label: "Next gross payroll", value: money(runs[0]?.grossPay), format: "currency" }, { label: "Employer cost", value: money(runs[0]?.totalEmployerCost), format: "currency" }, { label: "Time awaiting approval", value: time.filter((r) => r.status === "SUBMITTED").reduce((s, r) => s + money(r.regularHours) + money(r.overtimeHours), 0), suffix: " hrs" }] };
    }
    case "integrations": {
      const [records, webhooks] = await Promise.all([db.integration.findMany({ where: { organizationId }, include: { syncRuns: { orderBy: { startedAt: "desc" }, take: 5 } }, orderBy: { provider: "asc" } }), db.webhookEvent.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 50 })]);
      return { kind: "integrations", records: records.map((r) => ({ id: r.id, provider: r.provider, status: r.status, direction: r.syncDirection, lastSyncAt: iso(r.lastSyncAt), lastError: r.lastError, runs: r.syncRuns.map((run) => ({ id: run.id, status: run.status, direction: run.direction, processed: run.processedCount, failed: run.failedCount, error: run.errorSummary, startedAt: iso(run.startedAt) })) })), webhooks: webhooks.map((event) => ({ id: event.id, provider: event.provider, type: event.eventType, status: event.status, attempts: event.attempts, error: event.lastError, createdAt: iso(event.createdAt) })), metrics: [{ label: "Connected", value: records.filter((r) => r.status === "ACTIVE").length }, { label: "Needs attention", value: records.filter((r) => ["ERROR", "REAUTH_REQUIRED"].includes(r.status)).length }, { label: "Failed webhooks", value: webhooks.filter((event) => event.status === "FAILED").length }, { label: "Pending webhooks", value: webhooks.filter((event) => event.status === "PENDING").length }] };
    }
    case "automations": {
      const records = await db.automationRule.findMany({ where: { organizationId }, include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } }, orderBy: { name: "asc" } });
      return {
        kind: "automations",
        records: records.map((r) => ({
          id: r.id,
          name: r.name,
          trigger: r.triggerType,
          active: r.active,
          conditions: r.conditions,
          actions: r.actions,
          lastRunAt: iso(r.lastRunAt),
          runs: r.runs.map((run) => ({ id: run.id, status: run.status, startedAt: iso(run.startedAt), completedAt: iso(run.completedAt), results: run.actionResults, error: run.errorMessage })),
          failures: r.runs.filter((run) => run.status === "FAILED").length,
        })),
        metrics: [{ label: "Active rules", value: records.filter((r) => r.active).length }, { label: "Recent runs", value: records.reduce((s, r) => s + r.runs.length, 0) }, { label: "Failures", value: records.flatMap((r) => r.runs).filter((r) => r.status === "FAILED").length }, { label: "Successful", value: records.flatMap((r) => r.runs).filter((r) => r.status === "COMPLETED").length }],
      };
    }
    case "email": {
      const [templates, messages, contacts] = await Promise.all([db.emailTemplate.findMany({ where: { organizationId } }), db.emailMessage.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }), db.contact.findMany({ where: { organizationId, email: { not: null }, emailOptOut: false }, orderBy: { firstName: "asc" } })]);
      return { kind: "email", templates: templates.map((r) => ({ id: r.id, name: r.name, subject: r.subject, category: r.category, active: r.active })), contacts: contacts.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName ?? ""}`.trim(), email: r.email })), records: messages.map((r) => ({ id: r.id, recipient: r.recipientName ?? r.recipientEmail, email: r.recipientEmail, subject: r.subject, status: r.status, relatedType: r.relatedType, sentAt: iso(r.sentAt), error: r.lastError })), metrics: [{ label: "Delivered", value: messages.filter((r) => r.status === "DELIVERED").length }, { label: "Queued", value: messages.filter((r) => r.status === "QUEUED").length }, { label: "Needs configuration", value: messages.filter((r) => r.status === "PENDING_CONFIGURATION").length }, { label: "Templates", value: templates.length }] };
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
      return { kind: "team", records: records.map((r) => ({ id: r.id, name: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email, email: r.user.email, role: r.role, permissions: r.permissions, platformAdmin: r.user.platformAdmin, joinedAt: iso(r.createdAt) })), permissionCatalog: ["leads.read","leads.write","accounts.read","accounts.write","contacts.read","contacts.write","deals.read","deals.write","cases.read","cases.write","invoices.read","invoices.write","payments.read","payments.write","accounting.read","accounting.write","reports.read","tasks.read","tasks.write","calendar.read","calendar.write","campaigns.read","campaigns.write","payroll.read","payroll.write","banking.read","banking.write","email.read","email.write","automations.read","automations.write","websites.read","websites.write","websites.publish","domains.read","domains.manage","documents.read","documents.write","team.read","team.manage","settings.manage","integrations.manage"], metrics: [{ label: "Members", value: records.length }, { label: "Admins", value: records.filter((r) => ["OWNER", "ADMIN"].includes(r.role)).length }, { label: "Licensed users", value: records.filter((r) => r.role !== "PORTAL_USER").length }] };
    }
    case "settings": {
      const [theme, domains, customFields, modules, tenantSettings] = await Promise.all([
        db.organizationTheme.findUnique({ where: { organizationId } }),
        db.organizationDomain.findMany({ where: { organizationId }, orderBy: { isPrimary: "desc" } }),
        db.customFieldDefinition.findMany({ where: { organizationId }, orderBy: [{ objectType: "asc" }, { sortOrder: "asc" }] }),
        db.organizationModule.findUnique({ where: { organizationId } }),
        db.tenantSettings.findUnique({ where: { organizationId } }),
      ]);
      return { kind: "settings", theme, modules, tenantSettings, organization: { name: organization.name, legalName: organization.legalName, orgCode: organization.orgCode, slug: organization.slug, publicId: organization.publicId, timezone: organization.timezone, currency: organization.defaultCurrency }, records: [
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
      return { kind: "documents", records: records.map((r) => ({ id: r.id, name: r.fileName, type: r.contentType, size: Number(r.sizeBytes), relatedType: r.relatedType, status: r.status, scanStatus: r.scanStatus, version: r.version, downloadUrl: `/api/documents/${r.id}/download`, createdAt: iso(r.createdAt) })), metrics: [{ label: "Documents", value: records.length }, { label: "Available", value: records.filter((r) => r.status === "AVAILABLE").length }, { label: "Scan review", value: records.filter((r) => !["CLEAN", "NOT_REQUIRED"].includes(r.scanStatus)).length }, { label: "Storage used", value: Math.round(records.reduce((s, r) => s + Number(r.sizeBytes), 0) / 1024 / 1024), suffix: " MB" }] };
    }
    case "collaboration": {
      const [channels, calendar] = await Promise.all([
        db.collaborationChannel.findMany({ where: { organizationId, archivedAt: null }, include: { messages: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" }, take: 100 } }, orderBy: { updatedAt: "desc" } }),
        db.calendarEvent.findMany({ where: { organizationId, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 8 }),
      ]);
      return { kind: "collaboration", records: channels.map((channel) => ({ id: channel.id, publicId: channel.publicId, name: channel.name, description: channel.description, type: channel.channelType, visibility: channel.visibility, videoUrl: channel.videoRoomKey ? `https://meet.jit.si/${channel.videoRoomKey}` : null, customerWorkspaceUrl: channel.channelType === "CUSTOMER" ? `/workspace/${channel.publicId}?token=${encodeURIComponent(createCustomerWorkspaceToken(channel.publicId))}` : null, messages: channel.messages.map((message) => ({ id: message.id, body: message.body, author: message.author ? `${message.author.firstName ?? ""} ${message.author.lastName ?? ""}`.trim() || message.author.email : "Customer", authorType: message.authorUserId ? "MEMBER" : "CUSTOMER", createdAt: iso(message.createdAt) })) })), calendar: calendar.map((event) => ({ id: event.id, title: event.title, startsAt: iso(event.startsAt), endsAt: iso(event.endsAt), location: event.location })), metrics: [{ label: "Channels", value: channels.length }, { label: "Customer spaces", value: channels.filter((channel) => channel.channelType === "CUSTOMER").length }, { label: "Messages", value: channels.reduce((sum, channel) => sum + channel.messages.length, 0) }, { label: "Upcoming meetings", value: calendar.length }] };
    }
    case "support": {
      const tickets = await db.platformSupportTicket.findMany({ where: { organizationId }, include: { messages: { where: { internalOnly: false }, include: { author: true }, orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
      return { kind: "support", records: tickets.map((ticket) => ({ id: ticket.id, publicId: ticket.publicId, subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, createdAt: iso(ticket.createdAt), messages: ticket.messages.map((message) => ({ id: message.id, body: message.body, authorType: message.authorType, author: message.author ? `${message.author.firstName ?? ""} ${message.author.lastName ?? ""}`.trim() || message.author.email : "ClearKey Support", createdAt: iso(message.createdAt) })) })), metrics: [{ label: "Open tickets", value: tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length }, { label: "Awaiting ClearKey", value: tickets.filter((ticket) => ticket.status === "OPEN").length }, { label: "Urgent", value: tickets.filter((ticket) => ticket.priority === "URGENT").length }, { label: "Resolved", value: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length }] };
    }
    case "payment-settings": {
      const [connections, transactions] = await Promise.all([
        db.paymentProviderConnection.findMany({ where: { organizationId }, orderBy: { provider: "asc" } }),
        db.paymentTransaction.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 25 }),
      ]);
      const providers = ["STRIPE", "SQUARE", "PAYPAL", "MANUAL"].map((provider) => {
        const connection = connections.find((item) => item.provider === provider);
        return { id: connection?.id ?? provider, provider, status: connection?.status ?? "DISCONNECTED", isDefault: connection?.isDefault ?? false, merchantId: connection?.merchantId ?? connection?.externalAccountId, updatedAt: iso(connection?.updatedAt) };
      });
      return { kind: "payment-settings", records: providers, transactions: transactions.map((transaction) => ({ id: transaction.id, publicId: transaction.publicId, provider: transaction.provider, status: transaction.status, amountCents: transaction.amountCents, currency: transaction.currency, createdAt: iso(transaction.createdAt) })), metrics: [{ label: "Connected providers", value: connections.filter((connection) => connection.status === "ACTIVE").length }, { label: "Default providers", value: connections.filter((connection) => connection.isDefault).length }, { label: "Pending checkouts", value: transactions.filter((transaction) => transaction.status === "CHECKOUT_CREATED").length }, { label: "Provider failures", value: transactions.filter((transaction) => transaction.status === "FAILED").length }] };
    }
    case "bookings": {
      const records = await db.booking.findMany({ where: { organizationId }, include: { contact: true }, orderBy: { startsAt: "asc" } });
      return { kind: "bookings", records: records.map((booking) => ({ id: booking.id, title: booking.serviceName, customer: booking.customerName, email: booking.customerEmail, phone: booking.customerPhone, startsAt: iso(booking.startsAt), endsAt: iso(booking.endsAt), status: booking.status, notes: booking.notes, price: money(booking.price) })), metrics: [{ label: "Upcoming", value: records.filter((booking) => booking.startsAt >= new Date() && !["CANCELED", "COMPLETED"].includes(booking.status)).length }, { label: "Confirmed", value: records.filter((booking) => booking.status === "CONFIRMED").length }, { label: "Completed", value: records.filter((booking) => booking.status === "COMPLETED").length }, { label: "Canceled", value: records.filter((booking) => booking.status === "CANCELED").length }] };
    }
    case "submissions": {
      const records = await db.endpointSubmission.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
      return { kind: "submissions", records: records.map((submission) => ({ id: submission.id, type: submission.submissionType, status: submission.status, payload: submission.payloadJson, createdAt: iso(submission.createdAt), updatedAt: iso(submission.updatedAt) })), metrics: [{ label: "New", value: records.filter((submission) => submission.status === "NEW").length }, { label: "In review", value: records.filter((submission) => submission.status === "IN_REVIEW").length }, { label: "Resolved", value: records.filter((submission) => submission.status === "RESOLVED").length }, { label: "Spam", value: records.filter((submission) => submission.status === "SPAM").length }] };
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
