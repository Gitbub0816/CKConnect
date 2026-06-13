import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

let prisma: PrismaClient | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!prisma) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}
