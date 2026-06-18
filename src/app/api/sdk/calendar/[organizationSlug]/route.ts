import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function authenticate(request: NextRequest) {
  const key = process.env.CALENDAR_API_KEY;
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
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86_400_000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date(Date.now() + 90 * 86_400_000);

  const db = getDb();
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await db.calendarEvent.findMany({
    where: {
      organizationId: org.id,
      startsAt: { gte: from, lte: to },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    organization: { slug: organizationSlug, name: org.name },
    range: { from: from.toISOString(), to: to.toISOString() },
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.eventType,
      status: e.status,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      location: e.location,
      description: e.description,
      attendees: e.attendeeJson,
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
    title?: string;
    eventType?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    description?: string;
    attendeeJson?: unknown;
  };

  if (!body.title || !body.startsAt || !body.endsAt)
    return NextResponse.json({ error: "title, startsAt and endsAt are required" }, { status: 400 });

  const event = await db.calendarEvent.create({
    data: {
      organizationId: org.id,
      title: body.title,
      eventType: body.eventType ?? "MEETING",
      status: "CONFIRMED",
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      location: body.location ?? null,
      description: body.description ?? null,
      attendeeJson: (body.attendeeJson ?? []) as never,
    },
  });

  return NextResponse.json({ ok: true, eventId: event.id });
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

  const body = await request.json() as { id?: string; status?: string; [key: string]: unknown };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...updates } = body;
  const event = await db.calendarEvent.updateMany({
    where: { id: String(id), organizationId: org.id },
    data: updates as never,
  });

  return NextResponse.json({ ok: true, updated: event.count });
}
