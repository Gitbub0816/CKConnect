import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Boxes,
  FileCheck2,
  Mail,
  MessageSquareText,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  addEntityNote,
  manageTaxDocument,
  markNotifications,
  updateProductOperations,
  verifyAuditContinuity,
} from "@/app/app/[organizationSlug]/actions";
import { formatCurrency } from "@/lib/utils";

type Value = Record<string, unknown>;

function pill(value: unknown, danger = false) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        danger ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {String(value ?? "Unknown").replaceAll("_", " ")}
    </span>
  );
}

function ContactsWorkbench({
  records,
  organizationSlug,
}: {
  records: Value[];
  organizationSlug: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {records.map((contact) => (
        <article className="ck-card p-5" key={String(contact.id)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              {pill(contact.lifecycle)}
              <h3 className="mt-3 text-lg font-semibold">
                {String(contact.name)}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {String(contact.title ?? "Contact")} at{" "}
                {String(contact.account ?? "unassigned account")}
              </p>
            </div>
            <div className="flex gap-2">
              {Boolean(contact.email) && (
                <a
                  aria-label={`Email ${String(contact.name)}`}
                  className="grid size-9 place-items-center rounded-lg border hover:bg-amber-50"
                  href={`mailto:${String(contact.email)}`}
                >
                  <Mail size={15} />
                </a>
              )}
              {Boolean(contact.phone) && (
                <a
                  aria-label={`Call ${String(contact.name)}`}
                  className="grid size-9 place-items-center rounded-lg border hover:bg-amber-50"
                  href={`tel:${String(contact.phone)}`}
                >
                  <Phone size={15} />
                </a>
              )}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-[#f8f5ef] p-4 text-xs">
            <div>
              <dt className="font-bold uppercase text-slate-400">Email</dt>
              <dd className="mt-1 truncate">
                {String(contact.email ?? "None")}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase text-slate-400">Preferred</dt>
              <dd className="mt-1">
                {String(contact.preferred ?? "Not specified")}
              </dd>
            </div>
          </dl>
          <form action={addEntityNote} className="mt-4 flex gap-2">
            <input
              name="organizationSlug"
              type="hidden"
              value={organizationSlug}
            />
            <input name="relatedType" type="hidden" value="CONTACT" />
            <input name="relatedId" type="hidden" value={String(contact.id)} />
            <input
              className="ck-input"
              name="body"
              placeholder="Add relationship note or follow-up context"
              required
            />
            <button
              aria-label={`Add note for ${String(contact.name)}`}
              className="ck-button shrink-0"
              type="submit"
            >
              <MessageSquareText size={14} />
              Add note
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}

function ProductsWorkbench({
  records,
  organizationSlug,
}: {
  records: Value[];
  organizationSlug: string;
}) {
  const active = records.filter((product) => product.active);
  const reorderQueue = records.filter((product) =>
    ["OUT_OF_STOCK", "REORDER"].includes(String(product.stockState)),
  );
  const inventoryValue = records.reduce(
    (sum, product) => sum + Number(product.inventoryValue ?? 0),
    0,
  );
  const retailValue = records.reduce(
    (sum, product) => sum + Number(product.retailValue ?? 0),
    0,
  );
  return (
    <div className="grid gap-4 2xl:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
        <section className="ck-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="text-[#9b7420]" size={18} />
            Inventory control
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Active SKUs", active.length],
              ["Reorder", reorderQueue.length],
              ["At cost", formatCurrency(inventoryValue)],
              ["Retail", formatCurrency(retailValue)],
            ].map(([label, value]) => (
              <div className="rounded-xl border bg-white p-3" key={String(label)}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {String(label)}
                </div>
                <div className="mt-1 text-lg font-semibold">{String(value)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Stock changes update product availability and are audit logged. Low
            inventory is calculated from each SKU reorder point.
          </p>
        </section>
        <section className="ck-card overflow-hidden">
          <div className="border-b p-4">
            <h3 className="font-semibold">Reorder queue</h3>
          </div>
          <div className="divide-y">
            {reorderQueue.map((product) => (
              <div className="p-4" key={String(product.id)}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{String(product.name)}</strong>
                  {pill(product.stockState, true)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Order {Number(product.reorderQuantity)} unit(s) to restore the
                  working level.
                </p>
              </div>
            ))}
            {!reorderQueue.length && (
              <p className="p-4 text-xs text-slate-500">
                No SKUs are currently below reorder point.
              </p>
            )}
          </div>
        </section>
      </aside>
      <section className="space-y-4">
      {records.map((product) => {
        const margin = Number(product.margin);
        const price = Number(product.price);
        const marginPercent = price ? Math.round((margin / price) * 100) : 0;
        const lowStock =
          Number(product.onHand) <= Number(product.reorderLevel ?? 0);
        return (
          <form
            action={updateProductOperations}
            className="ck-card grid gap-5 p-5 xl:grid-cols-[1fr_2.2fr_220px]"
            key={String(product.id)}
          >
            <input
              name="organizationSlug"
              type="hidden"
              value={organizationSlug}
            />
            <input name="entityId" type="hidden" value={String(product.id)} />
            <div>
              <div className="flex flex-wrap gap-2">
                {pill(product.type)}
                {lowStock &&
                  pill(
                    Number(product.onHand) === 0 ? "Out of stock" : "Reorder",
                    true,
                  )}
              </div>
              <h3 className="mt-3 text-lg font-semibold">
                {String(product.name)}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                SKU {String(product.sku ?? "not assigned")} · {marginPercent}%
                gross margin
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[#f8f5ef] p-3">
                  <div className="font-bold uppercase text-slate-400">
                    At cost
                  </div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(Number(product.inventoryValue ?? 0))}
                  </div>
                </div>
                <div className="rounded-lg bg-[#f8f5ef] p-3">
                  <div className="font-bold uppercase text-slate-400">
                    Reorder qty
                  </div>
                  <div className="mt-1 font-semibold">
                    {Number(product.reorderQuantity ?? 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["price", "Sell price", product.price],
                ["cost", "Unit cost", product.cost],
                ["quantityOnHand", "On hand", product.onHand],
                ["reorderLevel", "Reorder at", product.reorderLevel ?? 0],
              ].map(([name, label, value]) => (
                <label className="text-xs font-semibold" key={String(name)}>
                  {String(label)}
                  <input
                    className="ck-input mt-2"
                    defaultValue={Number(value)}
                    min="0"
                    name={String(name)}
                    step="0.01"
                    type="number"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-col justify-between gap-3">
              <label className="text-xs font-semibold">
                Availability
                <select
                  className="ck-input mt-2"
                  defaultValue={product.active ? "true" : "false"}
                  name="active"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <button className="ck-button" type="submit">
                <Boxes size={14} />
                Save operations
              </button>
            </div>
          </form>
        );
      })}
      </section>
    </div>
  );
}

function NotificationsWorkbench({
  records,
  organizationSlug,
}: {
  records: Value[];
  organizationSlug: string;
}) {
  return (
    <section className="ck-card overflow-hidden">
      <div className="flex items-center justify-between border-b p-5">
        <div>
          <h3 className="font-semibold">Action center</h3>
          <p className="mt-1 text-xs text-slate-500">
            Alerts link directly to the record or workflow that needs attention.
          </p>
        </div>
        <form action={markNotifications}>
          <input
            name="organizationSlug"
            type="hidden"
            value={organizationSlug}
          />
          <button
            className="ck-button ck-button-secondary"
            name="command"
            type="submit"
            value="READ_ALL"
          >
            <BadgeCheck size={14} />
            Mark all read
          </button>
        </form>
      </div>
      <div className="divide-y">
        {records.map((notification) => (
          <article
            className={`grid gap-4 p-5 lg:grid-cols-[auto_1fr_auto] ${
              notification.read ? "opacity-60" : "bg-amber-50/30"
            }`}
            key={String(notification.id)}
          >
            <div className="grid size-10 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <Bell size={17} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{String(notification.title)}</strong>
                {pill(notification.type)}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {String(notification.body ?? "No additional detail")}
              </p>
              <p className="mt-2 text-[10px] text-slate-400">
                {new Date(String(notification.createdAt)).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Boolean(notification.actionUrl) && (
                <Link
                  className="ck-button ck-button-secondary"
                  href={String(notification.actionUrl)}
                >
                  Open action
                </Link>
              )}
              <form action={markNotifications}>
                <input
                  name="organizationSlug"
                  type="hidden"
                  value={organizationSlug}
                />
                <input
                  name="entityId"
                  type="hidden"
                  value={String(notification.id)}
                />
                <button
                  className="ck-button"
                  name="command"
                  type="submit"
                  value={notification.read ? "UNREAD" : "READ"}
                >
                  {notification.read ? "Mark unread" : "Mark read"}
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditWorkbench({
  records,
  organizationSlug,
}: {
  records: Value[];
  organizationSlug: string;
}) {
  const failures = records.filter((record) => record.outcome === "FAILURE");
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="ck-card h-fit p-5">
        <ShieldCheck className="text-emerald-700" size={24} />
        <h3 className="mt-4 text-xl font-semibold">Tamper-evident chain</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Verify sequence continuity, previous-hash linkage, and the persisted
          chain head. Verification itself becomes a security event.
        </p>
        <form action={verifyAuditContinuity} className="mt-5">
          <input
            name="organizationSlug"
            type="hidden"
            value={organizationSlug}
          />
          <button className="ck-button w-full" type="submit">
            <ShieldCheck size={15} />
            Verify chain continuity
          </button>
        </form>
        <div className="mt-5 rounded-lg bg-red-50 p-4">
          <div className="text-xs font-bold uppercase text-red-700">
            Failed operations
          </div>
          <div className="mt-1 text-3xl font-semibold text-red-800">
            {failures.length}
          </div>
        </div>
      </aside>
      <section className="ck-card overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-semibold">Security and business event stream</h3>
        </div>
        <div className="max-h-[720px] divide-y overflow-y-auto">
          {records.map((record) => (
            <article
              className="grid gap-3 p-4 lg:grid-cols-[90px_1fr_auto]"
              key={String(record.id)}
            >
              <div className="font-mono text-xs text-slate-400">
                #{String(record.sequence)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{String(record.action)}</strong>
                  {pill(record.category)}
                  {record.outcome === "FAILURE" && pill(record.outcome, true)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {String(record.entity)} · {String(record.entityId ?? "n/a")}
                </p>
                <p className="mt-2 truncate font-mono text-[10px] text-slate-400">
                  {String(record.recordHash)}
                </p>
              </div>
              <time className="text-xs text-slate-400">
                {new Date(String(record.createdAt)).toLocaleString()}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TaxDocumentsWorkbench({
  records,
  organizationSlug,
}: {
  records: Value[];
  organizationSlug: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <form action={manageTaxDocument} className="ck-card h-fit p-5">
        <input name="organizationSlug" type="hidden" value={organizationSlug} />
        <input name="command" type="hidden" value="GENERATE" />
        <FileCheck2 className="text-amber-700" size={22} />
        <h3 className="mt-4 text-xl font-semibold">
          Generate controlled draft
        </h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Captures a versioned tenant snapshot before review or provider filing.
        </p>
        <div className="mt-5 grid gap-4">
          <label className="text-xs font-semibold">
            Document
            <select className="ck-input mt-2" name="documentType">
              <option>W2_SUMMARY</option>
              <option>1099_SUMMARY</option>
              <option>PAYROLL_TAX</option>
              <option>SALES_TAX</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Tax year
            <input
              className="ck-input mt-2"
              defaultValue={new Date().getFullYear() - 1}
              name="taxYear"
              type="number"
            />
          </label>
          <label className="text-xs font-semibold">
            Provider
            <input
              className="ck-input mt-2"
              defaultValue="CLEARKEY"
              name="provider"
            />
          </label>
        </div>
        <button className="ck-button mt-5 w-full" type="submit">
          Generate versioned draft
        </button>
      </form>
      <section className="space-y-3">
        {records.map((document) => (
          <article className="ck-card p-5" key={String(document.id)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex gap-2">
                  {pill(document.status)}
                  {pill(`Version ${String(document.version)}`)}
                </div>
                <h3 className="mt-3 text-lg font-semibold">
                  {String(document.type).replaceAll("_", " ")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tax year {String(document.year)} ·{" "}
                  {String(document.provider ?? "Internal provider")}
                </p>
              </div>
              <form
                action={manageTaxDocument}
                className="flex flex-wrap items-end gap-2"
              >
                <input
                  name="organizationSlug"
                  type="hidden"
                  value={organizationSlug}
                />
                <input
                  name="entityId"
                  type="hidden"
                  value={String(document.id)}
                />
                {document.status === "DRAFT" && (
                  <button
                    className="ck-button"
                    name="command"
                    type="submit"
                    value="READY"
                  >
                    Ready for review
                  </button>
                )}
                {document.status === "READY_FOR_REVIEW" && (
                  <>
                    <input
                      className="ck-input max-w-52"
                      name="filingConfirmation"
                      placeholder="Confirmation/reference"
                      required
                    />
                    <button
                      className="ck-button"
                      name="command"
                      type="submit"
                      value="FILED"
                    >
                      Mark filed
                    </button>
                  </>
                )}
                {!["FILED", "VOID"].includes(String(document.status)) && (
                  <button
                    className="ck-button ck-button-secondary"
                    name="command"
                    type="submit"
                    value="VOID"
                  >
                    Void
                  </button>
                )}
              </form>
            </div>
            <div className="mt-4 flex gap-5 border-t pt-4 text-xs text-slate-500">
              <span>
                Generated{" "}
                {new Date(String(document.generatedAt)).toLocaleString()}
              </span>
              {Boolean(document.submittedAt) && (
                <span>
                  Submitted{" "}
                  {new Date(String(document.submittedAt)).toLocaleString()}
                </span>
              )}
            </div>
          </article>
        ))}
        {!records.length && (
          <div className="ck-card p-10 text-center">
            <TriangleAlert className="mx-auto text-amber-700" size={22} />
            <p className="mt-3 text-sm text-slate-500">
              No controlled tax-document drafts exist yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function RecordOperationsWorkbench({
  module,
  records,
  organizationSlug,
}: {
  module: string;
  records: Value[];
  organizationSlug: string;
}) {
  if (module === "contacts")
    return (
      <ContactsWorkbench
        organizationSlug={organizationSlug}
        records={records}
      />
    );
  if (module === "products")
    return (
      <ProductsWorkbench
        organizationSlug={organizationSlug}
        records={records}
      />
    );
  if (module === "notifications")
    return (
      <NotificationsWorkbench
        organizationSlug={organizationSlug}
        records={records}
      />
    );
  if (module === "audit")
    return (
      <AuditWorkbench organizationSlug={organizationSlug} records={records} />
    );
  if (module === "tax-documents")
    return (
      <TaxDocumentsWorkbench
        organizationSlug={organizationSlug}
        records={records}
      />
    );
  return null;
}
