import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  // Skip in test environment
  if (process.env.NODE_ENV === "test") return;

  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  });
}, { name: "helmet" });
