/**
 * Security E2E tests — verify headers, CORS, and auth rate limiting.
 * These tests run against the real backend (NODE_ENV=e2e).
 */
import { test, expect } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Security headers", () => {
  test("backend health endpoint returns security headers", async ({ page }) => {
    const res = await page.request.get(`${API}/health`);
    expect(res.status()).toBe(200);

    const headers = res.headers();

    // X-Content-Type-Options (helmet)
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // X-Frame-Options (helmet)
    expect(
      headers["x-frame-options"]?.toLowerCase()
    ).toMatch(/deny|sameorigin/);

    // No Server header leaking tech stack
    expect(headers["server"]).toBeUndefined();
  });

  test("API events endpoint returns security headers", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events`);
    expect(res.status()).toBe(200);

    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("CORS policy", () => {
  test("OPTIONS preflight returns CORS headers", async ({ page }) => {
    const res = await page.request.fetch(`${API}/api/events`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    // 204 or 200 preflight response
    expect([200, 204]).toContain(res.status());
    const headers = res.headers();
    expect(headers["access-control-allow-origin"]).toBeTruthy();
    expect(headers["access-control-allow-methods"]).toBeTruthy();
  });

  test("rejects requests from disallowed origins", async ({ page }) => {
    const res = await page.request.fetch(`${API}/api/events`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    // Should either block or not echo back the origin
    const headers = res.headers();
    const allowedOrigin = headers["access-control-allow-origin"];
    if (allowedOrigin) {
      expect(allowedOrigin).not.toBe("http://evil.com");
    }
  });
});

test.describe("Auth endpoint protection", () => {
  test("login returns 401 for wrong credentials", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/login`, {
      data: { email: "nobody@nowhere.test", password: "WrongPass1!" },
    });
    expect(res.status()).toBe(401);
  });

  test("protected endpoint returns 401 without token", async ({ page }) => {
    const res = await page.request.get(`${API}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("protected endpoint returns 403 for insufficient role", async ({ page }) => {
    // Register + login as USER
    const ts = Date.now();
    const email = `security+${ts}@eventhub.test`;

    await page.request.post(`${API}/api/auth/register`, {
      data: { email, name: "Security Tester", password: "Password1!" },
    });
    const loginRes = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password: "Password1!" },
    });
    const { access_token } = await loginRes.json();

    // Try to create event as USER (needs ORGANIZER)
    const res = await page.request.post(`${API}/api/events`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: {
        title: "Unauthorized Event",
        description: "Should be rejected because user lacks organizer role.",
        type: "PARTY",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: "Nowhere",
        capacity: 10,
      },
    });
    expect(res.status()).toBe(403);
  });
});
