/**
 * Test-only routes — only registered when NODE_ENV === "test" or "e2e"
 * NEVER available in production.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Role } from "@prisma/client";

const PromoteBody = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

export async function testHelperRoutes(app: FastifyInstance) {
  const env = process.env.NODE_ENV;
  if (env !== "test" && env !== "e2e" && env !== "development") {
    app.log.warn("testHelperRoutes: skipped (NODE_ENV=" + env + ")");
    return;
  }

  // POST /api/test/promote — promote a user to a specific role
  app.post("/api/test/promote", async (request, reply) => {
    const result = PromoteBody.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: "Invalid payload" });
    }
    const { email, role } = result.data;
    try {
      const user = await app.prisma.user.update({
        where: { email },
        data: { role },
        select: { id: true, email: true, role: true },
      });
      return reply.code(200).send(user);
    } catch {
      return reply.code(404).send({ error: "User not found" });
    }
  });

  // POST /api/test/reset — truncate all test data (use with caution)
  app.post("/api/test/reset", async (_request, reply) => {
    await app.prisma.$transaction([
      app.prisma.refreshToken.deleteMany(),
      app.prisma.registration.deleteMany(),
      app.prisma.event.deleteMany(),
      app.prisma.user.deleteMany(),
    ]);
    return reply.code(204).send();
  });
}
