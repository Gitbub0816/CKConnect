import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  AccountType,
  DealStage,
  EmploymentStatus,
  IntegrationStatus,
  InvoiceStatus,
  LeadStatus,
  MembershipRole,
  PayrollMode,
  PayrollRunStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

config({ path: ".env.local" });
config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const day = 86_400_000;
const now = new Date();
const date = (offset: number) => new Date(now.getTime() + offset * day);

const organizations = [
  {
    slug: "northstar-home-services",
    orgCode: "NORTHSTAR",
    name: "Northstar Home Services",
    legalName: "Northstar Home Services LLC",
    theme: {
      primaryColor: "#c56a2d",
      accentColor: "#183a37",
      backgroundColor: "#f7f1e8",
      surfaceColor: "#fffdf8",
      textColor: "#172321",
      headingFont: "Manrope",
      bodyFont: "Geist",
      borderRadius: 18,
      portalHeadline: "Home service without the runaround.",
      portalSubhead: "Book, approve estimates, pay invoices, and follow every visit from one neighborhood-friendly hub.",
    },
    page: {
      navigationJson: [
        { label: "Services", href: "#services" },
        { label: "Why Northstar", href: "#trust" },
        { label: "Reviews", href: "#reviews" },
        { label: "Contact", href: "#contact" },
      ],
      blocksJson: [
        { type: "hero", eyebrow: "Local experts. Clear answers.", title: "Home service without the runaround.", body: "Heating, cooling, plumbing, and electrical care delivered by one accountable team.", primaryAction: "Book service", secondaryAction: "Pay an invoice", layout: "split" },
        { type: "serviceGrid", id: "services", title: "How can we help?", items: [{ title: "Heating & cooling", body: "Repair, replacement, and seasonal maintenance." }, { title: "Plumbing", body: "Fast diagnosis for leaks, fixtures, and water systems." }, { title: "Electrical", body: "Safe repairs, panels, lighting, and installations." }] },
        { type: "stats", items: [{ value: "4.9", label: "Average rating" }, { value: "18 min", label: "Average response" }, { value: "12 yr", label: "Serving the community" }] },
        { type: "testimonial", id: "reviews", quote: "Northstar made the entire repair easy to understand, and I knew exactly what I was paying for.", attribution: "Alicia R., homeowner" },
        { type: "cta", id: "contact", title: "Need help today?", body: "Tell us what is happening and choose the best arrival window.", action: "Request service" },
      ],
    },
  },
  {
    slug: "brightline-studio",
    orgCode: "BRIGHTLN",
    name: "Brightline Studio",
    legalName: "Brightline Creative Studio Inc.",
    theme: {
      primaryColor: "#e55d47",
      accentColor: "#7c5cff",
      backgroundColor: "#fff7f2",
      surfaceColor: "#ffffff",
      textColor: "#251c2b",
      headingFont: "Cormorant Garamond",
      bodyFont: "Geist",
      borderRadius: 28,
      portalHeadline: "Ideas built to move.",
      portalSubhead: "A collaborative project space for briefs, approvals, files, milestones, and billing.",
    },
    page: {
      navigationJson: [
        { label: "Work", href: "#work" },
        { label: "Process", href: "#process" },
        { label: "Start a project", href: "#contact" },
      ],
      blocksJson: [
        { type: "hero", eyebrow: "Strategy · Identity · Digital", title: "Ideas built to move.", body: "Brightline gives ambitious teams a sharper story and the systems to carry it.", primaryAction: "Start a project", secondaryAction: "Client login", layout: "editorial" },
        { type: "portfolio", id: "work", title: "Selected work", items: [{ title: "Marrow & Field", tag: "Brand system", color: "#f2b84b" }, { title: "Atlas Health", tag: "Digital product", color: "#7c5cff" }, { title: "Common Ground", tag: "Campaign", color: "#e55d47" }] },
        { type: "process", id: "process", title: "From ambiguity to momentum", steps: [{ title: "Discover", body: "Find the real problem and the audience it matters to." }, { title: "Define", body: "Shape the strategic and creative system." }, { title: "Deliver", body: "Launch with assets your team can actually use." }] },
        { type: "cta", id: "contact", title: "Bring us the complicated part.", body: "We will make it clear, useful, and distinct.", action: "Share your brief" },
      ],
    },
  },
  {
    slug: "harbor-dental-group",
    orgCode: "HARBORDG",
    name: "Harbor Dental Group",
    legalName: "Harbor Dental Group PLLC",
    theme: {
      primaryColor: "#2f7f78",
      accentColor: "#d7a852",
      backgroundColor: "#edf7f5",
      surfaceColor: "#ffffff",
      textColor: "#153733",
      headingFont: "Cormorant Garamond",
      bodyFont: "Geist",
      borderRadius: 12,
      portalHeadline: "Comfortable care. Confident smiles.",
      portalSubhead: "Request an appointment, complete forms, review treatment plans, and manage balances securely.",
    },
    page: {
      navigationJson: [
        { label: "Care", href: "#care" },
        { label: "Our team", href: "#team" },
        { label: "Patient resources", href: "#resources" },
      ],
      blocksJson: [
        { type: "hero", eyebrow: "Modern dentistry, human care", title: "Comfortable care. Confident smiles.", body: "Preventive, restorative, and cosmetic dentistry with time to listen and a plan you can understand.", primaryAction: "Request appointment", secondaryAction: "Patient portal", layout: "calm" },
        { type: "serviceGrid", id: "care", title: "Care for every chapter", items: [{ title: "Preventive care", body: "Exams, cleanings, imaging, and long-term planning." }, { title: "Restorative dentistry", body: "Comfort-focused solutions that protect function." }, { title: "Cosmetic care", body: "Thoughtful options designed around your goals." }] },
        { type: "team", id: "team", title: "A team that listens first", items: [{ name: "Dr. Maya Chen", role: "General dentistry" }, { name: "Dr. Jonah Reed", role: "Restorative care" }, { name: "Elena Ortiz", role: "Patient experience" }] },
        { type: "resourceLinks", id: "resources", title: "Patient resources", items: [{ label: "New patient forms", action: "forms" }, { label: "Insurance and financing", action: "document" }, { label: "Pay a balance", action: "payment" }] },
      ],
    },
  },
] as const;

