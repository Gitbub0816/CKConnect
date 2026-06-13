import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  console.log(JSON.stringify({
    organizations: await db.organization.count(),
    activePricingConfigurations: await db.pricingConfig.count({ where: { active: true } }),
    websites: await db.website.count(),
    domains: await db.organizationDomain.count(),
    mailboxes: await db.managedMailbox.count(),
  }));
}

main().finally(async () => db.$disconnect());
