import { z } from "zod";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

const schema = z.object({ organizationSlug: z.string().min(1) });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const { organization } = await requireOrganizationAccess(
    input.organizationSlug,
    "integrations.manage",
  );
  await getDb().integration.updateMany({
    where: { organizationId: organization.id, provider: "SLACK" },
    data: {
      status: "DISCONNECTED",
      encryptedCredentials: null,
      lastError: null,
      settings: {},
    },
  });
  return Response.json({ ok: true });
}
