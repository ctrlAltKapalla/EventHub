import { test, expect } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Auth flows", () => {
  const ts = Date.now();
  const email = `e2e+auth+${ts}@eventhub.test`;
  const password = "Password1!";
  const name = "E2E Tester";

  // ── API: Register ────────────────────────────────
  test("user can register via API — returns user object", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/register`, {
      data: { email, name, password },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    // Register returns the created user (not the token)
    expect(body.email).toBe(email);
    expect(body.name).toBe(name);
    expect(body.role).toBe("USER");
    expect(body.id).toBeTruthy();
  });

  // ── API: Login ───────────────────────────────────
  test("user can log in and receive access token", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("bearer");
    expect(body.expires_in).toBe(900);
  });

  // ── API: Wrong password ──────────────────────────
  test("login rejects wrong password", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password: "WrongPassword9!" },
    });
    expect(res.status()).toBe(401);
  });

  // ── API: /me ─────────────────────────────────────
  test("GET /api/auth/me returns user when authenticated", async ({ page }) => {
    const loginRes = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password },
    });
    const { access_token } = await loginRes.json();

    const meRes = await page.request.get(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.email).toBe(email);
  });

  test("GET /api/auth/me returns 401 without token", async ({ page }) => {
    const res = await page.request.get(`${API}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  // ── UI: Pages load ───────────────────────────────
  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveTitle(/EventHub/);
    // Use first() to avoid strict mode issues with multiple matching elements
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/EventHub/);
    await expect(page.locator("main").first()).toBeVisible();
  });
});
