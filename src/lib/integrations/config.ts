import "server-only";

function configured(...keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export function getIntegrationConfigStatus() {
  return {
    cloudflareR2: configured(
      "CLOUDFLARE_R2_ENDPOINT",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "CLOUDFLARE_R2_BUCKET",
    ),
    grapesjs: configured("GRAPEJS_PUBLIC_KEY", "GRAPEJS_API_KEY"),
    plaid: configured("PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV"),
    quickbooks: configured(
      "QUICKBOOKS_CLIENT_ID",
      "QUICKBOOKS_CLIENT_SECRET",
      "QUICKBOOKS_REDIRECT_URI",
    ) || configured("INTUIT_CLIENT_ID", "INTUIT_CLIENT_SECRET", "INTUIT_REDIRECT_URI"),
    stripe: configured("STRIPE_SECRET_KEY"),
    zoho: configured("ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REDIRECT_URI"),
  };
}

export function quickBooksEnv() {
  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID ?? process.env.INTUIT_CLIENT_ID,
    clientSecret:
      process.env.QUICKBOOKS_CLIENT_SECRET ?? process.env.INTUIT_CLIENT_SECRET,
    environment:
      process.env.QUICKBOOKS_ENVIRONMENT ??
      process.env.INTUIT_ENVIRONMENT ??
      "sandbox",
    redirectUri:
      process.env.QUICKBOOKS_REDIRECT_URI ?? process.env.INTUIT_REDIRECT_URI,
    webhookVerifierToken:
      process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN ??
      process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN,
  };
}
