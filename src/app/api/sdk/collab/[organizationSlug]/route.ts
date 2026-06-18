import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function authenticate(request: NextRequest) {
  const key = process.env.CKCOLLAB_API_KEY;
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

  const [channels, events] = await Promise.all([
    db.collaborationChannel.findMany({
      where: { organizationId: org.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.calendarEvent.findMany({
      where: {
        organizationId: org.id,
        startsAt: { gte: new Date() },
        status: { not: "CANCELED" },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    organization: { slug: organizationSlug, name: org.name },
    channels: channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      type: ch.channelType,
      messages: ch.messages.map((m) => ({
        id: m.id,
        body: m.body,
        authorUserId: m.authorUserId,
        messageType: m.messageType,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
    upcomingEvents: events.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      location: e.location,
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

  const body = await request.json() as { channelId?: string; body?: string; messageType?: string };

  if (body.channelId && body.body) {
    const message = await db.collaborationMessage.create({
      data: {
        channelId: body.channelId,
        body: String(body.body),
        messageType: String(body.messageType ?? "TEXT"),
      },
    });
    return NextResponse.json({ ok: true, messageId: message.id });
  }

  return NextResponse.json({ error: "Missing channelId or body" }, { status: 400 });
}
