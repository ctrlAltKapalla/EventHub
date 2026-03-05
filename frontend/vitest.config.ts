import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Exclude Playwright E2E tests — those run via `playwright test`, not vitest
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/*.spec.ts",
    ],
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
