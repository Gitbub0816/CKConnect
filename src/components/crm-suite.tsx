import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ContactRound,
  Headphones,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type CrmSection = {
  description: string;
  group: "Pipeline" | "Relationships" | "Engagement" | "Service" | "Operations";
  icon: LucideIcon;
  label: string;
  module: string;
  slug: string;
};

export const crmSections: CrmSection[] = [
  {
    slug: "overview",
    label: "Overview",
    description: "Relationship health, pipeline risk, service load, and next actions.",
    group: "Operations",
    module: "accounts",
    icon: Sparkles,
  },
  {
    slug: "leads",
    label: "Leads",
    description: "Capture, score, qualify, convert, and source-track new demand.",
    group: "Pipeline",
    module: "leads",
    icon: Sparkles,
  },
  {
    slug: "deals",
    label: "Deals",
    description: "Forecast opportunities, stage movement, next steps, and risk.",
    group: "Pipeline",
    module: "deals",
    icon: BriefcaseBusiness,
  },
  {
    slug: "accounts",
    label: "Accounts",
    description: "Account 360, customer value, open pipeline, receivables, and cases.",
    group: "Relationships",
    module: "accounts",
    icon: Building2,
  },
  {
    slug: "contacts",
    label: "Contacts",
    description: "People, roles, consent, preferences, lifecycle, and activity.",
    group: "Relationships",
    module: "contacts",
    icon: ContactRound,
  },
  {
    slug: "campaigns",
    label: "Campaigns",
    description: "Audiences, email campaigns, response rates, and conversion.",
    group: "Engagement",
    module: "campaigns",
    icon: Megaphone,
  },
  {
    slug: "email",
    label: "Email",
    description: "Templates, transactional history, campaign handoff, and consent.",
    group: "Engagement",
    module: "email",
    icon: Mail,
  },
  {
    slug: "collaboration",
    label: "Collaboration",
    description: "Customer spaces, team channels, messages, meetings, and shared context.",
    group: "Engagement",
    module: "collaboration",
    icon: MessageSquare,
  },
  {
    slug: "cases",
    label: "Cases",
    description: "Support tickets, service history, states, priority, and resolution.",
    group: "Service",
    module: "cases",
    icon: Headphones,
  },
  {
    slug: "tasks",
    label: "Tasks",
    description: "Follow-ups, due dates, owners, customer commitments, and completion.",
    group: "Operations",
    module: "tasks",
    icon: ListChecks,
  },
  {
    slug: "calendar",
    label: "Calendar",
    description: "Meetings, appointments, bookings, and customer commitments.",
    group: "Operations",
    module: "calendar",
    icon: CalendarCheck2,
  },
  {
    slug: "reports",
    label: "Reports",
    description: "Pipeline, sales activity, campaign attribution, and service dashboards.",
    group: "Operations",
    module: "reports",
    icon: BarChart3,
  },
  {
    slug: "automation",
    label: "Automation",
    description: "Lead routing, reminders, handoffs, lifecycle updates, and alerts.",
    group: "Operations",
    module: "automations",
    icon: Workflow,
  },
  {
    slug: "settings",
    label: "CRM settings",
    description: "Fields, permissions, assignment rules, pipelines, and data policies.",
    group: "Operations",
    module: "settings",
    icon: Settings,
  },
];

const groups = [
  "Pipeline",
  "Relationships",
  "Engagement",
  "Service",
  "Operations",
] as const;

export function getCrmSection(section = "overview") {
  return crmSections.find((item) => item.slug === section) ?? crmSections[0];
}

