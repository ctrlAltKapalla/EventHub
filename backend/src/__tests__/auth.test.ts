import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  // env is loaded from .env.test via vitest.config.ts
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  // Clean up test data between tests
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.registration.deleteMany();
  await app.prisma.event.deleteMany();
  await app.prisma.user.deleteMany();
});

// ── Helpers ───────────────────────────────────────────

async function registerUser(
  email = "test@example.com",
  password = "Password123",
  name = "Test User"
) {
  return app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, password, name },
  });
}

async function loginUser(
  email = "test@example.com",
  password = "Password123"
) {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password },
  });
}

// ── Tests ─────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registers a new user and returns 201", async () => {
    const res = await registerUser();
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("test@example.com");
    expect(body.role).toBe("USER");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email with 409", async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("rejects weak password with 400", async () => {
    const res = await registerUser("test@example.com", "weak");
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid email with 400", async () => {
    const res = await registerUser("not-an-email");
    expect(res.statusCode).toBe(400);
  });

  it("normalizes email to lowercase", async () => {
    const res = await registerUser("TEST@EXAMPLE.COM");
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("test@example.com");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await registerUser();
  });

  it("returns access token on valid credentials", async () => {
    const res = await loginUser();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("bearer");
    expect(body.expires_in).toBe(900);
  });

  it("sets HttpOnly refresh token cookie", async () => {
    const res = await loginUser();
    const cookieHeader = res.headers["set-cookie"] as string | string[];
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader ?? ""];
    const refreshCookie = cookies.find((c) => c.includes("refresh_token="));
    expect(refreshCookie).toBeTruthy();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  it("returns 401 for wrong password", async () => {
    const res = await loginUser("test@example.com", "wrongPassword1");
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await loginUser("unknown@example.com");
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues new access token and rotates refresh token", async () => {
    await registerUser();
    const loginRes = await loginUser();
    const cookies = loginRes.headers["set-cookie"] as string | string[];
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies ?? ""];
    const refreshCookie = cookieArr.find((c) => c.includes("refresh_token="));
    const token = refreshCookie?.match(/refresh_token=([^;]+)/)?.[1] ?? "";

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { refresh_token: token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.access_token).toBeTruthy();

    // New refresh cookie should differ (rotation)
    const newCookies = res.headers["set-cookie"] as string | string[];
    const newCookieArr = Array.isArray(newCookies) ? newCookies : [newCookies ?? ""];
    const newRefreshCookie = newCookieArr.find((c) => c.includes("refresh_token="));
    const newToken = newRefreshCookie?.match(/refresh_token=([^;]+)/)?.[1] ?? "";
    expect(newToken).not.toBe(token);
  });

  it("returns 401 without refresh token cookie", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/refresh" });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears refresh cookie and returns 204", async () => {
    await registerUser();
    const loginRes = await loginUser();
    const body = JSON.parse(loginRes.body);
    const cookies = loginRes.headers["set-cookie"] as string | string[];
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies ?? ""];
    const token = cookieArr.find((c) => c.includes("refresh_token="))
      ?.match(/refresh_token=([^;]+)/)?.[1] ?? "";

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${body.access_token}` },
      cookies: { refresh_token: token },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user profile", async () => {
    await registerUser();
    const loginRes = await loginUser();
    const { access_token } = JSON.parse(loginRes.body);

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${access_token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("test@example.com");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
