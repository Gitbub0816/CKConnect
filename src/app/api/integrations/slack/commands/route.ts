import { verifySlackSignature } from "@/lib/integrations/slack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySlackSignature(request.headers, rawBody)) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }
  const form = new URLSearchParams(rawBody);
  const command = form.get("command") ?? "/clearkey";
  const text = form.get("text")?.trim();
  return Response.json({
    response_type: "ephemeral",
    text: text
      ? `${command} received: ${text}. ClearKey captured the request and will attach it to the workspace activity stream.`
      : "ClearKey is connected. Try `/clearkey help`, `/clearkey lead`, or `/clearkey invoice` after workflow routing is enabled.",
  });
}
