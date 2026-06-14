import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { signR2Download } from "@/lib/integrations/r2";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slug = new URL(request.url).searchParams.get("organizationSlug") ?? "";
  const { organization } = await requireOrganizationAccess(slug, "documents.read");
  const file = await getDb().storedFile.findFirst({ where: { id, organizationId: organization.id, deletedAt: null, status: "AVAILABLE" } });
  if (!file) return Response.json({ error: "Document not found" }, { status: 404 });
  return Response.redirect(await signR2Download(file.objectKey, file.fileName));
}
