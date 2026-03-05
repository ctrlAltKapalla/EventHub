import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.js";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";

let app: FastifyInstance;

// ── Helpers ───────────────────────────────────────────

async function setupTicket(): Promise<{ ticketToken: string; eventId: string }> {
  const orgEmail = `org-${randomUUID()}@test.com`;
  await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email: orgEmail, password: "Password123!", name: "Organizer" },
  });
  const orgId = (await app.prisma.user.findUnique({ where: { email: orgEmail } }))!.id;
  await app.prisma.user.update({ where: { id: orgId }, data: { role: "ORGANIZER" } });

  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: orgEmail, password: "Password123!" },
  });
  const orgToken = login.json().access_token;

  const eventRes = await app.inject({
    method: "POST",
    url: "/api/events",
    headers: { authorization: `Bearer ${orgToken}` },
    payload: {
      title: "Ticket Test Event",
      description: "For ticket tests",
      type: "WORKSHOP",
      startDate: "2027-08-01T10:00:00Z",
      endDate: "2027-08-01T18:00:00Z",
      location: "Munich",
      capacity: 50,
    },
  });
  const eventId = eventRes.json().id;

  await app.inject({
    method: "PATCH",
    url: `/api/events/${eventId}/status`,
    headers: { authorization: `Bearer ${orgToken}` },
    payload: { status: "PUBLISHED" },
  });

  const regRes = await app.inject({
    method: "POST",
    url: `/api/events/${eventId}/register`,
    payload: { guestEmail: "ticket-user@example.com", guestName: "Ticket User" },
  });
  expect(regRes.statusCode).toBe(201);
  const { ticketToken } = regRes.json();

  return { ticketToken, eventId };
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

describe("GET /api/tickets/:token", () => {
  it("returns ticket JSON for valid token", async () => {
    const { ticketToken } = await setupTicket();

    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${ticketToken}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticketToken).toBe(ticketToken);
    expect(body.status).toBe("CONFIRMED");
    expect(body.checkedIn).toBe(false);
    expect(body.attendee.name).toBe("Ticket User");
    expect(body.attendee.email).toBe("ticket-user@example.com");
    expect(body.attendee.isGuest).toBe(true);
    expect(body.event.title).toBe("Ticket Test Event");
  });

  it("returns 404 for unknown token", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${randomUUID()}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/tickets/:token/qr", () => {
  it("returns a PNG image", async () => {
    const { ticketToken } = await setupTicket();

    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${ticketToken}/qr`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    // PNG magic bytes: 89 50 4E 47
    const buf = Buffer.from(res.rawPayload);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });

  it("returns 404 for unknown token", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${randomUUID()}/qr`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/tickets/:token/pdf", () => {
  it("returns a PDF file", async () => {
    const { ticketToken } = await setupTicket();

    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${ticketToken}/pdf`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    // PDF magic bytes: %PDF
    const buf = Buffer.from(res.rawPayload);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });

  it("returns 404 for unknown token", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/tickets/${randomUUID()}/pdf`,
    });
    expect(res.statusCode).toBe(404);
  });
});
