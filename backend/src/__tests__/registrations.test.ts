import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.js";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";

let app: FastifyInstance;

// ── Helpers ───────────────────────────────────────────

async function registerUser(
  role: "USER" | "ORGANIZER" | "ADMIN" = "USER"
): Promise<{ access_token: string; userId: string }> {
  const email = `${role.toLowerCase()}-${randomUUID()}@test.com`;
  const reg = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, password: "Password123!", name: `Test ${role}` },
  });
  expect(reg.statusCode).toBe(201);
  const { id } = reg.json();

  // Promote role if needed
  if (role !== "USER") {
    await app.prisma.user.update({ where: { id }, data: { role } });
  }

  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "Password123!" },
  });
  const { access_token } = login.json();
  return { access_token, userId: id };
}

async function createPublishedEvent(organizerToken: string, capacity = 5): Promise<string> {
  const created = await app.inject({
    method: "POST",
    url: "/api/events",
    headers: { authorization: `Bearer ${organizerToken}` },
    payload: {
      title: `Event ${randomUUID()}`,
      description: "Test event",
      type: "CONFERENCE",
      startDate: "2027-06-01T10:00:00Z",
      endDate: "2027-06-01T18:00:00Z",
      location: "Berlin",
      capacity,
    },
  });
  expect(created.statusCode).toBe(201);
  const eventId = created.json().id;

  await app.inject({
    method: "PATCH",
    url: `/api/events/${eventId}/status`,
    headers: { authorization: `Bearer ${organizerToken}` },
    payload: { status: "PUBLISHED" },
  });
  return eventId;
}

// ── Lifecycle ─────────────────────────────────────────

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await app.prisma.$transaction([
    app.prisma.refreshToken.deleteMany(),
    app.prisma.registration.deleteMany(),
    app.prisma.event.deleteMany(),
    app.prisma.user.deleteMany(),
  ]);
});

// ── Tests ─────────────────────────────────────────────

describe("POST /api/events/:id/register", () => {
  it("logged-in user can register", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const { access_token: userToken } = await registerUser("USER");
    const eventId = await createPublishedEvent(orgToken);

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ eventId, status: "CONFIRMED" });
    expect(res.json().ticketToken).toBeTruthy();
  });

  it("guest can register with email and name", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "guest@example.com", guestName: "Gast User" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      guestEmail: "guest@example.com",
      guestName: "Gast User",
      status: "CONFIRMED",
    });
  });

  it("returns 401 for unauthenticated request without guest info", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 409 on duplicate registration (logged-in)", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const { access_token: userToken } = await registerUser("USER");
    const eventId = await createPublishedEvent(orgToken);

    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: {},
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(409);
  });

  it("returns 409 on duplicate guest registration (same email)", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "dup@example.com", guestName: "Dup" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "dup@example.com", guestName: "Dup" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("returns 422 when event is at capacity", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken, 1);

    // Fill the one spot
    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "first@example.com", guestName: "First" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "second@example.com", guestName: "Second" },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error.message).toMatch(/fully booked/i);
  });

  it("returns 422 for non-PUBLISHED event", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const created = await app.inject({
      method: "POST",
      url: "/api/events",
      headers: { authorization: `Bearer ${orgToken}` },
      payload: {
        title: "Draft Event",
        description: "Draft event for testing",
        type: "WORKSHOP",
        startDate: "2027-07-01T10:00:00Z",
        endDate: "2027-07-01T18:00:00Z",
        location: "Hamburg",
        capacity: 10,
      },
    });
    // Guard: event must have been created successfully
    expect(created.statusCode, `Event creation failed: ${created.body}`).toBe(201);
    const eventId = created.json().id;
    expect(eventId, "eventId must be a valid UUID").toBeTruthy();

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "x@example.com", guestName: "X" },
    });

    expect(res.statusCode).toBe(422);
  });
});

describe("GET /api/events/:id/attendees", () => {
  it("organizer can list attendees", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "att@example.com", guestName: "Att" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/events/${eventId}/attendees`,
      headers: { authorization: `Bearer ${orgToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
    expect(res.json().attendees[0]).toMatchObject({
      email: "att@example.com",
      isGuest: true,
    });
  });

  it("regular user cannot access attendees (403)", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const { access_token: userToken } = await registerUser("USER");
    const eventId = await createPublishedEvent(orgToken);

    const res = await app.inject({
      method: "GET",
      url: `/api/events/${eventId}/attendees`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe("GET /api/events/:id/attendees/csv", () => {
  it("returns CSV with correct headers", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "csv@example.com", guestName: "CSV User" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/events/${eventId}/attendees/csv`,
      headers: { authorization: `Bearer ${orgToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.body).toContain("name,email,ticket_token");
    expect(res.body).toContain("CSV User");
    expect(res.body).toContain("csv@example.com");
  });
});

describe("POST /api/events/:id/checkin", () => {
  it("organizer can check in a valid ticket", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    const regRes = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "checkin@example.com", guestName: "Check In" },
    });
    const { ticketToken } = regRes.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/checkin`,
      headers: { authorization: `Bearer ${orgToken}` },
      payload: { ticketToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().registration.checkedIn).toBe(true);
    expect(res.json().registration.checkedInAt).toBeTruthy();
  });

  it("returns 409 on double check-in", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    const regRes = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/register`,
      payload: { guestEmail: "double@example.com", guestName: "Double" },
    });
    const { ticketToken } = regRes.json();

    await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/checkin`,
      headers: { authorization: `Bearer ${orgToken}` },
      payload: { ticketToken },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/checkin`,
      headers: { authorization: `Bearer ${orgToken}` },
      payload: { ticketToken },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/already checked in/i);
  });

  it("returns 404 for unknown ticket token", async () => {
    const { access_token: orgToken } = await registerUser("ORGANIZER");
    const eventId = await createPublishedEvent(orgToken);

    const res = await app.inject({
      method: "POST",
      url: `/api/events/${eventId}/checkin`,
      headers: { authorization: `Bearer ${orgToken}` },
      payload: { ticketToken: randomUUID() },
    });

    expect(res.statusCode).toBe(404);
  });
});
