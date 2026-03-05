import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  // Skip rate limiting in test environment to avoid flaky tests
  if (process.env.NODE_ENV === "test") return;

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
}, { name: "rate-limit" });
