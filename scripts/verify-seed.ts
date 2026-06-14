import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const organizations = await db.organization.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      orgCode: true,
      status: true,
    },
  });

  console.log(JSON.stringify({
    organizationCount: organizations.length,
    organizations,
    activePricingConfigurations: await db.pricingConfig.count({ where: { active: true } }),
    websites: await db.website.count(),
    domains: await db.organizationDomain.count(),
    mailboxes: await db.managedMailbox.count(),
  }));
}

main().finally(async () => db.$disconnect());
