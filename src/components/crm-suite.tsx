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
  return (
    <div className="ck-suite ck-product-workspace p-4 lg:p-6">
      <section className="ck-workspace-header">
        <div className="min-w-0">
          <div className="ck-breadcrumb">
            {organizationSlug.replaceAll("-", " ")} / CRM
          </div>
          <h1>{active.label}</h1>
          <p>{active.description}</p>
        </div>
        <div className="ck-commandbar" aria-label="CRM commands">
          <Link className="ck-command-primary" href={`${base}/leads`}>
            <Sparkles size={15} />
            New lead
          </Link>
          {workQueue.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <Link className="ck-command-button" href={action.href} key={action.label}>
                <Icon size={15} />
                {action.label}
              </Link>
            );
          })}
          <Link className="ck-command-button ck-command-more" href={`${base}/reports`}>
            More
          </Link>
        </div>
      </section>

      <nav className="ck-suite-nav" aria-label="CRM sections">
        {groups.map((group) => (
          <div className="ck-suite-nav-group" key={group}>
            <span>{group}</span>
            <div>
              {crmSections
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const selected = item.slug === active.slug;
                  return (
                    <Link
                      className={selected ? "is-active" : ""}
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
      </nav>

      <section className="ck-workspace-layout">
        <main className="ck-workspace-main">{children}</main>
        <aside className="ck-context-rail">
          <div className="ck-context-card">
            <div className="ck-context-title">
              <Sparkles size={16} />
              Context
            </div>
            <dl>
              <div>
                <dt>Area</dt>
                <dd>{active.label}</dd>
              </div>
              <div>
                <dt>Module</dt>
                <dd>{active.module.replaceAll("-", " ")}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>Growth</dd>
              </div>
            </dl>
          </div>
          <div className="ck-context-card">
            <div className="ck-context-title">Related work</div>
            {workQueue.map((action) => {
              const Icon = action.icon;
              return (
                <Link className="ck-context-link" href={action.href} key={action.label}>
                  <Icon size={14} />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
