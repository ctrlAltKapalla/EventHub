import Fastify, { FastifyInstance } from "fastify";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import corsPlugin from "./plugins/cors.js";
import helmetPlugin from "./plugins/helmet.js";
import rateLimitPlugin from "./plugins/rateLimit.js";
import authRoutes from "./routes/auth.js";
import eventsRoutes from "./routes/events.js";
import { registrationRoutes } from "./routes/registrations.js";
import { ticketRoutes } from "./routes/tickets.js";
import { testHelperRoutes } from "./routes/testHelpers.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      process.env.NODE_ENV !== "test"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }
        : false,
  });

  // ── Plugins ────────────────────────────────────────
  await app.register(helmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);

  // ── Routes ─────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", service: "eventhub-backend" }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(eventsRoutes, { prefix: "/api/events" });
  await app.register(registrationRoutes);
  await app.register(ticketRoutes);
  await app.register(testHelperRoutes);

  return app;
}

// ── Entrypoint ────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  const app = await buildApp();
  try {
    const port = Number(process.env.PORT ?? 4000);
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
