export async function GET() {
  return Response.json({
    status: "ok",
    service: "clearkey-connect",
    timestamp: new Date().toISOString(),
    dependencies: {
      database: process.env.DATABASE_URL ? "configured" : "pending",
      clerk: process.env.CLERK_SECRET_KEY ? "configured" : "pending",
      stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "pending",
      quickbooks: process.env.INTUIT_CLIENT_ID ? "configured" : "pending",
      cloudflareR2: process.env.CLOUDFLARE_R2_ENDPOINT ? "configured" : "pending",
    },
  });
}
