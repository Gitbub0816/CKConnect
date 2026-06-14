import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const demoSlugs = ["northstar-home-services", "brightline-studio", "harbor-dental-group"];

async function main() {
  const organizations = await db.organization.findMany({
    where: { slug: { in: demoSlugs } },
    include: { employees: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  let created = 0;
  for (const organization of organizations) {
    const employee = organization.employees[0];
    if (!employee) continue;
    const existing = await db.timeOffRequest.findFirst({
      where: {
        organizationId: organization.id,
        status: "PENDING",
        note: "Seeded request for approval testing",
      },
    });
    if (existing) continue;
    const startsOn = new Date(Date.now() + 14 * 86_400_000);
    await db.timeOffRequest.create({
      data: {
        organizationId: organization.id,
        employeeId: employee.id,
        policyType: "PTO",
        startsOn,
        endsOn: new Date(startsOn.getTime() + 86_400_000),
        hours: 16,
        status: "PENDING",
        note: "Seeded request for approval testing",
      },
    });
    created += 1;
  }
  console.log(`Ensured demo fixtures for ${organizations.length} organizations; created ${created} PTO requests.`);
}

main().finally(async () => db.$disconnect());
