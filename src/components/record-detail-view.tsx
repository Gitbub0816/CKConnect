import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Headphones,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  addEntityNote,
  changeDealStage,
  convertLead,
  updateWorkspaceRecord,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type NoteRecord = { id: string; body: string; createdAt: string | null };
type RelatedRecord = Record<string, unknown>;

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldGrid({
  fields,
}: {
  fields: { label: string; value: string | null | undefined }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(({ label, value }) => (
        <div className="rounded-lg bg-[#f8f5ef] p-4" key={label}>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </dt>
          <dd className="mt-2 text-sm font-medium">
            {value ?? <span className="text-slate-400">Not set</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NotesTimeline({
  notes,
  relatedType,
  relatedId,
  organizationSlug,
}: {
  notes: NoteRecord[];
  relatedType: string;
  relatedId: string;
  organizationSlug: string;
}) {
  return (
    <section className="ck-card overflow-hidden">
      <div className="flex items-center gap-2 border-b p-5">
        <MessageSquare className="text-[#9b7420]" size={18} />
        <h3 className="font-semibold">Activity &amp; notes</h3>
      </div>
      <form
        action={addEntityNote}
        className="grid gap-3 border-b bg-[#f8f5ef] p-5 md:grid-cols-[160px_1fr_auto] md:items-end"
      >
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <input name="relatedType" type="hidden" value={relatedType} />
        <input name="relatedId" type="hidden" value={relatedId} />
        <label className="text-xs font-semibold text-slate-600">
          Note type
          <select className="ck-input mt-2" name="noteType">
            <option value="GENERAL">General</option>
            <option value="CALL">Call log</option>
            <option value="MEETING">Meeting</option>
            <option value="EMAIL">Email</option>
            <option value="RISK">Risk flag</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Note
          <input
            className="ck-input mt-2"
            name="body"
            placeholder="Add context, next commitment, or outcome…"
            required
          />
        </label>
        <button className="ck-button" type="submit">
          Save
        </button>
      </form>
      <div className="divide-y">
        {notes.map((note) => (
          <div className="p-5" key={note.id}>
            <p className="text-sm leading-6">{note.body}</p>
            <p className="mt-2 text-[10px] font-medium text-slate-400">
              {note.createdAt
                ? new Date(note.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </div>
        ))}
        {!notes.length && (
          <div className="p-8 text-center text-sm text-slate-400">
            No notes yet. Add the first one above.
          </div>
        )}
      </div>
    </section>
  );
}

function RelatedList({
  title,
  icon: Icon,
  items,
  renderLine,
  href,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: RelatedRecord[];
  renderLine: (item: RelatedRecord) => string;
  href?: (item: RelatedRecord) => string;
}) {
  return (
    <section className="ck-card overflow-hidden">
      <div className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-2">
          <Icon className="text-[#9b7420]" size={18} />
          <h3 className="font-semibold">
            {title}{" "}
            <span className="font-normal text-slate-400">({items.length})</span>
          </h3>
        </div>
      </div>
      <div className="divide-y">
        {items.slice(0, 10).map((item) =>
          href ? (
            <Link
              className="flex items-center justify-between p-4 text-sm hover:bg-amber-50"
              href={href(item)}
              key={String(item.id)}
            >
              <span>{renderLine(item)}</span>
              <ChevronRight className="shrink-0 text-slate-400" size={14} />
            </Link>
          ) : (
            <div className="p-4 text-sm" key={String(item.id)}>
              {renderLine(item)}
            </div>
          ),
        )}
        {!items.length && (
          <div className="p-6 text-center text-sm text-slate-400">
            No related records.
          </div>
        )}
      </div>
    </section>
  );
}

function EditCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="ck-card overflow-hidden">
      <div className="flex items-center gap-2 border-b p-5">
        <Icon className="text-[#9b7420]" size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ── Contact detail ──────────────────────────────────────────────────────────

type ContactDetail = {
  kind: "contact";
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  jobTitle: string | null;
  lifecycleStatus: string;
  preferredContactMethod: string | null;
  emailOptOut: boolean;
  smsOptOut: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  account: { id: string; name: string; type: string } | null;
  deals: RelatedRecord[];
  cases: RelatedRecord[];
  activities: RelatedRecord[];
  notes: NoteRecord[];
  invoices: RelatedRecord[];
};

function ContactDetailView({
  record,
  organizationSlug,
}: {
  record: ContactDetail;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-6">
      <header className="ck-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill>{record.lifecycleStatus.replaceAll("_", " ")}</Pill>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {record.name}
            </h1>
            {record.jobTitle && (
              <p className="mt-1 text-slate-500">
                {record.jobTitle}
                {record.account && (
                  <>
                    {" "}
                    at{" "}
                    <Link
                      className="font-semibold text-[#8b6914] hover:underline"
                      href={`/app/${organizationSlug}/accounts/${record.account.id}`}
                    >
                      {record.account.name}
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {record.email && (
              <a
                className="ck-button ck-button-secondary"
                href={`mailto:${record.email}`}
              >
                <Mail size={14} />
                Email
              </a>
            )}
            {record.phone && (
              <a
                className="ck-button ck-button-secondary"
                href={`tel:${record.phone}`}
              >
                <Phone size={14} />
                Call
              </a>
            )}
          </div>
        </div>
      </header>

      <FieldGrid
        fields={[
          { label: "Email", value: record.email },
          { label: "Phone", value: record.phone },
          { label: "Mobile", value: record.mobile },
          { label: "Lifecycle", value: record.lifecycleStatus },
          {
            label: "Preferred contact",
            value: record.preferredContactMethod,
          },
          {
            label: "Account",
            value: record.account?.name,
          },
          {
            label: "Email opt-out",
            value: record.emailOptOut ? "Yes" : "No",
          },
          {
            label: "Created",
            value: record.createdAt
              ? new Date(record.createdAt).toLocaleDateString()
              : null,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <EditCard icon={Pencil} title="Edit contact">
            <form action={updateWorkspaceRecord} className="grid gap-3 sm:grid-cols-2">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="module" type="hidden" value="contacts" />
              <input name="recordId" type="hidden" value={record.id} />
              <label className="text-xs font-semibold text-slate-600">
                First name
                <input className="ck-input mt-1" defaultValue={record.firstName} name="firstName" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Last name
                <input className="ck-input mt-1" defaultValue={record.lastName ?? ""} name="lastName" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Email
                <input className="ck-input mt-1" defaultValue={record.email ?? ""} name="email" type="email" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Phone
                <input className="ck-input mt-1" defaultValue={record.phone ?? ""} name="phone" type="tel" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Mobile
                <input className="ck-input mt-1" defaultValue={record.mobile ?? ""} name="mobile" type="tel" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Job title
                <input className="ck-input mt-1" defaultValue={record.jobTitle ?? ""} name="jobTitle" />
              </label>
              <div className="col-span-full">
                <button className="ck-button" type="submit">Save changes</button>
              </div>
            </form>
          </EditCard>
          <NotesTimeline
            notes={record.notes}
            organizationSlug={organizationSlug}
            relatedId={record.id}
            relatedType="Contact"
          />
        </div>
        <div className="space-y-4">
          <RelatedList
            href={(item) =>
              `/app/${organizationSlug}/deals/${String(item.id)}`
            }
            icon={TrendingUp}
            items={record.deals}
            renderLine={(d) =>
              `${String(d.name)} · ${formatCurrency(Number(d.amount))} · ${String(d.stage).replaceAll("_", " ")}`
            }
            title="Deals"
          />
          <RelatedList
            icon={Headphones}
            items={record.cases}
            renderLine={(c) =>
              `${String(c.number)} · ${String(c.subject)} · ${String(c.status)}`
            }
            title="Cases"
          />
          <RelatedList
            href={(item) =>
              `/app/${organizationSlug}/invoices/${String(item.id)}`
            }
            icon={FileText}
            items={record.invoices}
            renderLine={(i) =>
              `${String(i.number)} · ${formatCurrency(Number(i.balance))} due · ${String(i.status)}`
            }
            title="Invoices"
          />
        </div>
      </div>
    </div>
  );
}

// ── Lead detail ──────────────────────────────────────────────────────────────

type LeadDetail = {
  kind: "lead";
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  score: number;
  estimatedValue: number;
  rating: string | null;
  convertedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notes: NoteRecord[];
};

const dealStages = [
  "PROSPECTING",
  "QUALIFICATION",
  "NEEDS_ANALYSIS",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

function LeadDetailView({
  record,
  organizationSlug,
}: {
  record: LeadDetail;
  organizationSlug: string;
}) {
  const priority =
    record.score >= 80 ? "HOT" : record.score >= 60 ? "WARM" : "NURTURE";
  return (
    <div className="space-y-6">
      <header className="ck-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Pill tone={record.score >= 80 ? "danger" : "warning"}>
                {priority}
              </Pill>
              <Pill>{record.status.replaceAll("_", " ")}</Pill>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {record.name}
            </h1>
            <p className="mt-1 text-slate-500">
              {record.company ?? "Individual"} · Score {record.score} · Est.{" "}
              {formatCurrency(record.estimatedValue)}
            </p>
          </div>
          <div className="flex gap-2">
            {record.email && (
              <a
                className="ck-button ck-button-secondary"
                href={`mailto:${record.email}`}
              >
                <Mail size={14} />
                Email
              </a>
            )}
            {record.phone && (
              <a
                className="ck-button ck-button-secondary"
                href={`tel:${record.phone}`}
              >
                <Phone size={14} />
                Call
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FieldGrid
            fields={[
              { label: "Email", value: record.email },
              { label: "Phone", value: record.phone },
              { label: "Company", value: record.company },
              { label: "Source", value: record.source },
              { label: "Status", value: record.status },
              { label: "Score", value: String(record.score) },
              {
                label: "Estimated value",
                value: formatCurrency(record.estimatedValue),
              },
              {
                label: "Created",
                value: record.createdAt
                  ? new Date(record.createdAt).toLocaleDateString()
                  : null,
              },
            ]}
          />
          <NotesTimeline
            notes={record.notes}
            organizationSlug={organizationSlug}
            relatedId={record.id}
            relatedType="Lead"
          />
        </div>
        <aside className="space-y-4">
          <EditCard icon={Pencil} title="Edit lead">
            <form action={updateWorkspaceRecord} className="grid gap-3 sm:grid-cols-2">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="module" type="hidden" value="leads" />
              <input name="recordId" type="hidden" value={record.id} />
              <label className="text-xs font-semibold text-slate-600">
                First name
                <input className="ck-input mt-1" defaultValue={record.firstName} name="firstName" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Last name
                <input className="ck-input mt-1" defaultValue={record.lastName ?? ""} name="lastName" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Email
                <input className="ck-input mt-1" defaultValue={record.email ?? ""} name="email" type="email" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Phone
                <input className="ck-input mt-1" defaultValue={record.phone ?? ""} name="phone" type="tel" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Company
                <input className="ck-input mt-1" defaultValue={record.company ?? ""} name="company" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Source
                <select className="ck-input mt-1" defaultValue={record.source ?? ""} name="source">
                  <option value="">Unknown</option>
                  <option value="Manual">Manual</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Event">Event</option>
                  <option value="Partner">Partner</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Rating
                <select className="ck-input mt-1" defaultValue={record.rating ?? ""} name="rating">
                  <option value="">Not set</option>
                  <option value="HOT">Hot</option>
                  <option value="WARM">Warm</option>
                  <option value="COLD">Cold</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Est. value ($)
                <input className="ck-input mt-1" defaultValue={record.estimatedValue || ""} min="0" name="estimatedValue" step="0.01" type="number" />
              </label>
              <div className="col-span-full">
                <button className="ck-button" type="submit">Save changes</button>
              </div>
            </form>
          </EditCard>
          {record.status !== "CONVERTED" && (
            <form
              action={convertLead}
              className="ck-card p-5"
            >
              <input
                name="organizationSlug"
                type="hidden"
                value={organizationSlug}
              />
              <input name="entityId" type="hidden" value={record.id} />
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="text-[#9b7420]" size={18} />
                Convert lead
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Creates or links the company and contact, transfers attribution,
                and records the conversion event.
              </p>
              <label className="mt-4 flex items-center gap-2 text-xs font-medium">
                <input defaultChecked name="createDeal" type="checkbox" />
                Create an opportunity
              </label>
              <button className="ck-button mt-4 w-full" type="submit">
                Convert and continue <ArrowRight size={14} />
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Deal detail ──────────────────────────────────────────────────────────────

type DealDetail = {
  kind: "deal";
  id: string;
  name: string;
  stage: string;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  nextStep: string | null;
  lossReason: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  account: { id: string; name: string; type: string } | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  notes: NoteRecord[];
};

function DealDetailView({
  record,
  organizationSlug,
}: {
  record: DealDetail;
  organizationSlug: string;
}) {
  const daysToClose = record.expectedCloseDate
    ? Math.ceil(
        (new Date(record.expectedCloseDate).getTime() - Date.now()) /
          86_400_000,
      )
    : null;
  return (
    <div className="space-y-6">
      <header className="ck-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill
              tone={record.stage.startsWith("CLOSED") ? "success" : "warning"}
            >
              {record.stage.replaceAll("_", " ")}
            </Pill>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {record.name}
            </h1>
            {record.account && (
              <p className="mt-1 text-slate-500">
                <Link
                  className="font-semibold text-[#8b6914] hover:underline"
                  href={`/app/${organizationSlug}/accounts/${record.account.id}`}
                >
                  {record.account.name}
                </Link>
                {record.contact && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      className="hover:underline"
                      href={`/app/${organizationSlug}/contacts/${record.contact.id}`}
                    >
                      {record.contact.name}
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tracking-tight">
              {formatCurrency(record.amount)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {record.probability}% ·{" "}
              {formatCurrency((record.amount * record.probability) / 100)}{" "}
              weighted
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-[#c9a033] transition-all"
            style={{ width: `${record.probability}%` }}
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FieldGrid
            fields={[
              {
                label: "Close date",
                value: record.expectedCloseDate
                  ? new Date(record.expectedCloseDate).toLocaleDateString()
                  : null,
              },
              {
                label: "Days to close",
                value:
                  daysToClose !== null
                    ? daysToClose < 0
                      ? `${Math.abs(daysToClose)} days overdue`
                      : `${daysToClose} days`
                    : "No date set",
              },
              { label: "Next step", value: record.nextStep },
              { label: "Loss reason", value: record.lossReason },
              { label: "Currency", value: record.currency },
              {
                label: "Created",
                value: record.createdAt
                  ? new Date(record.createdAt).toLocaleDateString()
                  : null,
              },
            ]}
          />
          <NotesTimeline
            notes={record.notes}
            organizationSlug={organizationSlug}
            relatedId={record.id}
            relatedType="Deal"
          />
        </div>
        <aside className="space-y-4">
          <form action={changeDealStage} className="ck-card p-5">
            <input
              name="organizationSlug"
              type="hidden"
              value={organizationSlug}
            />
            <input name="entityId" type="hidden" value={record.id} />
            <div className="flex items-center gap-2 font-semibold">
              <TrendingUp className="text-[#9b7420]" size={18} />
              Move stage
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Stage
              <select
                className="ck-input mt-2"
                defaultValue={record.stage}
                name="stage"
              >
                {dealStages.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Required next step
              <input
                className="ck-input mt-2"
                defaultValue={record.nextStep ?? ""}
                name="nextStep"
                placeholder="Owner commitment"
              />
            </label>
            <button className="ck-button mt-4 w-full" type="submit">
              Update stage
            </button>
          </form>
          <EditCard icon={Pencil} title="Edit deal">
            <form action={updateWorkspaceRecord} className="grid gap-3">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="module" type="hidden" value="deals" />
              <input name="recordId" type="hidden" value={record.id} />
              <label className="text-xs font-semibold text-slate-600">
                Deal name
                <input className="ck-input mt-1" defaultValue={record.name} name="name" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Amount ($)
                  <input className="ck-input mt-1" defaultValue={record.amount} min="0" name="amount" step="0.01" type="number" />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Probability %
                  <input className="ck-input mt-1" defaultValue={record.probability} max="100" min="0" name="probability" type="number" />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-600">
                Expected close date
                <input
                  className="ck-input mt-1"
                  defaultValue={record.expectedCloseDate ? new Date(record.expectedCloseDate).toISOString().slice(0, 10) : ""}
                  name="closeDate"
                  type="date"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Next step
                <input className="ck-input mt-1" defaultValue={record.nextStep ?? ""} name="nextStep" placeholder="Owner commitment" />
              </label>
              <button className="ck-button w-full" type="submit">Save changes</button>
            </form>
          </EditCard>
          {record.contact && (
            <div className="ck-card p-5">
              <div className="flex items-center gap-2 font-semibold">
                <UserRound className="text-[#9b7420]" size={18} />
                Primary contact
              </div>
              <p className="mt-3 font-medium">{record.contact.name}</p>
              <div className="mt-3 flex gap-2">
                {record.contact.email && (
                  <a
                    className="ck-button ck-button-secondary text-xs"
                    href={`mailto:${record.contact.email}`}
                  >
                    <Mail size={13} />
                    Email
                  </a>
                )}
                {record.contact.phone && (
                  <a
                    className="ck-button ck-button-secondary text-xs"
                    href={`tel:${record.contact.phone}`}
                  >
                    <Phone size={13} />
                    Call
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Account detail ───────────────────────────────────────────────────────────

type AccountDetail = {
  kind: "account";
  id: string;
  name: string;
  accountType: string;
  website: string | null;
  phone: string | null;
  industry: string | null;
  annualRevenue: number;
  createdAt: string | null;
  updatedAt: string | null;
  lifetimeValue: number;
  openPipeline: number;
  receivable: number;
  contacts: RelatedRecord[];
  deals: RelatedRecord[];
  invoices: RelatedRecord[];
  cases: RelatedRecord[];
  notes: NoteRecord[];
};

function AccountDetailView({
  record,
  organizationSlug,
}: {
  record: AccountDetail;
  organizationSlug: string;
}) {
  return (
    <div className="space-y-6">
      <header className="ck-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill>{record.accountType.replaceAll("_", " ")}</Pill>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {record.name}
            </h1>
            <p className="mt-1 text-slate-500">
              {record.industry ?? "Uncategorized industry"}
              {record.phone && ` · ${record.phone}`}
              {record.website && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    className="hover:underline"
                    href={record.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {record.website}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Lifetime value",
              value: formatCurrency(record.lifetimeValue),
              icon: CircleDollarSign,
            },
            {
              label: "Open pipeline",
              value: formatCurrency(record.openPipeline),
              icon: TrendingUp,
            },
            {
              label: "Receivable",
              value: formatCurrency(record.receivable),
              icon: FileText,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div className="rounded-lg bg-[#f8f5ef] p-4" key={label}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Icon size={13} />
                {label}
              </div>
              <div className="mt-2 text-xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <EditCard icon={Pencil} title="Edit account">
            <form action={updateWorkspaceRecord} className="grid gap-3 sm:grid-cols-2">
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <input name="module" type="hidden" value="accounts" />
              <input name="recordId" type="hidden" value={record.id} />
              <label className="col-span-full text-xs font-semibold text-slate-600">
                Account name
                <input className="ck-input mt-1" defaultValue={record.name} name="name" required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Account type
                <select className="ck-input mt-1" defaultValue={record.accountType} name="accountType">
                  <option value="PROSPECT">Prospect</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="PARTNER">Partner</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="CHURNED">Churned</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Industry
                <input className="ck-input mt-1" defaultValue={record.industry ?? ""} name="industry" placeholder="e.g. Technology" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Phone
                <input className="ck-input mt-1" defaultValue={record.phone ?? ""} name="phone" type="tel" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Website
                <input className="ck-input mt-1" defaultValue={record.website ?? ""} name="website" type="url" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Annual revenue ($)
                <input className="ck-input mt-1" defaultValue={record.annualRevenue || ""} min="0" name="annualRevenue" step="1" type="number" />
              </label>
              <div className="col-span-full">
                <button className="ck-button" type="submit">Save changes</button>
              </div>
            </form>
          </EditCard>
          <NotesTimeline
            notes={record.notes}
            organizationSlug={organizationSlug}
            relatedId={record.id}
            relatedType="CrmAccount"
          />
        </div>
        <div className="space-y-4">
          <RelatedList
            href={(item) =>
              `/app/${organizationSlug}/contacts/${String(item.id)}`
            }
            icon={UserRound}
            items={record.contacts}
            renderLine={(c) =>
              `${String(c.name)} · ${String(c.title ?? c.lifecycle ?? "Contact")}`
            }
            title="Contacts"
          />
          <RelatedList
            href={(item) =>
              `/app/${organizationSlug}/deals/${String(item.id)}`
            }
            icon={TrendingUp}
            items={record.deals}
            renderLine={(d) =>
              `${String(d.name)} · ${formatCurrency(Number(d.amount))} · ${String(d.stage).replaceAll("_", " ")}`
            }
            title="Deals"
          />
          <RelatedList
            href={(item) =>
              `/app/${organizationSlug}/invoices/${String(item.id)}`
            }
            icon={FileText}
            items={record.invoices}
            renderLine={(i) =>
              `${String(i.number)} · ${formatCurrency(Number(i.balance))} due · ${String(i.status)}`
            }
            title="Invoices"
          />
          <RelatedList
            icon={Headphones}
            items={record.cases}
            renderLine={(c) =>
              `${String(c.number)} · ${String(c.subject)} · ${String(c.status)}`
            }
            title="Cases"
          />
        </div>
      </div>
    </div>
  );
}

// ── Invoice detail ───────────────────────────────────────────────────────────

type InvoiceDetail = {
  kind: "invoice";
  id: string;
  number: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  total: number;
  amountPaid: number;
  balanceDue: number;
  account: { id: string; name: string } | null;
  contact: { id: string; name: string; email: string | null } | null;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  payments: { id: string; amount: number; method: string | null; reference: string | null; receivedAt: string | null }[];
};

function InvoiceDetailView({
  record,
  organizationSlug,
}: {
  record: InvoiceDetail;
  organizationSlug: string;
}) {
  const paidPct = record.total
    ? Math.round((record.amountPaid / record.total) * 100)
    : 0;
  return (
    <div className="space-y-6">
      <header className="ck-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill
              tone={
                record.status === "PAID"
                  ? "success"
                  : record.balanceDue > 0 &&
                      record.dueDate &&
                      new Date(record.dueDate) < new Date()
                    ? "danger"
                    : "warning"
              }
            >
              {record.status.replaceAll("_", " ")}
            </Pill>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {record.number}
            </h1>
            <p className="mt-1 text-slate-500">
              {record.account && (
                <Link
                  className="font-semibold text-[#8b6914] hover:underline"
                  href={`/app/${organizationSlug}/accounts/${record.account.id}`}
                >
                  {record.account.name}
                </Link>
              )}
              {record.contact && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    className="hover:underline"
                    href={`/app/${organizationSlug}/contacts/${record.contact.id}`}
                  >
                    {record.contact.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tracking-tight">
              {formatCurrency(record.balanceDue)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              balance of {formatCurrency(record.total)}
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">{paidPct}% paid</div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="ck-card overflow-hidden">
          <div className="flex items-center gap-2 border-b p-5">
            <FileText className="text-[#9b7420]" size={18} />
            <h3 className="font-semibold">Line items</h3>
          </div>
          <div className="divide-y">
            {record.items.map((item, idx) => (
              <div
                className="flex items-center justify-between p-4 text-sm"
                key={idx}
              >
                <div>
                  <span className="font-medium">{item.description}</span>
                  <span className="ml-2 text-slate-400">
                    × {item.quantity} @ {formatCurrency(item.unitPrice)}
                  </span>
                </div>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
            <div className="flex items-center justify-between bg-[#f8f5ef] p-4 text-sm font-bold">
              <span>Total</span>
              <span>{formatCurrency(record.total)}</span>
            </div>
          </div>
        </section>
        <div className="space-y-4">
          <FieldGrid
            fields={[
              {
                label: "Issue date",
                value: record.issueDate
                  ? new Date(record.issueDate).toLocaleDateString()
                  : null,
              },
              {
                label: "Due date",
                value: record.dueDate
                  ? new Date(record.dueDate).toLocaleDateString()
                  : null,
              },
              {
                label: "Paid",
                value: formatCurrency(record.amountPaid),
              },
            ]}
          />
          <section className="ck-card overflow-hidden">
            <div className="flex items-center gap-2 border-b p-5">
              <BadgeCheck className="text-[#9b7420]" size={18} />
              <h3 className="font-semibold">Payment history</h3>
            </div>
            <div className="divide-y">
              {record.payments.map((payment) => (
                <div className="p-4 text-sm" key={payment.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatCurrency(payment.amount)}
                    </span>
                    <Pill tone="success">Received</Pill>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {payment.method ?? "Unknown method"}
                    {payment.reference && ` · Ref: ${payment.reference}`}
                    {payment.receivedAt &&
                      ` · ${new Date(payment.receivedAt).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
              {!record.payments.length && (
                <div className="p-6 text-center text-sm text-slate-400">
                  No payments recorded yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

type RecordDetail = ContactDetail | LeadDetail | DealDetail | AccountDetail | InvoiceDetail;

export function RecordDetailView({
  record,
  organizationSlug,
  backHref,
  backLabel,
}: {
  record: RecordDetail;
  organizationSlug: string;
  backHref: string;
  backLabel: string;
}) {
  const icon =
    record.kind === "contact" ? (
      <UserRound className="text-[#9b7420]" size={20} />
    ) : record.kind === "lead" ? (
      <Sparkles className="text-[#9b7420]" size={20} />
    ) : record.kind === "deal" ? (
      <TrendingUp className="text-[#9b7420]" size={20} />
    ) : record.kind === "account" ? (
      <Building2 className="text-[#9b7420]" size={20} />
    ) : (
      <FileText className="text-[#9b7420]" size={20} />
    );

  const displayName =
    record.kind === "contact" || record.kind === "lead"
      ? record.name
      : record.kind === "deal" || record.kind === "account"
        ? record.name
        : record.number;

  return (
    <div className="ck-module-page p-5 lg:p-7">
      <div className="mb-6 flex items-center gap-3">
        <Link
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          href={backHref}
        >
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
        <ChevronRight className="text-slate-300" size={14} />
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {displayName}
        </div>
      </div>

      {record.kind === "contact" ? (
        <ContactDetailView organizationSlug={organizationSlug} record={record} />
      ) : record.kind === "lead" ? (
        <LeadDetailView organizationSlug={organizationSlug} record={record} />
      ) : record.kind === "deal" ? (
        <DealDetailView organizationSlug={organizationSlug} record={record} />
      ) : record.kind === "account" ? (
        <AccountDetailView organizationSlug={organizationSlug} record={record} />
      ) : record.kind === "invoice" ? (
        <InvoiceDetailView organizationSlug={organizationSlug} record={record} />
      ) : null}
    </div>
  );
}
