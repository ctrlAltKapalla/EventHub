import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run setup before each test file (schema sync + table truncate)
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.spec.ts",
    ],
    include: ["src/__tests__/**/*.test.ts"],
    // Ensure tests run sequentially — shared DB state
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    // Inject test DB URL (overrideable via CI env)
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://eventhub:eventhub_test@localhost:5432/eventhub_test",
      JWT_SECRET: process.env.JWT_SECRET ?? "test_secret_min_32_chars_for_ci_run!",
      NODE_ENV: "test",
    },
  },
});
