import "server-only";

import { Readable } from "node:stream";
import Decimal from "decimal.js";
import ExcelJS from "exceljs";
import type { AccountType, InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

type ImportRow = Record<string, unknown>;

export type AccountingImportResult = {
  accounts: number;
  bills: number;
  expenses: number;
  invoices: number;
  journalEntries: number;
  payments: number;
  products: number;
  vendors: number;
  issues: string[];
};

const initialResult = (): AccountingImportResult => ({
  accounts: 0,
  bills: 0,
  expenses: 0,
  invoices: 0,
  journalEntries: 0,
  payments: 0,
  products: 0,
  vendors: 0,
  issues: [],
});

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "");
}

function rowValue(row: ImportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function text(row: ImportRow, keys: string[]) {
  return String(rowValue(row, keys)).trim();
}

function number(row: ImportRow, keys: string[]) {
  const raw = rowValue(row, keys);
  if (raw instanceof Date) return 0;
  try {
    const parsed = new Decimal(String(raw || "0").replaceAll(/[$,]/g, ""));
    return parsed.isFinite() ? parsed.toNumber() : 0;
  } catch {
    return 0;
  }
}

function bool(row: ImportRow, keys: string[]) {
  const raw = String(rowValue(row, keys)).toLowerCase().trim();
  return ["true", "yes", "y", "1", "active"].includes(raw);
}

function date(row: ImportRow, keys: string[], fallback = new Date()) {
  const raw = rowValue(row, keys);
  if (raw instanceof Date) return raw;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function accountType(value: string): AccountType {
  const normalized = normalizeKey(value).toUpperCase();
  const aliases: Record<string, AccountType> = {
    AR: "ASSET",
    AP: "LIABILITY",
    BANK: "ASSET",
    CASH: "ASSET",
    REVENUE: "INCOME",
    COGS: "COST_OF_GOODS_SOLD",
  };
  const candidate = aliases[normalized] ?? normalized;
  return [
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "INCOME",
    "COST_OF_GOODS_SOLD",
    "EXPENSE",
    "OTHER_INCOME",
    "OTHER_EXPENSE",
  ].includes(candidate)
    ? (candidate as AccountType)
    : "EXPENSE";
}

function invoiceStatus(value: string) {
  const candidate = normalizeKey(value).toUpperCase();
  return ["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"].includes(candidate)
    ? (candidate as InvoiceStatus)
    : "DRAFT";
}

function sheetRows(sheet: ExcelJS.Worksheet) {
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = normalizeKey(cell.value);
  });
  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: ImportRow = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) item[key] = cell.value instanceof Object && "text" in cell.value ? cell.value.text : cell.value;
    });
    if (Object.values(item).some((value) => String(value ?? "").trim())) rows.push(item);
  });
  return rows;
}

function parseCsv(textValue: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < textValue.length; index += 1) {
    const char = textValue[index];
    const next = textValue[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  const headers = (rows.shift() ?? []).map(normalizeKey);
  return rows
    .filter((items) => items.some((item) => item.trim()))
    .map((items) =>
      Object.fromEntries(items.map((value, index) => [headers[index] ?? `column${index}`, value])),
    );
}

async function workbookFromFile(fileName: string, buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    const stream = Readable.from(buffer);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  }
  return workbook;
}

async function upsertAccount(tx: Prisma.TransactionClient, organizationId: string, row: ImportRow, fallbackCode?: string) {
  const code = text(row, ["code", "account code", "account"]) || fallbackCode;
  if (!code) return null;
  const name = text(row, ["name", "account name", "account"]) || `Imported account ${code}`;
  return tx.ledgerAccount.upsert({
    where: { organizationId_code: { organizationId, code } },
    create: {
      organizationId,
      code,
      name,
      type: accountType(text(row, ["type", "account type"])),
      active: text(row, ["active"]) ? bool(row, ["active"]) : true,
    },
    update: {
      name,
      type: accountType(text(row, ["type", "account type"])),
      active: text(row, ["active"]) ? bool(row, ["active"]) : true,
    },
  });
}

