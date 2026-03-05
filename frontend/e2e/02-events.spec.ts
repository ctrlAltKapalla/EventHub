import { test, expect } from "@playwright/test";
import { registerAndLogin, createEvent, publishEvent } from "./helpers.js";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Event management", () => {
  let organizerToken: string;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const ts = Date.now();
    // Register as organizer
    const res = await page.request.post(`${API}/api/auth/register`, {
      data: {
        email: `organizer+${ts}@eventhub.test`,
        name: "Test Organizer",
        password: "Password1!",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    organizerToken = body.access_token;
    await page.close();
  });

  test("organizer can create an event (DRAFT)", async ({ page }) => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600 * 1000).toISOString();

    const res = await page.request.post(`${API}/api/events`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: {
        title: "E2E Workshop Berlin",
        description: "Ein automatisierter E2E Test für die Eventplanung.",
        type: "WORKSHOP",
        startDate: start,
        endDate: end,
        location: "TechHub Berlin, Mitte",
        capacity: 30,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      title: "E2E Workshop Berlin",
      type: "WORKSHOP",
      status: "DRAFT",
    });
    expect(body.id).toBeTruthy();
    eventId = body.id;
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
    const found = body.data?.find((e: { id: string }) => e.id === eventId);
    expect(found).toBeDefined();
  });

  test("event can be found via search query", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events?q=E2E+Workshop`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.length).toBeGreaterThan(0);
    expect(body.data[0].title).toContain("E2E Workshop");
  });

  test("event detail page loads", async ({ page }) => {
    await page.goto(`/events/${eventId}`);
    await expect(page.locator("main, [data-testid='event-detail']")).toBeVisible();
  });

  test("unauthenticated user cannot create event", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events`, {
      data: {
        title: "Unauthorized Event",
        description: "Should not be created",
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
