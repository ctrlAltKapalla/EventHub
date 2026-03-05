import { test, expect } from "@playwright/test";
import { registerAndLogin, createEvent, publishEvent } from "./helpers.js";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Event management", () => {
  let organizerToken: string;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const result = await registerAndLogin(page, {
      email: `organizer+${Date.now()}@eventhub.test`,
      name: "Test Organizer",
    });
    organizerToken = result.token;
    await page.close();
  });

  test("organizer can create an event (DRAFT)", async ({ page }) => {
    eventId = await createEvent(page, organizerToken, {
      title: "E2E Workshop Berlin",
    });
    expect(eventId).toBeTruthy();
  });

  test("organizer can publish the event", async ({ page }) => {
    await publishEvent(page, organizerToken, eventId);

    const res = await page.request.get(`${API}/api/events/${eventId}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PUBLISHED");
  });

  test("event appears in public listing", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events?status=PUBLISHED`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Handle both { data: [...] } and direct array responses
    const events = Array.isArray(body) ? body : (body.data ?? body.events ?? []);
    const found = events.find((e: { id: string }) => e.id === eventId);
    expect(found).toBeDefined();
  });

  test("event can be found via search query", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events?q=E2E+Workshop`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const events = Array.isArray(body) ? body : (body.data ?? body.events ?? []);
    expect(events.length).toBeGreaterThan(0);
  });

  test("event detail page loads", async ({ page }) => {
    await page.goto(`/events/${eventId}`);
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("unauthenticated user cannot create event", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events`, {
      data: {
        title: "Unauthorized Event",
        description: "Should not be created at all.",
        type: "PARTY",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        location: "Nowhere",
        capacity: 10,
      },
    });
    expect(res.status()).toBe(401);
  });
});
