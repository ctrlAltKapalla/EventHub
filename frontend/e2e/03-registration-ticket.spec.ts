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

    // Create organizer + attendee
    const org = await registerAndLogin(page, {
      email: `org+ticket+${ts}@eventhub.test`,
      name: "Ticket Organizer",
      role: "ORGANIZER",
    });
    organizerToken = org.token;

    const att = await registerAndLogin(page, {
      email: `att+ticket+${ts}@eventhub.test`,
      name: "Ticket Attendee",
    });
    attendeeToken = att.token;

    // Create + publish event
    eventId = await createEvent(page, organizerToken, {
      title: `Ticket Test Event ${ts}`,
    });
    await publishEvent(page, organizerToken, eventId);
    await page.close();
  });

  test("attendee can register for published event", async ({ page }) => {
    const res = await page.request.post(`${API}/api/events/${eventId}/register`, {
      headers: { Authorization: `Bearer ${attendeeToken}` },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    // ticketToken may be nested or top-level depending on API
    ticketToken = body.ticketToken ?? body.ticket_token ?? body.registration?.ticketToken;
    expect(ticketToken).toBeTruthy();
  });

  test("ticket is accessible via token", async ({ page }) => {
    const res = await page.request.get(`${API}/api/tickets/${ticketToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.checkedIn).toBe(false);
  });

  test("ticket page loads", async ({ page }) => {
    await page.goto(`/tickets/${ticketToken}`);
    // Accept any non-error page (200 HTML response is sufficient)
    await expect(page).toHaveURL(new RegExp(ticketToken));
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
    // Expect 409 Conflict or 400 Bad Request
    expect([400, 409]).toContain(res.status());
  });

  test("organizer can view attendee list", async ({ page }) => {
    const res = await page.request.get(`${API}/api/events/${eventId}/attendees`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.data ?? body.attendees ?? []);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