async function seedOrganization(spec: (typeof organizations)[number], ownerId: string, index: number) {
  const organization = await db.organization.create({
    data: {
      name: spec.name,
      slug: spec.slug,
      orgCode: spec.orgCode,
      legalName: spec.legalName,
      billingTier: index === 2 ? "GROWTH" : "STARTER",
      billingStatus: "TRIALING",
      moduleConfiguration: {
        create: {
          accounting: true,
          workforce: index !== 1,
          scheduling: true,
          timeClock: index === 0,
          marketing: index === 1,
          payroll: true,
          advancedAi: index === 1,
          advancedAnalytics: index > 0,
          managedEmail: index === 0,
          premiumTemplates: true,
          managedDomain: true,
        },
      },
      usage: {
        create: {
          licensedUsers: index === 0 ? 12 : index === 1 ? 7 : 54,
          accountingUsers: index === 0 ? 3 : 2,
          workforceUsers: index === 1 ? 0 : 8,
          schedulingUsers: index === 2 ? 18 : 5,
          marketingUsers: index === 1 ? 4 : 0,
          mailboxCount: index === 0 ? 3 : 0,
        },
      },
      memberships: { create: { userId: ownerId, role: MembershipRole.OWNER, permissions: ["*"] } },
      theme: { create: { ...spec.theme, navigationJson: spec.page.navigationJson, pageBlocksJson: spec.page.blocksJson } },
      endpointPages: {
        create: {
          slug: "home",
          title: spec.theme.portalHeadline,
          status: "PUBLISHED",
          version: 1,
          navigationJson: spec.page.navigationJson,
          blocksJson: spec.page.blocksJson,
          seoJson: { title: `${spec.name} | Client Services`, description: spec.theme.portalSubhead },
          settingsJson: { showPoweredBy: true, portalEnabled: true },
          publishedAt: now,
        },
      },
      domains: {
        create: [
          { hostname: `${spec.slug}.cksites.dev`, kind: "SUBDOMAIN", status: "VERIFIED", isPrimary: true, sslEnabled: true, verifiedAt: now },
          { hostname: `${spec.slug}.connect.clearkey.solutions`, kind: "PORTAL", status: "VERIFIED", sslEnabled: true, verifiedAt: now },
        ],
      },
      websites: {
        create: {
          slug: "main",
          defaultHostname: `${spec.slug}.cksites.dev`,
          status: "PUBLISHED",
          themeJson: spec.theme,
          configJson: { businessName: spec.name, bookingEnabled: true, portalEnabled: true, analyticsEnabled: true },
          publishedAt: now,
          pages: {
            create: {
              path: "/",
              title: `${spec.name} | Home`,
              seoJson: { title: `${spec.name} | Home`, description: spec.theme.portalSubhead },
              contentJson: { navigation: spec.page.navigationJson, blocks: spec.page.blocksJson },
              status: "PUBLISHED",
            },
          },
        },
      },
      managedMailboxes: index === 0 ? {
        create: [
          { email: "owner@northstar.example", displayName: "Owner", provider: "ZOHO" },
          { email: "billing@northstar.example", displayName: "Billing", provider: "ZOHO" },
          { email: "dispatch@northstar.example", displayName: "Dispatch", provider: "ZOHO" },
        ],
      } : undefined,
    },
  });

  const accounts = await Promise.all([
    db.crmAccount.create({ data: { organizationId: organization.id, name: index === 0 ? "Hearth & Pine HOA" : index === 1 ? "Atlas Health" : "Seaside Pediatrics", accountType: "CUSTOMER", industry: index === 0 ? "Property Management" : index === 1 ? "Healthcare" : "Medical", annualRevenue: 420000 } }),
    db.crmAccount.create({ data: { organizationId: organization.id, name: index === 0 ? "Willow Creek Market" : index === 1 ? "Common Ground Coffee" : "Marina Wellness", accountType: "PROSPECT", industry: "Services", annualRevenue: 185000 } }),
  ]);
  const contacts = await Promise.all([
    db.contact.create({ data: { organizationId: organization.id, accountId: accounts[0].id, firstName: "Alicia", lastName: "Ramirez", email: `alicia@${spec.slug}.example`, jobTitle: "Operations Director", lifecycleStatus: "CUSTOMER", preferredContactMethod: "EMAIL" } }),
    db.contact.create({ data: { organizationId: organization.id, accountId: accounts[1].id, firstName: "Marcus", lastName: "Lee", email: `marcus@${spec.slug}.example`, jobTitle: "Founder", lifecycleStatus: "PROSPECT", preferredContactMethod: "PHONE" } }),
  ]);
  await db.lead.createMany({
    data: [
      { organizationId: organization.id, firstName: "Priya", lastName: "Shah", company: "Oak & Main", email: `priya+${index}@example.com`, source: "Website", status: LeadStatus.NEW, rating: "HOT", estimatedValue: 12500, score: 82 },
      { organizationId: organization.id, firstName: "Daniel", lastName: "Brooks", company: "Bluebird Co.", email: `daniel+${index}@example.com`, source: "Referral", status: LeadStatus.CONTACTED, rating: "WARM", estimatedValue: 7800, score: 64 },
      { organizationId: organization.id, firstName: "Nina", lastName: "Patel", company: "Juniper Works", email: `nina+${index}@example.com`, source: "Campaign", status: LeadStatus.QUALIFIED, rating: "HOT", estimatedValue: 22400, score: 91 },
    ],
  });
  await db.deal.createMany({
    data: [
      { organizationId: organization.id, accountId: accounts[0].id, primaryContactId: contacts[0].id, name: `${accounts[0].name} expansion`, amount: 28000 + index * 6500, stage: DealStage.PROPOSAL, probability: 65, expectedCloseDate: date(18), nextStep: "Review proposal" },
      { organizationId: organization.id, accountId: accounts[1].id, primaryContactId: contacts[1].id, name: `${accounts[1].name} launch`, amount: 14500 + index * 4000, stage: DealStage.QUALIFICATION, probability: 35, expectedCloseDate: date(35), nextStep: "Discovery call" },
    ],
  });
  await db.task.createMany({
    data: [
      { organizationId: organization.id, title: `Follow up with ${contacts[1].firstName}`, priority: "HIGH", dueAt: date(1), createdById: ownerId, assignedToId: ownerId, relatedType: "CONTACT", relatedId: contacts[1].id },
      { organizationId: organization.id, title: "Review open invoice", priority: "NORMAL", dueAt: date(2), createdById: ownerId, assignedToId: ownerId, relatedType: "ACCOUNT", relatedId: accounts[0].id },
    ],
  });
  await db.supportCase.create({ data: { organizationId: organization.id, accountId: accounts[0].id, contactId: contacts[0].id, caseNumber: `CS-${index + 1}001`, subject: "Service follow-up", description: "Customer requested an update and supporting documents.", status: "IN_PROGRESS", priority: index === 2 ? "HIGH" : "NORMAL" } });
  await db.campaign.create({ data: { organizationId: organization.id, name: index === 0 ? "Seasonal maintenance" : index === 1 ? "Founder launch series" : "New patient welcome", type: "EMAIL", status: "ACTIVE", memberCount: 248 + index * 80, responseCount: 64 + index * 14, conversionCount: 18 + index * 5, startsAt: date(-12), endsAt: date(20) } });
  await db.calendarEvent.createMany({ data: [
    { organizationId: organization.id, title: `Meeting with ${accounts[0].name}`, eventType: "MEETING", startsAt: date(1), endsAt: new Date(date(1).getTime() + 3_600_000), location: "Video", ownerUserId: ownerId, attendeeJson: [contacts[0].email] },
    { organizationId: organization.id, title: index === 0 ? "Crew capacity review" : index === 1 ? "Creative review" : "Clinical team huddle", eventType: "INTERNAL", startsAt: date(3), endsAt: new Date(date(3).getTime() + 2_700_000), ownerUserId: ownerId },
  ] });
  await db.booking.create({
    data: {
      organizationId: organization.id,
      contactId: contacts[0].id,
      serviceName: index === 0 ? "Seasonal system inspection" : index === 1 ? "Project discovery session" : "New patient consultation",
      startsAt: date(5),
      endsAt: new Date(date(5).getTime() + 3_600_000),
      status: "CONFIRMED",
      customerName: `${contacts[0].firstName} ${contacts[0].lastName}`,
      customerEmail: contacts[0].email!,
      notes: "Seeded public endpoint booking for operations testing.",
    },
  });
  await db.endpointSubmission.create({
    data: {
      organizationId: organization.id,
      submissionType: "CONTACT_FORM",
      payloadJson: { name: "Taylor Morgan", email: `taylor+${index}@example.com`, subject: "Website inquiry", message: "Please send details about services and availability." },
      status: "NEW",
      sourceIpHash: `seed-source-${index}`,
    },
  });

  const products = await Promise.all([
    db.product.create({ data: { organizationId: organization.id, sku: `SVC-${index}01`, name: index === 0 ? "Annual service plan" : index === 1 ? "Strategy sprint" : "Comprehensive exam", type: "SERVICE", price: 1200 + index * 800, cost: 280 + index * 120 } }),
    db.product.create({ data: { organizationId: organization.id, sku: `SVC-${index}02`, name: index === 0 ? "Emergency visit" : index === 1 ? "Identity system" : "Whitening treatment", type: "SERVICE", price: 450 + index * 900, cost: 95 + index * 75 } }),
  ]);
  const invoice = await db.invoice.create({
    data: {
      organizationId: organization.id, accountId: accounts[0].id, contactId: contacts[0].id, invoiceNumber: `CK-${index + 1}048`, status: InvoiceStatus.PARTIALLY_PAID,
      issueDate: date(-14), dueDate: date(7), subtotal: 4800 + index * 1200, taxTotal: 0, total: 4800 + index * 1200, amountPaid: 1800, balanceDue: 3000 + index * 1200,
      publicTokenId: `seed-${spec.slug}-invoice`, notes: "Thank you for your business.",
      items: { create: [{ productId: products[0].id, description: products[0].name, quantity: 2, unitPrice: 1200 + index * 800, lineTotal: 2400 + index * 1600 }, { productId: products[1].id, description: products[1].name, quantity: 1, unitPrice: 2400 - index * 400, lineTotal: 2400 - index * 400, sortOrder: 1 }] },
    },
  });
  const payment = await db.payment.create({ data: { organizationId: organization.id, amount: 1800, status: "SUCCEEDED", method: "CARD", referenceNumber: `PAY-${index + 1}92`, receivedAt: date(-4) } });
  await db.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: invoice.id, amount: 1800 } });
  const vendor = await db.vendor.create({ data: { organizationId: organization.id, name: index === 0 ? "Metro Supply" : index === 1 ? "Type Foundry" : "Dental Supply Co.", email: `billing+${index}@vendor.example`, eligible1099: index === 1 } });
  await db.bill.create({ data: { organizationId: organization.id, vendorId: vendor.id, billNumber: `B-${index + 1}14`, status: "OPEN", issueDate: date(-8), dueDate: date(12), total: 1450 + index * 375, amountPaid: 0 } });
  await db.expense.createMany({ data: [
    { organizationId: organization.id, vendorId: vendor.id, description: "Operating supplies", amount: 684 + index * 110, incurredAt: date(-5), category: "Supplies" },
    { organizationId: organization.id, description: "Software subscriptions", amount: 249 + index * 45, incurredAt: date(-2), category: "Software" },
  ] });

  const ledger = await Promise.all([
    db.ledgerAccount.create({ data: { organizationId: organization.id, code: "1000", name: "Operating Cash", type: AccountType.ASSET, systemAccount: true } }),
    db.ledgerAccount.create({ data: { organizationId: organization.id, code: "1100", name: "Accounts Receivable", type: AccountType.ASSET, systemAccount: true } }),
    db.ledgerAccount.create({ data: { organizationId: organization.id, code: "4000", name: "Service Revenue", type: AccountType.INCOME, systemAccount: true } }),
    db.ledgerAccount.create({ data: { organizationId: organization.id, code: "6100", name: "Operating Expenses", type: AccountType.EXPENSE, systemAccount: true } }),
  ]);
  await db.journalEntry.create({
    data: {
      organizationId: organization.id, entryNumber: `JE-${index + 1}001`, entryDate: date(-14), description: `Invoice ${invoice.invoiceNumber}`, status: "POSTED", sourceModule: "INVOICE", sourceId: invoice.id, createdById: ownerId, postedAt: date(-14),
      lines: { create: [{ ledgerAccountId: ledger[1].id, debit: invoice.total, credit: 0 }, { ledgerAccountId: ledger[2].id, debit: 0, credit: invoice.total, sortOrder: 1 }] },
    },
  });
  const bank = await db.bankAccount.create({ data: { organizationId: organization.id, ledgerAccountId: ledger[0].id, institutionName: "ClearKey Demo Bank", accountName: "Operating checking", accountType: "CHECKING", mask: `${4200 + index}`, bookBalance: 38640 + index * 9200, availableBalance: 40120 + index * 8700, connectionStatus: "CONNECTED", lastSyncedAt: now } });
  await db.accountingPeriod.create({ data: { organizationId: organization.id, name: "Current operating period", startsOn: date(-30), endsOn: date(30), status: "OPEN" } });
  await db.reconciliationSession.create({ data: { organizationId: organization.id, ledgerAccountId: ledger[0].id, statementDate: date(-1), statementBalance: bank.bookBalance, clearedBalance: bank.bookBalance, difference: 0, status: "OPEN" } });
  await db.bankTransaction.createMany({ data: [
    { organizationId: organization.id, bankAccountId: bank.id, postedAt: date(-1), description: `Payment ${invoice.invoiceNumber}`, amount: 1800, direction: "CREDIT", category: "Customer payment", status: "MATCHED", matchedEntityType: "PAYMENT", matchedEntityId: payment.id, externalId: `${spec.slug}-bank-1` },
    { organizationId: organization.id, bankAccountId: bank.id, postedAt: date(-2), description: vendor.name, amount: -684 - index * 110, direction: "DEBIT", category: "Supplies", status: "REVIEW", externalId: `${spec.slug}-bank-2` },
  ] });

  const department = await db.department.create({ data: { organizationId: organization.id, name: index === 0 ? "Field Operations" : index === 1 ? "Creative" : "Patient Care", code: `D${index + 1}` } });
  const employee = await db.employee.create({ data: { organizationId: organization.id, departmentId: department.id, employeeNumber: `E-${index + 1}01`, firstName: index === 0 ? "Jordan" : index === 1 ? "Samira" : "Elena", lastName: index === 0 ? "Cole" : index === 1 ? "Nguyen" : "Ortiz", workEmail: `team+${index}@${spec.slug}.example`, jobTitle: index === 0 ? "Service Manager" : index === 1 ? "Design Director" : "Patient Coordinator", status: EmploymentStatus.ACTIVE, hireDate: date(-420), compensations: { create: { type: "SALARY", rate: 72000 + index * 8500, paySchedule: "BIWEEKLY", effectiveFrom: date(-365) } } } });
  await db.payrollConnection.create({ data: { organizationId: organization.id, mode: index === 1 ? PayrollMode.CONNECTED_PROVIDER : PayrollMode.EMBEDDED, provider: index === 1 ? "FINCH" : "CHECK", status: index === 2 ? IntegrationStatus.CONNECTING : IntegrationStatus.ACTIVE, lastSyncAt: index === 2 ? null : now, grantedScopes: ["employees", "payroll", "company"] } });
  await db.payrollRun.create({ data: { organizationId: organization.id, payPeriodStart: date(-14), payPeriodEnd: date(-1), checkDate: date(3), status: PayrollRunStatus.NEEDS_APPROVAL, grossPay: 48200 + index * 6200, employeeTaxes: 7100 + index * 850, employerTaxes: 4650 + index * 620, deductions: 3200 + index * 400, netPay: 37900 + index * 4930, totalEmployerCost: 52850 + index * 6820, employees: { create: { employeeId: employee.id, regularPay: 2769 + index * 325, employeeTaxes: 510, employerTaxes: 285, deductions: 180, netPay: 2079 + index * 325 } } } });
  await db.timeEntry.create({ data: { organizationId: organization.id, employeeId: employee.id, workDate: date(-1), regularHours: 8, overtimeHours: index === 0 ? 1.5 : 0, status: "SUBMITTED", notes: "Seeded time entry" } });
  await db.timeOffRequest.create({ data: { organizationId: organization.id, employeeId: employee.id, policyType: "PTO", startsOn: date(14), endsOn: date(15), hours: 16, status: "PENDING", note: "Seeded request for approval testing" } });

  await db.integration.createMany({ data: [
    { organizationId: organization.id, provider: "STRIPE", status: IntegrationStatus.ACTIVE, settings: { mode: "sandbox", purpose: "customer_payments" }, lastSyncAt: now },
    { organizationId: organization.id, provider: "QUICKBOOKS", status: index === 1 ? IntegrationStatus.ACTIVE : IntegrationStatus.DISCONNECTED, settings: { environment: "sandbox" }, lastSyncAt: index === 1 ? now : null },
    { organizationId: organization.id, provider: "POSTHOG", status: IntegrationStatus.ACTIVE, settings: { purpose: "product_analytics" }, lastSyncAt: now },
  ] });
  await db.webhookEvent.create({ data: { organizationId: organization.id, provider: "STRIPE", externalEventId: `evt_seed_failed_${index}`, eventType: "payment_intent.payment_failed", payload: { seeded: true, invoiceId: invoice.id }, status: "FAILED", attempts: 2, lastError: "Seeded provider timeout for replay testing." } });
  await db.automationRule.create({ data: { organizationId: organization.id, name: "Overdue invoice reminder", triggerType: "INVOICE_OVERDUE", conditions: [{ field: "balanceDue", operator: "gt", value: 0 }], actions: [{ type: "SEND_EMAIL", template: "Payment reminder" }], active: true, lastRunAt: date(-1) } });
  await db.emailTemplate.create({ data: { organizationId: organization.id, name: "Payment reminder", subject: `A friendly reminder from ${spec.name}`, bodyHtml: "<p>Your invoice is ready for review. Please contact us with any questions.</p>", category: "BILLING" } });
  await db.emailMessage.create({ data: { organizationId: organization.id, recipientEmail: contacts[0].email!, recipientName: `${contacts[0].firstName} ${contacts[0].lastName}`, subject: `Invoice ${invoice.invoiceNumber}`, bodyHtml: "<p>Your invoice is available in your secure portal.</p>", status: "DELIVERED", sentAt: date(-3), deliveredAt: date(-3), relatedType: "INVOICE", relatedId: invoice.id } });
  await db.notification.create({ data: { organizationId: organization.id, userId: ownerId, type: "ACTION_REQUIRED", title: "Payroll is ready for approval", body: "Review hours, taxes, and employer cost before submission.", actionUrl: `/app/${spec.slug}/payroll` } });
  await db.auditLog.create({ data: { organizationId: organization.id, actorUserId: ownerId, sequence: BigInt(1), action: "organization.seeded", entityType: "Organization", entityId: organization.id, category: "ADMIN", recordHash: `seed-${organization.id}`, previousHash: "GENESIS", metadata: { source: "scripts/seed.ts" } } });
  await db.auditChainHead.create({ data: { organizationId: organization.id, lastSequence: BigInt(1), lastHash: `seed-${organization.id}` } });
}

