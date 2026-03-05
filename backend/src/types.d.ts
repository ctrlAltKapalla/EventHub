import { PrismaClient } from "@prisma/client";
import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string; // stored as string in JWT, cast to Role when needed
  iat?: number;
  exp?: number;
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string };
    user: { sub: string; email: string; role: string };
  }
}
