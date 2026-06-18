import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getWorkspaceDashboard } from "@/lib/workspace-data";

function authenticate(request: NextRequest) {
  const key = process.env.KPI_API_KEY;
  if (!key) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${key}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  if (!authenticate(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationSlug } = await params;
  const data = await getWorkspaceDashboard(organizationSlug);
  if (!data)
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  if (!authenticate(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationSlug } = await params;
  const db = getDb();
  const organization = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  });
  if (!organization)
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await request.json() as { view?: Record<string, unknown> };

  if (body.view) {
    const viewName = String(body.view.name ?? "KPI View");
    const existing = await db.savedView.findFirst({
      where: { organizationId: organization.id, userId: null, module: "dashboard", name: viewName },
      select: { id: true },
    });
    if (existing) {
      await db.savedView.update({
        where: { id: existing.id },
        data: { filtersJson: (body.view.filters ?? {}) as never },
      });
    } else {
      await db.savedView.create({
        data: {
          organizationId: organization.id,
          name: viewName,
          module: "dashboard",
          filtersJson: (body.view.filters ?? {}) as never,
          shared: true,
          isDefault: false,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
