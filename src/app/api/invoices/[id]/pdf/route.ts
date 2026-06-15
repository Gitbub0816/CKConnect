import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
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
  const body = renderInvoicePdf({
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

  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
