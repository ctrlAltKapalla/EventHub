// Prisma seed — placeholder
// Wird in Phase 2 mit echten Fixtures befüllt
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  // TODO: Add seed data
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
