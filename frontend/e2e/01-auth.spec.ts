import { test, expect } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Auth flows", () => {
  const ts = Date.now();
  const email = `e2e+auth+${ts}@eventhub.test`;
  const password = "Password1!";
  const name = "E2E Tester";

  test("user can register via API", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/register`, {
      data: { email, name, password },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      access_token: expect.any(String),
      token_type: "Bearer",
      user: { email, name, role: "USER" },
    });
  });

  test("user can log in and receive access token", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe("Bearer");
  });

  test("login rejects wrong password", async ({ page }) => {
    const res = await page.request.post(`${API}/api/auth/login`, {
      data: { email, password: "WrongPassword9!" },
    });
    expect(res.status()).toBe(401);
  });

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

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveTitle(/EventHub/);
    await expect(page.locator("form, [data-testid='register-form'], main")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/EventHub/);
    await expect(page.locator("form, [data-testid='login-form'], main")).toBeVisible();
  });
});
