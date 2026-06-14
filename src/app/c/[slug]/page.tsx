import { redirect } from "next/navigation";
import { verifyTenantAccess } from "@/lib/tenant";

export default async function TenantEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await verifyTenantAccess(slug);
  if (!access.ok) {
    if (access.reason === "SIGNED_OUT") redirect(`/c/${slug}/login`);
    redirect("/unauthorized");
  }
  redirect(`/app/${access.tenant.slug}`);
}
