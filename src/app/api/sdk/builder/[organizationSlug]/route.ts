import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function authenticate(request: NextRequest) {
  const key = process.env.BUILDER_API_KEY;
  if (!key) return false;
  return request.headers.get("authorization") === `Bearer ${key}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  if (!authenticate(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationSlug } = await params;
  const db = getDb();
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const websites = await db.website.findMany({
    where: { organizationId: org.id },
    include: {
      pages: {
        orderBy: { path: "asc" },
        select: {
          id: true,
          title: true,
          path: true,
          status: true,
          contentJson: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    organization: { slug: organizationSlug, name: org.name },
    websites: websites.map((w) => ({
      id: w.id,
      slug: w.slug,
      hostname: w.defaultHostname,
      status: w.status,
      themeJson: w.themeJson,
      updatedAt: w.updatedAt.toISOString(),
      pages: w.pages.map((p) => ({
        id: p.id,
        title: p.title,
        path: p.path,
        status: p.status,
        contentJson: p.contentJson,
        updatedAt: p.updatedAt.toISOString(),
      })),
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  if (!authenticate(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationSlug } = await params;
  const db = getDb();
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json() as {
    websiteId?: string;
    pageId?: string;
    contentJson?: unknown;
    title?: string;
    path?: string;
    status?: string;
  };

  if (body.websiteId && body.pageId && body.contentJson !== undefined) {
    const website = await db.website.findFirst({
      where: { id: body.websiteId, organizationId: org.id },
      select: { id: true },
    });
    if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

    const page = await db.websitePage.updateMany({
      where: { id: body.pageId, websiteId: website.id },
      data: {
        contentJson: body.contentJson as never,
        ...(body.title ? { title: body.title } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return NextResponse.json({ ok: true, updated: page.count });
  }

  if (body.websiteId && body.title && body.path) {
    const website = await db.website.findFirst({
      where: { id: body.websiteId, organizationId: org.id },
      select: { id: true },
    });
    if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

    const page = await db.websitePage.create({
      data: {
        websiteId: website.id,
        title: body.title,
        path: body.path,
        status: "DRAFT",
        contentJson: (body.contentJson ?? { blocks: [] }) as never,
      },
    });
    return NextResponse.json({ ok: true, pageId: page.id });
  }

  return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationSlug: string }> },
) {
  if (!authenticate(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationSlug } = await params;
  const db = getDb();
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json() as {
    websiteId?: string;
    themeJson?: unknown;
    status?: string;
    name?: string;
  };

  if (!body.websiteId) return NextResponse.json({ error: "websiteId required" }, { status: 400 });

  const result = await db.website.updateMany({
    where: { id: body.websiteId, organizationId: org.id },
    data: {
      ...(body.themeJson !== undefined ? { themeJson: body.themeJson as never } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.name ? { name: body.name } : {}),
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
