import { type Page, expect } from "@playwright/test";

const API = process.env.API_URL ?? "http://localhost:4000";

/** Registers a user via API and returns the access token. */
export async function registerAndLogin(
  page: Page,
  overrides: Partial<{ email: string; name: string; password: string }> = {}
): Promise<{ token: string; userId: string }> {
  const email = overrides.email ?? `test+${Date.now()}@eventhub.test`;
  const name = overrides.name ?? "Test User";
  const password = overrides.password ?? "Password1!";

  const res = await page.request.post(`${API}/api/auth/register`, {
    data: { email, name, password },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return { token: body.access_token, userId: body.user.id };
}

/** Logs in via API and returns the access token. */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<string> {
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.access_token;
}

/** Creates an event via API as organizer. Returns event id. */
export async function createEvent(
  page: Page,
  token: string,
  overrides: Partial<{
    title: string;
    type: string;
    capacity: number;
    startDate: string;
    endDate: string;
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
      startDate: overrides.startDate ?? start,
      endDate: overrides.endDate ?? end,
      location: "Test Venue, Berlin",
      capacity: overrides.capacity ?? 50,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.id;
}

/** Promotes a user to ORGANIZER via API (requires admin or direct DB — use admin token). */
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
