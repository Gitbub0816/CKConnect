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

function sanitize(value: string) {
  return value
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function textAt(x: number, y: number, size: number, value: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${sanitize(value)}) Tj ET\n`;
}

function line(x1: number, y1: number, x2: number, y2: number) {
  return `0.75 w ${x1} ${y1} m ${x2} ${y2} l S\n`;
}

export function renderInvoicePdf(invoice: PdfInvoice) {
  const rows = invoice.items.slice(0, 20);
  let stream = "";
  stream += textAt(50, 770, 22, invoice.organizationName);
  stream += textAt(50, 744, 10, "ClearKey Connect invoice");
  stream += textAt(410, 770, 20, "INVOICE");
  stream += textAt(410, 744, 11, invoice.invoiceNumber);
  stream += line(50, 720, 545, 720);
  stream += textAt(50, 690, 11, `Bill to: ${invoice.customerName}`);
  if (invoice.contactName) stream += textAt(50, 674, 10, invoice.contactName);
  if (invoice.contactEmail) stream += textAt(50, 658, 10, invoice.contactEmail);
  stream += textAt(370, 690, 10, `Issue date: ${invoice.issueDate.toLocaleDateString()}`);
  stream += textAt(370, 674, 10, `Due date: ${invoice.dueDate.toLocaleDateString()}`);
  stream += textAt(370, 658, 10, `Currency: ${invoice.currency}`);
  stream += line(50, 632, 545, 632);
  stream += textAt(50, 612, 10, "Description");
  stream += textAt(330, 612, 10, "Qty");
  stream += textAt(390, 612, 10, "Rate");
  stream += textAt(470, 612, 10, "Amount");
  stream += line(50, 600, 545, 600);

  let y = 580;
  for (const item of rows) {
    stream += textAt(50, y, 10, item.description.slice(0, 58));
    stream += textAt(330, y, 10, String(item.quantity));
    stream += textAt(390, y, 10, money(item.unitPrice, invoice.currency));
    stream += textAt(470, y, 10, money(item.total, invoice.currency));
    y -= 22;
  }
  if (invoice.items.length > rows.length) {
    stream += textAt(50, y, 9, `${invoice.items.length - rows.length} additional line items omitted from this print summary.`);
    y -= 22;
  }

  stream += line(330, 188, 545, 188);
  stream += textAt(350, 166, 10, "Subtotal");
  stream += textAt(470, 166, 10, money(invoice.subtotal, invoice.currency));
  stream += textAt(350, 146, 10, "Discounts");
  stream += textAt(470, 146, 10, money(invoice.discountTotal, invoice.currency));
  stream += textAt(350, 126, 10, "Tax");
  stream += textAt(470, 126, 10, money(invoice.taxTotal, invoice.currency));
  stream += textAt(350, 100, 12, "Total");
  stream += textAt(470, 100, 12, money(invoice.total, invoice.currency));
  stream += textAt(350, 78, 10, "Paid");
  stream += textAt(470, 78, 10, money(invoice.amountPaid, invoice.currency));
  stream += textAt(350, 54, 14, "Balance due");
  stream += textAt(470, 54, 14, money(invoice.balanceDue, invoice.currency));
  if (invoice.notes) {
    stream += textAt(50, 120, 10, "Notes");
    stream += textAt(50, 102, 9, invoice.notes.slice(0, 88));
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