async function main() {
  await db.pricingConfig.updateMany({ data: { active: false } });
  await db.pricingConfig.upsert({
    where: { pricingVersion: "2026-v1" },
    update: {
      active: true,
      config: {
        tiers: {
          starter: { minUsers: 1, maxUsers: 49, baseCents: 7900, includedUsers: 5, extraUserCents: 800 },
          growth: { minUsers: 50, maxUsers: 99, baseCents: 49900, includedUsers: 50, extraUserCents: 700 },
          enterprise: { minUsers: 100, maxUsers: null, customQuoteRequired: true },
        },
        modules: {
          starter: { accounting: 3900, workforce: 2900, scheduling: 1900, timeClock: 900, marketing: 2900, payroll: 2900, advancedAi: 2900, advancedAnalytics: 2900, premiumTemplates: 900, managedDomain: 200 },
          growth: { accounting: 9900, workforce: 7900, scheduling: 4900, timeClock: 2900, marketing: 7900, payroll: 7900, advancedAi: 7900, advancedAnalytics: 7900, premiumTemplates: 1900, managedDomain: 200 },
        },
        email: { managedMailboxCents: 400 },
      },
    },
    create: {
      pricingVersion: "2026-v1",
      active: true,
      config: {
        tiers: {
          starter: { minUsers: 1, maxUsers: 49, baseCents: 7900, includedUsers: 5, extraUserCents: 800 },
          growth: { minUsers: 50, maxUsers: 99, baseCents: 49900, includedUsers: 50, extraUserCents: 700 },
          enterprise: { minUsers: 100, maxUsers: null, customQuoteRequired: true },
        },
        modules: {
          starter: { accounting: 3900, workforce: 2900, scheduling: 1900, timeClock: 900, marketing: 2900, payroll: 2900, advancedAi: 2900, advancedAnalytics: 2900, premiumTemplates: 900, managedDomain: 200 },
          growth: { accounting: 9900, workforce: 7900, scheduling: 4900, timeClock: 2900, marketing: 7900, payroll: 7900, advancedAi: 7900, advancedAnalytics: 7900, premiumTemplates: 1900, managedDomain: 200 },
        },
        email: { managedMailboxCents: 400 },
      },
    },
  });
  const existingOrganizations = await db.organization.findMany({
    where: { slug: { in: organizations.map((organization) => organization.slug) } },
    select: { id: true },
  });
  const existingOrganizationIds = existingOrganizations.map((organization) => organization.id);
  if (existingOrganizationIds.length) {
    await db.paymentAllocation.deleteMany({
      where: { invoice: { organizationId: { in: existingOrganizationIds } } },
    });
    await db.journalLine.deleteMany({
      where: { journalEntry: { organizationId: { in: existingOrganizationIds } } },
    });
    await db.payrollRunEmployee.deleteMany({
      where: { payrollRun: { organizationId: { in: existingOrganizationIds } } },
    });
    await db.organization.deleteMany({ where: { id: { in: existingOrganizationIds } } });
  }
  const owner = await db.user.upsert({
    where: { email: "1morecruise@gmail.com" },
    update: { firstName: "Caleb", lastName: "Owen", platformAdmin: true },
    create: { clerkUserId: "seed_caleb_owner", email: "1morecruise@gmail.com", firstName: "Caleb", lastName: "Owen", platformAdmin: true },
  });
  for (const [index, organization] of organizations.entries()) await seedOrganization(organization, owner.id, index);
  console.log(`Seeded ${organizations.length} organizations`);
}

main().finally(async () => db.$disconnect());