export async function importAccountingWorkbook(input: {
  buffer: Buffer;
  fileName: string;
  organizationId: string;
  userId: string;
}) {
  const db = getDb();
  const result = initialResult();
  const workbook = input.fileName.toLowerCase().endsWith(".csv")
    ? null
    : await workbookFromFile(input.fileName, input.buffer);
  const csvRows = input.fileName.toLowerCase().endsWith(".csv")
    ? parseCsv(input.buffer.toString("utf8"))
    : [];

  await db.$transaction(async (tx) => {
    const sheets = workbook
      ? workbook.worksheets.map((sheet) => ({ name: sheet.name, rows: sheetRows(sheet) }))
      : [{ name: "Journal", rows: csvRows }];

    for (const sheet of sheets) {
      const name = normalizeKey(sheet.name);
      if (name.includes("chart") || name.includes("account")) {
        for (const row of sheet.rows) {
          const account = await upsertAccount(tx, input.organizationId, row);
          if (account) result.accounts += 1;
        }
      }

      if (name.includes("product") || name.includes("service") || name.includes("inventory")) {
        for (const row of sheet.rows) {
          const sku = text(row, ["sku"]);
          const data = {
            organizationId: input.organizationId,
            sku: sku || null,
            name: text(row, ["name", "product", "service"]) || "Imported offering",
            type: text(row, ["type"]) || "SERVICE",
            price: number(row, ["price", "sell price", "unit price"]),
            cost: number(row, ["cost", "unit cost"]),
            quantityOnHand: number(row, ["on hand", "quantity on hand", "stock"]),
            reorderLevel: number(row, ["reorder level", "reorder at"]) || null,
            active: text(row, ["active", "availability"]) ? bool(row, ["active", "availability"]) : true,
          };
          if (sku) {
            await tx.product.upsert({
              where: { organizationId_sku: { organizationId: input.organizationId, sku } },
              create: data,
              update: data,
            });
          } else {
            await tx.product.create({ data });
          }
          result.products += 1;
        }
      }

      if (name.includes("vendor")) {
        for (const row of sheet.rows) {
          await tx.vendor.upsert({
            where: { organizationId_name: { organizationId: input.organizationId, name: text(row, ["name", "vendor"]) || "Imported vendor" } },
            create: {
              organizationId: input.organizationId,
              name: text(row, ["name", "vendor"]) || "Imported vendor",
              email: text(row, ["email"]) || null,
              phone: text(row, ["phone"]) || null,
              eligible1099: bool(row, ["1099", "eligible 1099", "1099 eligible"]),
            },
            update: {
              email: text(row, ["email"]) || null,
              phone: text(row, ["phone"]) || null,
              eligible1099: bool(row, ["1099", "eligible 1099", "1099 eligible"]),
            },
          });
          result.vendors += 1;
        }
      }

      if (name.includes("expense")) {
        for (const row of sheet.rows) {
          const vendorName = text(row, ["vendor"]);
          const vendor = vendorName
            ? await tx.vendor.upsert({
                where: { organizationId_name: { organizationId: input.organizationId, name: vendorName } },
                create: { organizationId: input.organizationId, name: vendorName },
                update: {},
              })
            : null;
          await tx.expense.create({
            data: {
              organizationId: input.organizationId,
              vendorId: vendor?.id,
              description: text(row, ["description", "memo"]) || "Imported expense",
              amount: number(row, ["amount", "total"]),
              incurredAt: date(row, ["date", "incurred at"]),
              category: text(row, ["category"]) || null,
            },
          });
          result.expenses += 1;
        }
      }

      if (name.includes("payment")) {
        for (const row of sheet.rows) {
          await tx.payment.create({
            data: {
              organizationId: input.organizationId,
              amount: number(row, ["amount", "total"]),
              status: text(row, ["status"]) || "SUCCEEDED",
              method: text(row, ["method"]) || null,
              referenceNumber: text(row, ["reference", "reference number"]) || null,
              receivedAt: date(row, ["date", "received at"]),
            },
          });
          result.payments += 1;
        }
      }

      if (name.includes("invoice")) {
        const groups = new Map<string, ImportRow[]>();
        for (const row of sheet.rows) {
          const numberValue = text(row, ["invoice number", "number"]) || `IMP-${result.invoices + groups.size + 1}`;
          groups.set(numberValue, [...(groups.get(numberValue) ?? []), row]);
        }
        for (const [invoiceNumber, rows] of groups) {
          const first = rows[0];
          const customerName = text(first, ["customer", "account"]);
          const account = customerName
            ? await tx.crmAccount.upsert({
                where: { organizationId_name: { organizationId: input.organizationId, name: customerName } },
                create: { organizationId: input.organizationId, name: customerName, accountType: "CUSTOMER" },
                update: {},
              })
            : null;
          const subtotal = rows.reduce((sum, row) => sum + (number(row, ["quantity"]) || 1) * number(row, ["unit price", "price"]), 0);
          const tax = rows.reduce((sum, row) => sum + (number(row, ["quantity"]) || 1) * number(row, ["unit price", "price"]) * number(row, ["tax rate"]), 0);
          try {
            const invoice = await tx.invoice.create({
              data: {
                organizationId: input.organizationId,
                accountId: account?.id,
                invoiceNumber,
                status: invoiceStatus(text(first, ["status"])),
                issueDate: date(first, ["issue date", "date"]),
                dueDate: date(first, ["due date"], new Date(Date.now() + 30 * 86_400_000)),
                subtotal,
                taxTotal: tax,
                total: subtotal + tax,
                balanceDue: subtotal + tax,
                notes: "Imported from accounting spreadsheet",
              },
            });
            await tx.invoiceItem.createMany({
              data: rows.map((row, index) => {
                const quantity = number(row, ["quantity"]) || 1;
                const unitPrice = number(row, ["unit price", "price"]);
                const taxRate = number(row, ["tax rate"]);
                const lineTotal = quantity * unitPrice * (1 + taxRate);
                return {
                  invoiceId: invoice.id,
                  description: text(row, ["description", "item"]) || "Imported line item",
                  quantity,
                  unitPrice,
                  taxRate,
                  lineTotal,
                  sortOrder: index,
                };
              }),
            });
            result.invoices += 1;
          } catch {
            result.issues.push(`Invoice ${invoiceNumber} already exists or could not be imported.`);
          }
        }
      }

      if (name.includes("journal") || name.includes("ledger")) {
        const groups = new Map<string, ImportRow[]>();
        for (const row of sheet.rows) {
          const key = text(row, ["entry number", "journal entry", "number"]) || `${date(row, ["date"]).toISOString()}-${text(row, ["description"])}`;
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        const count = await tx.journalEntry.count({ where: { organizationId: input.organizationId } });
        let offset = 1;
        for (const [key, rows] of groups) {
          const debit = rows.reduce((sum, row) => sum + number(row, ["debit"]), 0);
          const credit = rows.reduce((sum, row) => sum + number(row, ["credit"]), 0);
          if (Math.abs(debit - credit) > 0.01 || debit <= 0) {
            result.issues.push(`Journal ${key} is not balanced and was sent to review.`);
            continue;
          }
          const first = rows[0];
          const entryNumber = text(first, ["entry number", "journal entry", "number"]) || `JE-IMP-${String(count + offset).padStart(5, "0")}`;
          offset += 1;
          try {
            const entry = await tx.journalEntry.create({
              data: {
                organizationId: input.organizationId,
                entryNumber,
                entryDate: date(first, ["date", "entry date"]),
                description: text(first, ["description", "memo"]) || "Imported journal entry",
                status: "POSTED",
                sourceModule: "EXCEL_IMPORT",
                createdById: input.userId,
                postedAt: new Date(),
              },
            });
            for (let index = 0; index < rows.length; index += 1) {
              const row = rows[index];
              const account = await upsertAccount(tx, input.organizationId, row, text(row, ["account code"]));
              if (!account) {
                result.issues.push(`Journal ${entryNumber} line ${index + 1} is missing an account.`);
                continue;
              }
              await tx.journalLine.create({
                data: {
                  journalEntryId: entry.id,
                  ledgerAccountId: account.id,
                  description: text(row, ["line description", "description", "memo"]) || null,
                  debit: number(row, ["debit"]),
                  credit: number(row, ["credit"]),
                  sortOrder: index,
                },
              });
            }
            result.journalEntries += 1;
          } catch {
            result.issues.push(`Journal ${entryNumber} already exists or could not be imported.`);
          }
        }
      }
    }

    if (result.issues.length) {
      await tx.task.create({
        data: {
          organizationId: input.organizationId,
          title: "Review accounting import exceptions",
          description: result.issues.slice(0, 20).join("\n"),
          priority: "HIGH",
          dueAt: new Date(Date.now() + 86_400_000),
          relatedType: "ACCOUNTING_IMPORT",
          createdById: input.userId,
          assignedToId: input.userId,
        },
      });
    }
  });

  return result;
}
