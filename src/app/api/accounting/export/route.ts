import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import {
  accountingExportFormats,
  accountingExportReports,
  buildAccountingExportWorkbook,
  serializeAccountingWorkbook,
} from "@/lib/accounting/spreadsheet-export";
import { getDb } from "@/lib/db";

const requestSchema = z.object({
  organizationSlug: z.string().min(1),
  report: z.enum(accountingExportReports).default("workbook"),
  format: z.enum(accountingExportFormats).default("xlsx"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    organizationSlug: url.searchParams.get("organizationSlug"),
    report: url.searchParams.get("report") ?? undefined,
    format: url.searchParams.get("format") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid accounting export request",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const params = parsed.data;
  const { organization } = await requireOrganizationAccess(
    params.organizationSlug,
    "accounting.read",
  );
  const workbook = await buildAccountingExportWorkbook({
    db: getDb(),
    organization,
    report: params.report,
  });
  const file = await serializeAccountingWorkbook({
    workbook,
    format: params.format,
  });
  const fileName = `${organization.slug}-${params.report}-${new Date().toISOString().slice(0, 10)}.${params.format}`;

  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
