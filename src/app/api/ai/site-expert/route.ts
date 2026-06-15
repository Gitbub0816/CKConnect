import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrganizationAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { getOpenAI, siteExpertModel } from "@/lib/integrations/openai";
import { appendAuditEvent } from "@/lib/logging/audit";
import { assertTrustedMutationOrigin } from "@/lib/request-security";

const requestSchema = z.object({
  organizationSlug: z.string().min(1),
  websiteId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(8000),
  mode: z.enum(["chat", "generate-page", "automation"]).default("chat"),
  currentBlocks: z.array(z.record(z.string(), z.unknown())).max(50).default([]),
  currentCode: z
    .object({
      html: z.string().max(100_000).default(""),
      css: z.string().max(100_000).default(""),
      javascript: z.string().max(100_000).default(""),
    })
    .default({ html: "", css: "", javascript: "" }),
});

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate =
    fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  assertTrustedMutationOrigin(request);
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OpenAI is not configured. Add OPENAI_API_KEY to the Vercel project.",
      },
      { status: 503 },
    );
  }
  const input = requestSchema.parse(await request.json());
  const { organization, user } = await requireOrganizationAccess(
    input.organizationSlug,
    "websites.write",
  );
  if (!user)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  const db = getDb();
  const website = await db.website.findFirstOrThrow({
    where: { id: input.websiteId, organizationId: organization.id },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  const [counts, automations] = await Promise.all([
    Promise.all([
      db.contact.count({ where: { organizationId: organization.id } }),
      db.product.count({ where: { organizationId: organization.id } }),
      db.booking.count({ where: { organizationId: organization.id } }),
      db.endpointSubmission.count({
        where: { organizationId: organization.id },
      }),
    ]),
    db.automationRule.findMany({
      where: { organizationId: organization.id },
      select: { name: true, triggerType: true, active: true },
      take: 20,
    }),
  ]);
  let conversation = input.conversationId
    ? await db.aiConversation.findFirst({
        where: { id: input.conversationId, organizationId: organization.id },
      })
    : null;
  conversation ??= await db.aiConversation.create({
    data: {
      organizationId: organization.id,
      websiteId: website.id,
      userId: user.id,
      title: input.message.slice(0, 80),
      contextJson: { mode: input.mode, hostname: website.defaultHostname },
    },
  });
  const history = await db.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  await db.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: input.message,
    },
  });

  const structuredInstruction =
    input.mode === "chat"
      ? "Answer as concise Markdown. Explain concrete changes and identify risks. Do not claim changes were applied."
      : `Return a short explanation followed by exactly one fenced JSON object with this shape:
{"answer":"summary","blocks":[{"type":"hero|content|services|testimonial|cta|payment|booking|form|portal","title":"...","body":"...","action":"..."}],"code":{"html":"","css":"","javascript":""},"automation":{"name":"","trigger":"","conditions":[],"actions":[]}}
Only include fields relevant to the request. For generate-page requests, create a complete sandbox draft suitable for immediate review in the canvas. Never say you cannot build pages; if production publication is needed, explain that the draft must be saved or published by the user. Never generate code that reads cookies, localStorage credentials, environment variables, or external scripts.`;
  const context = {
    tenant: {
      name: organization.name,
      slug: organization.slug,
      industryDataAvailable: false,
    },
    site: {
      hostname: website.defaultHostname,
      status: website.status,
      pages: website.pages.map((page) => ({
        path: page.path,
        title: page.title,
        status: page.status,
      })),
      blocks: input.currentBlocks,
      code: input.currentCode,
    },
    productData: {
      contacts: counts[0],
      products: counts[1],
      bookings: counts[2],
      submissions: counts[3],
    },
    automations,
  };
  const response = await getOpenAI().responses.create({
    model: siteExpertModel,
    instructions: `You are Kira's ClearKey website sandbox builder: a senior conversion designer, frontend engineer, accessibility reviewer, SEO strategist, and business automation architect embedded in a multi-tenant business platform.
Use only the supplied tenant context. Treat all tenant data as confidential. Generate useful sandbox drafts when asked to build or revise a website. Recommend accessible, responsive, production-grade changes. Never weaken authentication, tenant isolation, audit logging, payment security, or CSP. ${structuredInstruction}`,
    input: [
      ...history.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      {
        role: "user" as const,
        content: `Tenant context:\n${JSON.stringify(context)}\n\nRequest:\n${input.message}`,
      },
    ],
  });
  const text = response.output_text;
  const parsed = input.mode === "chat" ? null : extractJson(text);
  const assistant = await db.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: String(parsed?.answer ?? text),
      model: siteExpertModel,
      responseId: response.id,
      usageJson: (response.usage ?? {}) as Prisma.InputJsonValue,
    },
  });
  await appendAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: `ai.site_expert.${input.mode}`,
    entityType: "AiMessage",
    entityId: assistant.id,
    after: {
      conversationId: conversation.id,
      model: siteExpertModel,
      responseId: response.id,
      mode: input.mode,
    },
    category: "BUSINESS",
  });
  return Response.json({
    conversationId: conversation.id,
    messageId: assistant.id,
    answer: assistant.content,
    suggestedBlocks: Array.isArray(parsed?.blocks) ? parsed.blocks : null,
    suggestedCode: parsed?.code ?? null,
    suggestedAutomation: parsed?.automation ?? null,
    model: siteExpertModel,
  });
}
