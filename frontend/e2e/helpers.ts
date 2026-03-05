import { type Page, expect } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";

/** Registers a user via API, then logs in and returns the access token + userId. */
export async function registerAndLogin(
  page: Page,
  overrides: Partial<{ email: string; name: string; password: string; role: string }> = {}
): Promise<{ token: string; userId: string; email: string }> {
  const email = overrides.email ?? `test+${Date.now()}@eventhub.test`;
  const name = overrides.name ?? "Test User";
  const password = overrides.password ?? "Password1!";

  // Register → returns user object
  const regRes = await page.request.post(`${API}/api/auth/register`, {
    data: { email, name, password },
  });
  expect(regRes.status()).toBe(201);
  const user = await regRes.json();

  // Promote role if requested (uses test-only endpoint)
  if (overrides.role && overrides.role !== "USER") {
    const promoteRes = await page.request.post(`${API}/api/test/promote`, {
      data: { email, role: overrides.role },
    });
    expect(promoteRes.status()).toBe(200);
  }

  // Login → returns token
  const loginRes = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password },
  });
  expect(loginRes.status()).toBe(200);
  const tokens = await loginRes.json();

  return { token: tokens.access_token, userId: user.id, email };
}

/** Creates an event via API as organizer. Returns event id. */
export async function createEvent(
  page: Page,
  token: string,
  overrides: Partial<{
    title: string;
    type: string;
    capacity: number;
  }> = {}
): Promise<string> {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 3600 * 1000).toISOString();

  const res = await page.request.post(`${API}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: overrides.title ?? `Test Event ${Date.now()}`,
      description: "Automated E2E test event with enough description text.",
      type: overrides.type ?? "CONFERENCE",
      startDate: start,
      endDate: end,
      location: "Test Venue, Berlin",
      capacity: overrides.capacity ?? 50,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.id;
}

/** Publishes an event via API. */
export async function publishEvent(
  page: Page,
  token: string,
  eventId: string
): Promise<void> {
  const res = await page.request.patch(`${API}/api/events/${eventId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: "PUBLISHED" },
  });
  expect(res.status()).toBe(200);
}
