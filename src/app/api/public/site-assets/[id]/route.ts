import { redirect } from "next/navigation";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { signR2Download } from "@/lib/integrations/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await getDb().storedFile.findFirst({
    where: {
      id,
      status: "AVAILABLE",
      deletedAt: null,
      relatedType: "WEBSITE_PAGE",
    },
  });
  if (!file?.relatedId) return new Response("Asset not found", { status: 404 });
  const page = await getDb().websitePage.findFirst({
    where: {
      id: file.relatedId,
    },
    include: { website: { include: { organization: true } } },
  });
  if (!page) return new Response("Asset is not linked", { status: 404 });
  const published =
    page.status === "PUBLISHED" && page.website.status === "PUBLISHED";
  const policy = await getDb().storagePolicy.findUnique({
    where: {
      organizationId_scope: {
        organizationId: page.website.organizationId,
        scope: "WEBSITE_ASSETS",
      },
    },
    select: { publicAssets: true },
  });
  if (!published || policy?.publicAssets === false) {
    try {
      await requireOrganizationAccess(
        page.website.organization.slug,
        "websites.read",
      );
    } catch {
      return new Response("Asset is not published", { status: 404 });
    }
  }
  redirect(await signR2Download(file.objectKey, file.fileName));
}
