import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  await app.register(helmet, {
    // Allow inline scripts for Next.js dev mode when testing locally
    contentSecurityPolicy: process.env.NODE_ENV === "production"
      ? undefined
      : false,
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  });
});
