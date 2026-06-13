import { requireOrganizationAccess } from "@/lib/authorization";

export async function GET(request: Request) {
  const organizationSlug = new URL(request.url).searchParams.get("organizationSlug");
  if (!organizationSlug) return Response.json({ error: "Organization is required" }, { status: 400 });
  await requireOrganizationAccess(organizationSlug, "payments.write");
  return Response.json({ error: "PayPal multiparty onboarding requires the approved PayPal partner referral configuration. The credentials are stored, but onboarding remains disabled until that approval is present." }, { status: 503 });
}
