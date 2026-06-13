export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
};

const reviewNotice = {
  heading: "Review status",
  body: "This is a product-integrated draft prepared for review by qualified legal counsel. Company identity, governing law, dispute terms, retention periods, jurisdictions, and contact addresses must be approved before production publication.",
};

const commonResponsibility = {
  heading: "Customer responsibility",
  body: "Customers are responsible for authorized use of their workspace, the accuracy and legality of submitted data, required notices and consents, human review of generated output, and compliance obligations specific to their business.",
};

const documents: LegalDocument[] = [
  ["terms", "Terms of Service", "The primary agreement governing access to ClearKey Connect.", "Accounts, authorized users, acceptable use, subscriptions, suspension, termination, intellectual property, third-party services, disclaimers, liability, disputes, and general contract terms."],
  ["privacy", "Privacy Policy", "How ClearKey Connect collects, uses, shares, secures, retains, and deletes personal information.", "Account data, business records, employee and customer information, payment metadata, device data, analytics, communications, legal bases, rights requests, transfers, subprocessors, retention, and children's privacy."],
  ["cookies", "Cookie Policy", "Cookies and similar technologies used by ClearKey Connect.", "Essential authentication cookies, preferences, analytics, performance measurement, optional marketing technologies, consent controls, duration, and browser controls."],
  ["acceptable-use", "Acceptable Use Policy", "Rules protecting customers, ClearKey, providers, and the public from misuse.", "Illegal activity, spam, malware, unauthorized access, credential sharing, scraping, abusive automation, mining, infringement, harassment, fraud, payment abuse, and subscription circumvention are prohibited."],
  ["subscription", "Subscription Agreement", "Commercial terms for monthly and annual ClearKey plans.", "Plans, trials, billing cycles, automatic renewal, upgrades, downgrades, cancellation, taxes, payment failures, suspension, and reinstatement."],
  ["billing", "Billing Policy", "How subscription charges, payment methods, credits, collections, and disputes are handled.", "Card and ACH authorization, invoices, retries, failed charges, credits, partial refunds, disputes, chargebacks, and collections."],
  ["payment-terms", "Customer Payment Terms", "Terms governing tenant customer payments orchestrated through connected providers.", "Tenant merchant accounts, provider checkout, direct settlement, refunds, disputes, payment metadata, provider availability, manual payments, and ClearKey's non-custodial role."],
  ["refunds", "Refund Policy", "Eligibility and procedures for requesting subscription refunds.", "Refund eligibility, non-refundable charges, trials, cancellation timing, billing errors, disputes, partial refunds, and chargebacks."],
  ["dpa", "Data Processing Addendum", "Business-customer terms for processing personal data.", "Controller and processor roles, instructions, confidentiality, security measures, subprocessors, international transfers, incident notice, audits, return, and deletion."],
  ["security", "Security Statement", "ClearKey's security and reliability practices.", "Encryption, Clerk authentication, MFA support, access controls, tenant isolation, logging, monitoring, backups, vulnerability management, incident response, and infrastructure providers."],
  ["ai-disclosure", "AI Feature Disclosure", "Important limitations for AI-assisted features.", "AI output may be incomplete or incorrect and requires human review. ClearKey does not provide legal, tax, accounting, employment, or financial advice through AI features."],
  ["accounting-disclaimer", "Accounting Disclaimer", "ClearKey provides accounting software tools, not professional accounting services.", "Customers remain responsible for bookkeeping choices, chart-of-account configuration, reconciliation, controls, compliance, reporting, and review by qualified professionals."],
  ["tax-disclaimer", "Tax Document Disclaimer", "Limitations applying to tax summaries, exports, and generated documents.", "ClearKey is not a CPA, tax preparer, attorney, or government agency. Draft forms and calculations require customer and professional review before filing."],
  ["api-terms", "API Terms", "Terms for using ClearKey public APIs, keys, webhooks, and SDKs.", "Authentication, key security, scopes, rate limits, acceptable use, data handling, revocation, compatibility, SDK licensing, and monitoring."],
  ["integration-terms", "Integration Terms", "Terms governing connections to third-party providers.", "Stripe, Stripe Connect, QuickBooks, Check, Finch, payroll providers, email, storage, tax services, synchronization delays, provider outages, imported data, and disconnection."],
  ["intellectual-property", "Intellectual Property Policy", "Ownership and permitted use of platform and customer content.", "ClearKey software, branding, trademarks, customer data and content, feedback, improvements, integrations, and license boundaries."],
  ["dmca", "DMCA and Copyright Policy", "How copyright owners and users may submit notices and counter-notices.", "Required notice content, designated contact, counter-notice process, repeat infringer response, restoration, and misrepresentation warnings."],
  ["law-enforcement", "Law Enforcement Request Policy", "How ClearKey evaluates government and law-enforcement requests.", "Valid legal process, jurisdiction, scope minimization, preservation requests, emergency requests, customer notice where permitted, and transparency."],
  ["accessibility", "Accessibility Statement", "ClearKey's commitment to accessible product experiences.", "WCAG-oriented design, keyboard support, semantic interfaces, ongoing testing, known limitations, accommodation requests, and issue reporting."],
  ["service-level", "Service Level Policy", "Availability goals and service communication practices.", "Availability target, measurement exclusions, planned maintenance, emergency maintenance, status communications, incident handling, and any applicable service credits."],
  ["incident-response", "Incident Response Policy", "How suspected security incidents are detected, contained, investigated, and communicated.", "Detection, triage, containment, evidence preservation, remediation, provider coordination, legally required customer notice, recovery, and post-incident review."],
  ["data-retention", "Data Retention Policy", "Retention standards for customer records and operational data.", "Active accounts, financial records, payroll imports, audit logs, security logs, payment metadata, deleted organizations, backups, legal holds, and final deletion."],
  ["account-deletion", "Account Deletion Policy", "The process and timing for closing a ClearKey workspace.", "Authorization, export opportunity, cancellation, grace period, disabling integrations, deletion queues, backup expiration, retained legal records, and confirmation."],
  ["cookie-banner", "Cookie Consent Banner Text", "Short-form consent language for optional browser technologies.", "ClearKey uses essential technologies to operate securely. With consent, optional analytics may be used to understand and improve the service. Users can accept, reject, or manage optional categories."],
  ["email-consent", "Email Communication Consent", "Rules for transactional, security, product, and marketing communications.", "Operational messages, invoices, reminders, security notices, product updates, marketing consent, sender identification, preference management, and unsubscribe rights."],
  ["electronic-consent", "Electronic Signature and Consent Policy", "Consent to electronic agreements, notices, records, and signatures.", "Click acceptance, continued use, electronic delivery, hardware and software requirements, withdrawal, paper copies, record retention, and updating contact details."],
].map(([slug, title, summary, scope]) => ({
  slug,
  title,
  summary,
  sections: [
    reviewNotice,
    { heading: "Scope", body: scope },
    commonResponsibility,
    {
      heading: "Contact and effective date",
      body: "The production version will state the legal entity, mailing address, legal and privacy contacts, effective date, revision date, and jurisdiction-specific supplements.",
    },
  ],
}));

export const legalDocuments = documents;

export function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === slug);
}
