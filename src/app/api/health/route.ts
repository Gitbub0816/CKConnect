import { logger, requestContext } from "@/lib/logging/logger";
import { getIntegrationConfigStatus } from "@/lib/integrations/config";

export async function GET(request: Request) {
  const context = requestContext(request);
  logger.info("health.check", context);
  const integrations = getIntegrationConfigStatus();
  return Response.json({
    status: "ok",
    service: "clearkey-connect",
    timestamp: new Date().toISOString(),
    dependencies: {
      database: process.env.DATABASE_URL ? "configured" : "pending",
      clerk: process.env.CLERK_SECRET_KEY ? "configured" : "pending",
      stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "pending",
      quickbooks: integrations.quickbooks ? "configured" : "pending",
      plaid: integrations.plaid ? "configured" : "pending",
      grapesjs: integrations.grapesjs ? "configured" : "pending",
      cloudflareR2: integrations.cloudflareR2 ? "configured" : "pending",
    },
  });
}
