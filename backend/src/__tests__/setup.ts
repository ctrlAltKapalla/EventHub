/**
 * Global test setup — runs once per worker before any test file.
 * 1. Syncs Prisma schema to the test DB (idempotent, no shadow DB needed).
 * 2. Truncates all tables so every `npm test` run starts from a clean slate.
 *
 * DATABASE_URL is injected by vitest.config.ts (defaults to mission_control
 * schema "eventhub_test" — no Docker / no manual setup required).
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

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
  throw new Error(
    `[test-setup] prisma db push failed. Check DATABASE_URL in vitest.config.ts or .env.test.\n${msg}`
  );
}

// ── Full truncate ─────────────────────────────────────

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
