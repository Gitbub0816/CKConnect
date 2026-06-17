type PdfInvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PdfInvoice = {
  invoiceNumber: string;
  organizationName: string;
  customerName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  items: PdfInvoiceItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

export function renderInvoiceHtml(invoice: PdfInvoice) {
  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="numeric">${item.quantity.toLocaleString()}</td>
          <td class="numeric">${money(item.unitPrice, invoice.currency)}</td>
          <td class="numeric">${money(item.total, invoice.currency)}</td>
        </tr>
      `,
    )
    .join("");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 0.55in; size: Letter; }
      * { box-sizing: border-box; }
      body {
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
      }
      .document-header {
        align-items: flex-start;
        border-bottom: 2px solid #111827;
        display: flex;
        justify-content: space-between;
        padding-bottom: 24px;
      }
      .brand { font-size: 22px; font-weight: 700; }
      .muted { color: #667085; }
      .invoice-title { font-size: 30px; font-weight: 800; letter-spacing: .08em; }
      .summary {
        display: grid;
        grid-template-columns: 1fr 230px;
        gap: 36px;
        margin-top: 28px;
      }
      .panel {
        border: 1px solid #d0d5dd;
        border-radius: 14px;
        padding: 18px;
      }
      .label {
        color: #667085;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      table {
        border-collapse: collapse;
        margin-top: 28px;
        width: 100%;
      }
      th {
        background: #f2f4f7;
        color: #475467;
        font-size: 10px;
        letter-spacing: .1em;
        padding: 10px;
        text-align: left;
        text-transform: uppercase;
      }
      td { border-bottom: 1px solid #eaecf0; padding: 12px 10px; }
      .numeric { text-align: right; white-space: nowrap; }
      .totals {
        display: grid;
        grid-template-columns: 1fr 260px;
        gap: 32px;
        margin-top: 28px;
      }
      .total-row {
        align-items: center;
        border-bottom: 1px solid #eaecf0;
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
      .balance {
        background: #111827;
        border-radius: 12px;
        color: white;
        margin-top: 10px;
        padding: 14px;
      }
      .balance .amount { font-size: 22px; font-weight: 800; }
      footer {
        border-top: 1px solid #d0d5dd;
        bottom: 0;
        color: #667085;
        font-size: 10px;
        left: 0;
        padding-top: 10px;
        position: fixed;
        right: 0;
      }
    </style>
  </head>
  <body>
    <header class="document-header">
      <div>
        <div class="brand">${escapeHtml(invoice.organizationName)}</div>
        <div class="muted">ClearKey Connect receivables</div>
      </div>
      <div class="numeric">
        <div class="invoice-title">INVOICE</div>
        <div>${escapeHtml(invoice.invoiceNumber)}</div>
      </div>
    </header>
    <section class="summary">
      <div class="panel">
        <div class="label">Bill to</div>
        <h2>${escapeHtml(invoice.customerName)}</h2>
        ${
          invoice.contactName
            ? `<div>${escapeHtml(invoice.contactName)}</div>`
            : ""
        }
        ${
          invoice.contactEmail
            ? `<div class="muted">${escapeHtml(invoice.contactEmail)}</div>`
            : ""
        }
      </div>
      <div class="panel">
        <div class="total-row"><span>Issue date</span><strong>${formatDate(invoice.issueDate)}</strong></div>
        <div class="total-row"><span>Due date</span><strong>${formatDate(invoice.dueDate)}</strong></div>
        <div class="total-row"><span>Currency</span><strong>${escapeHtml(invoice.currency)}</strong></div>
      </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="numeric">Qty</th>
          <th class="numeric">Rate</th>
          <th class="numeric">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="totals">
      <div>
        ${
          invoice.notes
            ? `<div class="panel"><div class="label">Notes</div><p>${escapeHtml(invoice.notes)}</p></div>`
            : ""
        }
      </div>
      <div>
        <div class="total-row"><span>Subtotal</span><strong>${money(invoice.subtotal, invoice.currency)}</strong></div>
        <div class="total-row"><span>Discounts</span><strong>${money(invoice.discountTotal, invoice.currency)}</strong></div>
        <div class="total-row"><span>Tax</span><strong>${money(invoice.taxTotal, invoice.currency)}</strong></div>
        <div class="total-row"><span>Total</span><strong>${money(invoice.total, invoice.currency)}</strong></div>
        <div class="total-row"><span>Paid</span><strong>${money(invoice.amountPaid, invoice.currency)}</strong></div>
        <div class="balance">
          <div>Balance due</div>
          <div class="amount">${money(invoice.balanceDue, invoice.currency)}</div>
        </div>
      </div>
    </section>
    <footer>Generated by ClearKey Connect. Status and payment state are controlled by tenant ledger and payment webhooks.</footer>
  </body>
</html>`;
}

export async function renderInvoicePdf(invoice: PdfInvoice) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(renderInvoiceHtml(invoice), {
      waitUntil: "networkidle",
    });
    return await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
