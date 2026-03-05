import { test, expect } from "@playwright/test";
import { registerAndLogin, createEvent, publishEvent } from "./helpers.js";

const API = process.env.API_URL ?? "http://localhost:4000";

test.describe("Registration & Ticket flow", () => {
  let organizerToken: string;
  let attendeeToken: string;
  let eventId: string;
  let ticketToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const ts = Date.now();

    // Create organizer
    const orgRes = await page.request.post(`${API}/api/auth/register`, {
      data: {
        email: `org+ticket+${ts}@eventhub.test`,
        name: "Ticket Organizer",
        password: "Password1!",
      },
    });
    organizerToken = (await orgRes.json()).access_token;

    // Create attendee
    const attRes = await page.request.post(`${API}/api/auth/register`, {
      data: {
        email: `att+ticket+${ts}@eventhub.test`,
        name: "Ticket Attendee",
        password: "Password1!",
      },
    });
    attendeeToken = (await attRes.json()).access_token;

    // Create + publish event
    eventId = await createEvent(page, organizerToken, { title: `Ticket Test Event ${ts}` });
    await publishEvent(page, organizerToken, eventId);
    await page.close();
  });

  test("attendee can register for published event", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events/${eventId}/register`, {
      headers: { Authorization: `Bearer ${attendeeToken}` },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticketToken).toBeTruthy();
    ticketToken = body.ticketToken;
  });

  test("ticket is accessible via token", async ({ page }) => {
    const res = await page.request.get(`${API}/api/tickets/${ticketToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ticketToken,
      checkedIn: false,
      event: { id: eventId },
    });
  });

  test("ticket page loads and shows QR code", async ({ page }) => {
    await page.goto(`/tickets/${ticketToken}`);
    await expect(page.locator("main, [data-testid='ticket-view']")).toBeVisible();
    // QR code should be rendered (img or canvas)
    const qr = page.locator("img[alt*='QR'], canvas, [data-testid='qr-code']");
    await expect(qr).toBeVisible({ timeout: 10_000 });
  });

  test("organizer can check in attendee via QR token", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events/${eventId}/checkin`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: { ticketToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.checkedIn).toBe(true);
  });

  test("double check-in is rejected", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events/${eventId}/checkin`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: { ticketToken },
    });
    expect(res.status()).toBe(409);
  });

  test("organizer can view attendee list", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events/${eventId}/attendees`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
    const checkedIn = (body.data ?? body).filter(
      (r: { checkedIn: boolean }) => r.checkedIn
    );
    expect(checkedIn.length).toBeGreaterThanOrEqual(1);
  });
});
