import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { getIntegrationConfigStatus } from "@/lib/integrations/config";
import { putR2Object } from "@/lib/integrations/r2";
import { renderInvoicePdf } from "@/lib/invoices/pdf";

function amount(value: unknown) {
  return Number(value ?? 0);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const organizationSlug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(
    organizationSlug,
    "invoices.read",
  );
  const invoice = await getDb().invoice.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      account: true,
      contact: true,
      items: { orderBy: { sortOrder: "asc" } },
      organization: true,
    },
  });
  if (!invoice) {
    return Response.json({ error: "Invoice not found" }, { status: 404 });
  }

  const contactName = invoice.contact
    ? `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim()
    : null;
  const body = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    organizationName: invoice.organization.legalName ?? invoice.organization.name,
    customerName: invoice.account?.name ?? contactName ?? "Direct customer",
    contactName,
    contactEmail: invoice.contact?.email,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: amount(invoice.subtotal),
    taxTotal: amount(invoice.taxTotal),
    discountTotal: amount(invoice.discountTotal),
    total: amount(invoice.total),
    amountPaid: amount(invoice.amountPaid),
    balanceDue: amount(invoice.balanceDue),
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: amount(item.quantity),
      unitPrice: amount(item.unitPrice),
      total: amount(item.lineTotal),
    })),
  });
  const pdfBuffer = Buffer.from(body);

  if (getIntegrationConfigStatus().cloudflareR2) {
    const objectKey = `${organization.id}/generated/invoices/${invoice.id}/${invoice.invoiceNumber}.pdf`;
    await putR2Object({
      body: pdfBuffer,
      contentType: "application/pdf",
      key: objectKey,
    });
    await getDb().storedFile.upsert({
      where: {
        organizationId_objectKey: {
          organizationId: organization.id,
          objectKey,
        },
      },
      update: {
        contentType: "application/pdf",
        fileName: `${invoice.invoiceNumber}.pdf`,
        relatedType: "INVOICE_PDF",
        relatedId: invoice.id,
        sizeBytes: BigInt(pdfBuffer.byteLength),
        status: "READY",
      },
      create: {
        organizationId: organization.id,
        objectKey,
        contentType: "application/pdf",
        fileName: `${invoice.invoiceNumber}.pdf`,
        relatedType: "INVOICE_PDF",
        relatedId: invoice.id,
        retentionClass: "FINANCIAL_7Y",
        scanStatus: "SYSTEM_GENERATED",
        sizeBytes: BigInt(pdfBuffer.byteLength),
        status: "READY",
      },
    });
  }

  return new Response(pdfBuffer, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
