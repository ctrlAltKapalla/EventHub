import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../lib/token.js";
import { Errors } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";

// ── Schemas ──────────────────────────────────────────

const RegisterBody = z.object({
  email: z.string().email("Invalid email address").max(255),
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Cookie helpers ────────────────────────────────────

const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
};

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

// ── Token issuance ────────────────────────────────────

async function issueTokenPair(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  role: string,
  reply: FastifyReply
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  // Access token (JWT, 15 min)
  const access_token = await fastify.jwt.sign({ sub: userId, email, role });

  // Refresh token (opaque, 30 days, stored as hash in DB)
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  await fastify.prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  setRefreshCookie(reply, refreshToken);

  return { access_token, token_type: "bearer", expires_in: 900 };
}

// ── Route handlers ────────────────────────────────────

async function registerHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = RegisterBody.safeParse(request.body);
  if (!result.success) {
    return Errors.badRequest(
      reply,
      result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }))
    );
  }

  const { email, name, password } = result.data;
  const normalized = email.toLowerCase();

  const existing = await this.prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) {
    return Errors.conflict(reply, "EMAIL_ALREADY_EXISTS", "Email already registered");
  }

  const passwordHash = await hashPassword(password);
  const user = await this.prisma.user.create({
    data: { email: normalized, name, passwordHash },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return reply.code(201).send(user);
}

async function loginHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = LoginBody.safeParse(request.body);
  if (!result.success) {
    return Errors.unauthorized(reply);
  }

  const { email, password } = result.data;
  const user = await this.prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Errors.unauthorized(reply);
  }

  if (!user.isActive) {
    return Errors.sendError(reply, 403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  const tokens = await issueTokenPair(
    this,
    user.id,
    user.email,
    user.role,
    reply
  );
  return reply.send(tokens);
}

async function refreshHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const rawToken = request.cookies?.[REFRESH_COOKIE];
  if (!rawToken) return Errors.unauthorized(reply);

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await this.prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    // Expired or not found — clear cookie
    clearRefreshCookie(reply);
    return Errors.unauthorized(reply);
  }

  if (!stored.user.isActive) {
    clearRefreshCookie(reply);
    return Errors.sendError(reply, 403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  // Token Rotation: delete old, issue new
  await this.prisma.refreshToken.delete({ where: { tokenHash } });

  // Clean up expired tokens for this user in the background
  this.prisma.refreshToken
    .deleteMany({
      where: { userId: stored.userId, expiresAt: { lt: new Date() } },
    })
    .catch(() => {});

  const tokens = await issueTokenPair(
    this,
    stored.user.id,
    stored.user.email,
    stored.user.role,
    reply
  );
  return reply.send(tokens);
}

async function logoutHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const rawToken = request.cookies?.[REFRESH_COOKIE];
  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await this.prisma.refreshToken
      .delete({ where: { tokenHash } })
      .catch(() => {}); // ignore if already gone
  }
  clearRefreshCookie(reply);
  return reply.code(204).send();
}

async function meHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { sub } = request.user;
  const user = await this.prisma.user.findUnique({
    where: { id: sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user) return Errors.notFound(reply, "User");
  return reply.send(user);
}

// ── Plugin registration ───────────────────────────────

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", registerHandler.bind(fastify));
  fastify.post("/login", loginHandler.bind(fastify));
  fastify.post("/refresh", refreshHandler.bind(fastify));

  fastify.post(
    "/logout",
    { preHandler: [requireAuth] },
    logoutHandler.bind(fastify)
  );

  fastify.get(
    "/me",
    { preHandler: [requireAuth] },
    meHandler.bind(fastify)
  );
}
