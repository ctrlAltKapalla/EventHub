import { FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";
import { Errors } from "../lib/errors.js";

/** Verify JWT access token. Attaches decoded payload to request.user. */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return Errors.unauthorized(reply);
  }
}

/** Verify JWT + require one of the given roles. */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    const user = request.user;
    if (!roles.includes(user.role as Role)) {
      return Errors.forbidden(reply);
    }
  };
}
