import { verifySlackSignature } from "@/lib/integrations/slack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySlackSignature(request.headers, rawBody)) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }
  const event = JSON.parse(rawBody) as {
    type?: string;
    challenge?: string;
    event?: { type?: string };
    team_id?: string;
  };
  if (event.type === "url_verification" && event.challenge) {
    return Response.json({ challenge: event.challenge });
  }
  return Response.json({ ok: true });
}
