import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  // Global rate limit
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}.`,
    }),
  });

  // Stricter limit for auth endpoints — applied per route in auth.ts
  // but we expose the factory here for reuse
  app.decorate("authRateLimit", {
    max: 10,
    timeWindow: "15 minutes",
    keyGenerator: (req: { ip: string }) => req.ip,
  });
});