export function CrmSuite({
  activeSection,
  children,
  organizationSlug,
}: {
  activeSection: string;
  children: React.ReactNode;
  organizationSlug: string;
}) {
  const base = `/app/${organizationSlug}/crm`;
  const active = getCrmSection(activeSection);
  const workQueue = [
    {
      label: "Qualify leads",
      href: `${base}/leads`,
      icon: Sparkles,
      detail: "Score, assign, and convert inbound demand.",
    },
    {
      label: "Move pipeline",
      href: `${base}/deals`,
      icon: BriefcaseBusiness,
      detail: "Update stages, next steps, probability, and forecast.",
    },
    {
      label: "Open account 360",
      href: `${base}/accounts`,
      icon: Building2,
      detail: "Inspect customer value, cases, contacts, invoices, and notes.",
    },
    {
      label: "Resolve cases",
      href: `${base}/cases`,
      icon: Headphones,
      detail: "Triage service status and customer-facing updates.",
    },
    {
      label: "Launch campaign",
      href: `${base}/campaigns`,
      icon: Megaphone,
      detail: "Build audiences, message, launch, and measure.",
    },
    {
      label: "Review CRM reports",
      href: `${base}/reports`,
      icon: BarChart3,
      detail: "Pipeline, win/loss, attribution, and team performance.",
    },
  ];
  const commandGroups = [
    {
      label: "Prospecting",
      commands: [
        ["Capture lead", `${base}/leads`],
        ["Score queue", `${base}/leads`],
        ["Convert lead", `${base}/leads`],
        ["Assign owner", `${base}/leads`],
        ["Create task", `${base}/tasks`],
        ["Launch sequence", `${base}/email`],
      ],
    },
    {
      label: "Selling",
      commands: [
        ["New opportunity", `${base}/deals`],
        ["Move stage", `${base}/deals`],
        ["Update forecast", `${base}/deals`],
        ["Log next step", `${base}/deals`],
        ["Review risk", `${base}/deals`],
        ["Create invoice handoff", `/app/${organizationSlug}/accounting/sales-invoices`],
      ],
    },
    {
      label: "Customer",
      commands: [
        ["Account 360", `${base}/accounts`],
        ["Add contact", `${base}/contacts`],
        ["Add note", `${base}/accounts`],
        ["Open workspace", `${base}/collaboration`],
        ["Schedule meeting", `${base}/calendar`],
        ["Review receivables", `/app/${organizationSlug}/accounting/sales-invoices`],
      ],
    },
    {
      label: "Service",
      commands: [
        ["Create case", `${base}/cases`],
        ["Escalate issue", `${base}/cases`],
        ["Customer update", `${base}/cases`],
        ["Campaign feedback", `${base}/campaigns`],
        ["Service dashboard", `${base}/reports`],
        ["Automation rules", `${base}/automation`],
      ],
    },
  ];
  const lifecycle = [
    ["Acquire", "Lead capture", "Qualification", "Conversion", "First task"],
    ["Sell", "Opportunity", "Stage gates", "Forecast", "Won handoff"],
    ["Serve", "Workspace", "Cases", "Meetings", "Customer update"],
    ["Retain", "Health", "Campaigns", "Renewal", "Expansion"],
  ];

  return (
    <div className="ck-suite space-y-5 p-5 lg:p-7">
      <section className="ck-card ck-suite-hero overflow-hidden">
        <div className="grid gap-5 border-b p-5 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="ck-eyebrow">
              {organizationSlug.replaceAll("-", " ")}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              CRM command center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              A full relationship suite for lead capture, account management,
              pipeline, customer service, campaigns, activity, reporting, and
              automation.
            </p>
          </div>
          <div className="ck-suite-current rounded-lg border bg-[#f8f5ef] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="text-[#9b7420]" size={17} />
              Active workspace
            </div>
            <h2 className="mt-3 text-xl font-semibold">{active.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {active.description}
            </p>
          </div>
        </div>
        <div className="ck-suite-tabs grid gap-px bg-slate-200 xl:grid-cols-5">
          {groups.map((group) => (
            <div className="ck-suite-tab-group bg-white p-4" key={group}>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
                {group}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 xl:block xl:space-y-2">
                {crmSections
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const selected = item.slug === active.slug;
                    return (
                      <Link
                        className={`ck-suite-tab inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition xl:flex ${
                          selected
                            ? "ck-suite-tab-active border-[#c9a033] bg-[#fff7df] text-[#5f4308]"
                            : "border-[#e0d5c5] bg-white hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
                        }`}
                        href={item.slug === "overview" ? base : `${base}/${item.slug}`}
                        key={item.slug}
                      >
                        <Icon size={14} />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="ck-card ck-command-panel h-fit overflow-hidden">
          <div className="border-b p-4">
            <div className="ck-eyebrow">Work queue</div>
            <h2 className="mt-2 font-semibold">CRM operating calls</h2>
          </div>
          <div className="divide-y">
            {workQueue.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className="ck-command-item block p-4 transition hover:bg-amber-50/60"
                  href={action.href}
                  key={action.label}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="text-[#9b7420]" size={16} />
                    {action.label}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {action.detail}
                  </p>
                </Link>
              );
            })}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="ck-card ck-ribbon-map overflow-hidden">
          <div className="border-b p-5">
            <div className="ck-eyebrow">Command ribbon</div>
            <h2 className="mt-2 font-semibold">CRM operating map</h2>
          </div>
          <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
            {commandGroups.map((group) => (
              <div className="ck-ribbon-group bg-white p-4" key={group.label}>
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <div className="mt-3 grid gap-2">
                  {group.commands.map(([label, href]) => (
                    <Link
                      className="ck-ribbon-command rounded-md border border-[#e0d5c5] px-3 py-2 text-xs font-semibold transition hover:border-[#b08a2f] hover:bg-[#fbf7ed]"
                      href={href}
                      key={label}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-5">
            <div className="grid gap-3">
              {lifecycle.map(([lane, ...steps]) => (
                <div
                  className="ck-flow-lane grid gap-2 rounded-lg border bg-[#fbfaf7] p-3 lg:grid-cols-[110px_1fr]"
                  key={lane}
                >
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                    {lane}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {steps.map((step, index) => (
                      <span
                        className="ck-flow-step rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold"
                        key={step}
                      >
                        {index + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="ck-card ck-control-panel h-fit p-5">
          <div className="ck-eyebrow">Governance</div>
          <h2 className="mt-2 font-semibold">CRM data and workflow controls</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              "Every customer action ties back to account, contact, deal, case, campaign, or task records.",
              "Stage gates make forecast changes explicit instead of letting deals drift.",
              "Account 360 keeps service history, invoices, contacts, and notes in one commercial record.",
              "Campaigns and email stay attached to customer consent and attribution.",
              "Reports and automations use the same tenant data model as operational screens.",
            ].map((item) => (
              <div className="ck-control-item rounded-lg border bg-[#fbfaf7] p-3" key={item}>
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
