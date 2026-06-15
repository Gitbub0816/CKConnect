import ExcelJS from "exceljs";
import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

const reportSchema = z.enum([
  "workbook",
  "ledger",
  "trial-balance",
  "statements",
  "invoices",
  "payments",
  "expenses",
  "vendors",
  "products",
  "import-template",
]);

function money(value: unknown) {
  return Number(value ?? 0);
}

function asDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: Math.max(1, sheet.columnCount) },
  };
  for (const column of sheet.columns) {
    column.width = Math.min(34, Math.max(12, Number(column.header?.toString().length ?? 12) + 4));
    if (String(column.header ?? "").match(/amount|total|balance|debit|credit|price|cost|paid/i)) {
      column.numFmt = "$#,##0.00;[Red]-$#,##0.00";
    }
  }
}

function addRows(sheet: ExcelJS.Worksheet, columns: Array<{ header: string; key: string }>, rows: Record<string, unknown>[]) {
  sheet.columns = columns;
  sheet.addRows(rows);
  styleSheet(sheet);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationSlug = z.string().min(1).parse(url.searchParams.get("organizationSlug"));
  const report = reportSchema.parse(url.searchParams.get("report") ?? "workbook");
  const format = z.enum(["xlsx", "csv"]).parse(url.searchParams.get("format") ?? "xlsx");
  const { organization } = await requireOrganizationAccess(organizationSlug, "accounting.read");
  const db = getDb();
  const [
    accounts,
    entries,
    invoices,
    payments,
    expenses,
    vendors,
    products,
  ] = await Promise.all([
    db.ledgerAccount.findMany({ where: { organizationId: organization.id }, include: { lines: true }, orderBy: { code: "asc" } }),
    db.journalEntry.findMany({ where: { organizationId: organization.id }, include: { lines: { include: { ledgerAccount: true } } }, orderBy: { entryDate: "desc" } }),
    db.invoice.findMany({ where: { organizationId: organization.id }, include: { account: true, contact: true, items: true }, orderBy: { issueDate: "desc" } }),
    db.payment.findMany({ where: { organizationId: organization.id }, include: { allocations: { include: { invoice: true } } }, orderBy: { receivedAt: "desc" } }),
    db.expense.findMany({ where: { organizationId: organization.id }, include: { vendor: true }, orderBy: { incurredAt: "desc" } }),
    db.vendor.findMany({ where: { organizationId: organization.id }, include: { bills: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClearKey Connect";
  workbook.created = new Date();
  workbook.subject = `${organization.name} ${report}`;

  const trialRows = accounts.map((account) => {
    const debitNormal = ["ASSET", "EXPENSE", "COST_OF_GOODS_SOLD"].includes(account.type);
    const balance = account.lines.reduce((sum, line) => sum + (debitNormal ? money(line.debit) - money(line.credit) : money(line.credit) - money(line.debit)), 0);
    return { code: account.code, name: account.name, type: account.type, active: account.active, balance };
  });
  const ledgerRows = entries.flatMap((entry) =>
    entry.lines.map((line) => ({
      entryNumber: entry.entryNumber,
      date: asDate(entry.entryDate),
      status: entry.status,
      source: entry.sourceModule,
      entryDescription: entry.description,
      accountCode: line.ledgerAccount.code,
      accountName: line.ledgerAccount.name,
      lineDescription: line.description,
      debit: money(line.debit),
      credit: money(line.credit),
    })),
  );
  const invoiceRows = invoices.flatMap((invoice) =>
    invoice.items.map((item) => ({
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.account?.name ?? "",
      contactEmail: invoice.contact?.email ?? "",
      status: invoice.status,
      issueDate: asDate(invoice.issueDate),
      dueDate: asDate(invoice.dueDate),
      description: item.description,
      quantity: money(item.quantity),
      unitPrice: money(item.unitPrice),
      taxRate: money(item.taxRate),
      lineTotal: money(item.lineTotal),
      invoiceTotal: money(invoice.total),
      balanceDue: money(invoice.balanceDue),
    })),
  );
  const paymentRows = payments.map((payment) => ({
    date: asDate(payment.receivedAt),
    reference: payment.referenceNumber ?? "",
    method: payment.method ?? "",
    status: payment.status,
    amount: money(payment.amount),
    invoices: payment.allocations.map((allocation) => allocation.invoice.invoiceNumber).join(", "),
  }));
  const expenseRows = expenses.map((expense) => ({
    date: asDate(expense.incurredAt),
    description: expense.description,
    vendor: expense.vendor?.name ?? "",
    category: expense.category ?? "",
    amount: money(expense.amount),
    posted: Boolean(expense.postedJournalId),
  }));
  const vendorRows = vendors.map((vendor) => ({
    name: vendor.name,
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    eligible1099: vendor.eligible1099,
    openBills: vendor.bills.filter((bill) => bill.status !== "PAID").length,
    balance: vendor.bills.reduce((sum, bill) => sum + money(bill.total) - money(bill.amountPaid), 0),
  }));
  const productRows = products.map((product) => ({
    sku: product.sku ?? "",
    name: product.name,
    type: product.type,
    price: money(product.price),
    cost: money(product.cost),
    quantityOnHand: money(product.quantityOnHand),
    reorderLevel: money(product.reorderLevel),
    active: product.active,
  }));
  const statementRows = [
    ["Assets", trialRows.filter((row) => row.type === "ASSET").reduce((sum, row) => sum + row.balance, 0)],
    ["Liabilities", trialRows.filter((row) => row.type === "LIABILITY").reduce((sum, row) => sum + row.balance, 0)],
    ["Equity", trialRows.filter((row) => row.type === "EQUITY").reduce((sum, row) => sum + row.balance, 0)],
    ["Income", trialRows.filter((row) => ["INCOME", "OTHER_INCOME"].includes(row.type)).reduce((sum, row) => sum + row.balance, 0)],
    ["Expenses", trialRows.filter((row) => ["EXPENSE", "COST_OF_GOODS_SOLD", "OTHER_EXPENSE"].includes(row.type)).reduce((sum, row) => sum + row.balance, 0)],
  ].map(([statement, amount]) => ({ statement, amount }));

  const addTemplate = () => {
    addRows(workbook.addWorksheet("Chart of Accounts"), [
      { header: "Code", key: "code" },
      { header: "Name", key: "name" },
      { header: "Type", key: "type" },
      { header: "Active", key: "active" },
    ], []);
    addRows(workbook.addWorksheet("Journal"), [
      { header: "Entry Number", key: "entryNumber" },
      { header: "Date", key: "date" },
      { header: "Account Code", key: "accountCode" },
      { header: "Account Name", key: "accountName" },
      { header: "Account Type", key: "accountType" },
      { header: "Description", key: "description" },
      { header: "Debit", key: "debit" },
      { header: "Credit", key: "credit" },
    ], []);
    addRows(workbook.addWorksheet("Invoices"), [
      { header: "Invoice Number", key: "invoiceNumber" },
      { header: "Customer", key: "customer" },
      { header: "Issue Date", key: "issueDate" },
      { header: "Due Date", key: "dueDate" },
      { header: "Description", key: "description" },
      { header: "Quantity", key: "quantity" },
      { header: "Unit Price", key: "unitPrice" },
      { header: "Tax Rate", key: "taxRate" },
      { header: "Status", key: "status" },
    ], []);
    addRows(workbook.addWorksheet("Products"), [
      { header: "SKU", key: "sku" },
      { header: "Name", key: "name" },
      { header: "Type", key: "type" },
      { header: "Price", key: "price" },
      { header: "Cost", key: "cost" },
      { header: "On Hand", key: "quantityOnHand" },
      { header: "Reorder Level", key: "reorderLevel" },
    ], []);
  };

  if (report === "import-template") addTemplate();
  if (["workbook", "ledger"].includes(report)) addRows(workbook.addWorksheet("Raw Ledger"), [
    { header: "Entry Number", key: "entryNumber" },
    { header: "Date", key: "date" },
    { header: "Status", key: "status" },
    { header: "Source", key: "source" },
    { header: "Entry Description", key: "entryDescription" },
    { header: "Account Code", key: "accountCode" },
    { header: "Account Name", key: "accountName" },
    { header: "Line Description", key: "lineDescription" },
    { header: "Debit", key: "debit" },
    { header: "Credit", key: "credit" },
  ], ledgerRows);
  if (["workbook", "trial-balance"].includes(report)) addRows(workbook.addWorksheet("Trial Balance"), [
    { header: "Code", key: "code" },
    { header: "Name", key: "name" },
    { header: "Type", key: "type" },
    { header: "Active", key: "active" },
    { header: "Balance", key: "balance" },
  ], trialRows);
  if (["workbook", "statements"].includes(report)) addRows(workbook.addWorksheet("Statements"), [
    { header: "Statement", key: "statement" },
    { header: "Amount", key: "amount" },
  ], statementRows);
  if (["workbook", "invoices"].includes(report)) addRows(workbook.addWorksheet("Invoices"), [
    { header: "Invoice Number", key: "invoiceNumber" },
    { header: "Customer", key: "customer" },
    { header: "Contact Email", key: "contactEmail" },
    { header: "Status", key: "status" },
    { header: "Issue Date", key: "issueDate" },
    { header: "Due Date", key: "dueDate" },
    { header: "Description", key: "description" },
    { header: "Quantity", key: "quantity" },
    { header: "Unit Price", key: "unitPrice" },
    { header: "Tax Rate", key: "taxRate" },
    { header: "Line Total", key: "lineTotal" },
    { header: "Invoice Total", key: "invoiceTotal" },
    { header: "Balance Due", key: "balanceDue" },
  ], invoiceRows);
  if (["workbook", "payments"].includes(report)) addRows(workbook.addWorksheet("Payments"), [
    { header: "Date", key: "date" },
    { header: "Reference", key: "reference" },
    { header: "Method", key: "method" },
    { header: "Status", key: "status" },
    { header: "Amount", key: "amount" },
    { header: "Invoices", key: "invoices" },
  ], paymentRows);
  if (["workbook", "expenses"].includes(report)) addRows(workbook.addWorksheet("Expenses"), [
    { header: "Date", key: "date" },
    { header: "Description", key: "description" },
    { header: "Vendor", key: "vendor" },
    { header: "Category", key: "category" },
    { header: "Amount", key: "amount" },
    { header: "Posted", key: "posted" },
  ], expenseRows);
  if (["workbook", "vendors"].includes(report)) addRows(workbook.addWorksheet("Vendors"), [
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "1099 Eligible", key: "eligible1099" },
    { header: "Open Bills", key: "openBills" },
    { header: "Balance", key: "balance" },
  ], vendorRows);
  if (["workbook", "products"].includes(report)) addRows(workbook.addWorksheet("Products"), [
    { header: "SKU", key: "sku" },
    { header: "Name", key: "name" },
    { header: "Type", key: "type" },
    { header: "Price", key: "price" },
    { header: "Cost", key: "cost" },
    { header: "On Hand", key: "quantityOnHand" },
    { header: "Reorder Level", key: "reorderLevel" },
    { header: "Active", key: "active" },
  ], productRows);

  const fileName = `${organization.slug}-${report}-${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === "csv") {
    const sheet = workbook.worksheets[0];
    const csv = await workbook.csv.writeBuffer({ sheetName: sheet.name });
    return new Response(csv as BodyInit, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName}"`,
      },
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
