import { Plus, Search, SlidersHorizontal } from "lucide-react";

const moduleCopy: Record<string, { title: string; description: string; action: string; columns: string[] }> = {
  leads: { title: "Leads", description: "Qualify and convert new opportunities.", action: "Add lead", columns: ["Lead", "Company", "Status", "Owner", "Next follow-up"] },
  accounts: { title: "Accounts", description: "Companies and customer organizations.", action: "Add account", columns: ["Account", "Type", "Owner", "Health", "Last activity"] },
  contacts: { title: "Contacts", description: "People, relationships, and communication preferences.", action: "Add contact", columns: ["Contact", "Account", "Email", "Lifecycle", "Owner"] },
  deals: { title: "Deals", description: "Pipeline, expected revenue, and forecasting.", action: "Add deal", columns: ["Opportunity", "Account", "Stage", "Value", "Close date"] },
  cases: { title: "Cases", description: "Customer support and service resolution.", action: "Create case", columns: ["Case", "Customer", "Priority", "Status", "Owner"] },
  campaigns: { title: "Campaigns", description: "Audience segments and source attribution.", action: "New campaign", columns: ["Campaign", "Type", "Status", "Members", "Conversions"] },
  tasks: { title: "Tasks", description: "Follow-ups, reminders, and team work.", action: "New task", columns: ["Task", "Related to", "Assignee", "Priority", "Due"] },
  calendar: { title: "Calendar", description: "Meetings, bookings, and team availability.", action: "New event", columns: ["Event", "Attendees", "Type", "Starts", "Owner"] },
  reports: { title: "Reports", description: "CRM, financial, and operational reporting.", action: "Build report", columns: ["Report", "Category", "Owner", "Schedule", "Last run"] },
  invoices: { title: "Invoices", description: "Issue, send, collect, and post receivables.", action: "New invoice", columns: ["Invoice", "Customer", "Status", "Due", "Balance"] },
  payments: { title: "Payments", description: "Customer payments, allocations, refunds, and disputes.", action: "Record payment", columns: ["Payment", "Customer", "Method", "Status", "Amount"] },
  expenses: { title: "Expenses", description: "Capture spending and supporting receipts.", action: "New expense", columns: ["Expense", "Vendor", "Category", "Date", "Amount"] },
  vendors: { title: "Vendors & bills", description: "Payables, vendors, and due-date control.", action: "New bill", columns: ["Vendor / bill", "Status", "Issue date", "Due date", "Balance"] },
  accounting: { title: "Accounting", description: "Posted journal entries and financial statements.", action: "Journal entry", columns: ["Entry", "Source", "Date", "Status", "Debits / credits"] },
  banking: { title: "Banking", description: "Imports, rules, matching, and reconciliation.", action: "Connect account", columns: ["Account", "Institution", "Book balance", "Bank balance", "Status"] },
  products: { title: "Products & inventory", description: "Services, stock, pricing, and cost.", action: "Add product", columns: ["Product", "SKU", "Type", "On hand", "Price"] },
  automations: { title: "Automations", description: "Event-driven workflows with visible run history.", action: "New automation", columns: ["Automation", "Trigger", "Status", "Last run", "Success rate"] },
  integrations: { title: "Integrations", description: "Stripe, QuickBooks, email, storage, and webhooks.", action: "Add integration", columns: ["Provider", "Purpose", "Status", "Last sync", "Action"] },
  team: { title: "Team & roles", description: "Membership, roles, permissions, and invitations.", action: "Invite member", columns: ["Member", "Role", "Status", "Last active", "MFA"] },
  audit: { title: "Audit log", description: "Immutable history for sensitive and financial activity.", action: "Export log", columns: ["Action", "Actor", "Entity", "IP address", "Time"] },
  settings: { title: "Settings", description: "Organization, billing, accounting, security, and data.", action: "Save changes", columns: ["Setting", "Value", "Scope", "Updated by", "Updated"] },
};

const sampleRows = [
  ["Harbor Dental Group", "Growth", "Active", "Caleb", "Today"],
  ["Northstar Home Services", "Customer", "Healthy", "Maya", "Yesterday"],
  ["Brightline Studio", "Prospect", "Review", "Jordan", "Jun 10"],
  ["Summit Field Co.", "Partner", "Active", "Caleb", "Jun 9"],
];

export function ModulePage({ module }: { module: string }) {
  const config = moduleCopy[module] ?? moduleCopy.settings;

  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{config.description}</p>
        </div>
        <button className="ck-button"><Plus size={15} />{config.action}</button>
      </div>

      <section className="ck-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <label className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input className="ck-input !pl-9" placeholder={`Search ${config.title.toLowerCase()}...`} />
          </label>
          <button className="ck-button ck-button-secondary"><SlidersHorizontal size={14} />Filters</button>
          <button className="ck-button ck-button-secondary">Saved views</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>{config.columns.map((column) => <th className="border-b px-4 py-3 font-semibold" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {sampleRows.map((row, rowIndex) => (
                <tr className="hover:bg-blue-50/40" key={row[0]}>
                  {config.columns.map((_, cellIndex) => (
                    <td className="border-b px-4 py-4" key={cellIndex}>
                      {cellIndex === 0 ? <span className="font-medium text-blue-700">{row[0]}</span> : row[(cellIndex + rowIndex) % row.length]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 text-xs text-slate-500">
          <span>Showing 4 sample records</span>
          <span>Live records appear after database setup</span>
        </div>
      </section>
    </div>
  );
}
