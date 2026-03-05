import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  // Skip rate limiting in test environment to avoid flaky tests
  if (process.env.NODE_ENV === "test") return;

  // Global rate limit — generous for API browsing
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: "RATE_LIMITED",
        message: `Rate limit exceeded. Try again in ${context.after}.`,
      },
    }),
  });

  // Strict limit on auth mutation endpoints (login, register, refresh)
  // Applied after global plugin via route-level config
  const authRouteLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes",
        errorResponseBuilder: (_req: unknown, context: { after: string }) => ({
          error: {
            code: "AUTH_RATE_LIMITED",
            message: `Too many auth attempts. Try again in ${context.after}.`,
          },
        }),
      },
    },
  };

  // Attach strict limits to individual auth routes after app is ready
  app.addHook("onRoute", (routeOptions) => {
    const strictPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"];
    if (
      strictPaths.includes(routeOptions.url) &&
      (routeOptions.method === "POST" ||
        (Array.isArray(routeOptions.method) && routeOptions.method.includes("POST")))
    ) {
      routeOptions.config = {
        ...(routeOptions.config ?? {}),
        ...authRouteLimit.config,
      };
    }
  });
}, { name: "rate-limit" });
