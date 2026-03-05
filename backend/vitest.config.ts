import { defineConfig } from "vitest/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/** Parse a .env file into key-value pairs (no extra dependencies). */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
  return env;
}

// Defaults that work on the project host (native postgres, no Docker needed).
// .env.test overrides these. CI overrides via process.env.
const defaults: Record<string, string> = {
  DATABASE_URL:
    "postgresql://mission_control:mission_control@localhost:5432/mission_control?schema=eventhub_test",
  JWT_SECRET: "test_secret_at_least_32_chars_long_for_vitest",
  NODE_ENV: "test",
};

// CI env vars win over .env.test (already set via GH Actions env block)
const testEnv: Record<string, string> = {
  ...defaults,
  ...parseEnvFile(resolve(__dirname, ".env.test")),
  // CI-provided env vars take final precedence
  ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
  ...(process.env.JWT_SECRET ? { JWT_SECRET: process.env.JWT_SECRET } : {}),
};

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.spec.ts"],
    include: ["src/__tests__/**/*.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    env: testEnv,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/__tests__/**"],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
