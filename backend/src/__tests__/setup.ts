/**
 * Global test setup — runs once per worker before any test file.
 * 1. Validates required env vars are present.
 * 2. Syncs the Prisma schema to the test DB (idempotent).
 * 3. Truncates all tables so every npm test run starts from a clean slate.
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

// ── Env guards ────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "Create backend/.env.test with:\n" +
      "  DATABASE_URL=postgresql://mission_control:mission_control@localhost:5432/mission_control?schema=eventhub_test\n" +
      "  JWT_SECRET=test_secret_at_least_32_chars_long_for_vitest"
  );
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Check backend/.env.test.");
}

// ── Schema sync ───────────────────────────────────────

console.log("[test-setup] Syncing test DB schema via prisma db push …");
try {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env },
    stdio: "pipe",
  });
  console.log("[test-setup] Schema in sync.");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  throw new Error(`[test-setup] prisma db push failed:\n${msg}`);
}

// ── Full truncate ─────────────────────────────────────
// Clears all tables so a previous crashed run can't pollute the next one.

const prisma = new PrismaClient();

try {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log("[test-setup] Test DB truncated.");
} finally {
  await prisma.$disconnect();
}
