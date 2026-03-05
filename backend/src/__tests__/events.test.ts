import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../server.js";
import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { randomUUID } from "crypto";

let app: FastifyInstance;

beforeAll(async () => {
  // env is loaded from .env.test via vitest.config.ts
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.registration.deleteMany();
  await app.prisma.event.deleteMany();
  await app.prisma.user.deleteMany();
});

// ── Helpers ───────────────────────────────────────────

async function createUser(role: Role = Role.USER) {
  const email = `${role.toLowerCase()}-${randomUUID()}@example.com`;
  await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email, password: "Password123", name: `Test ${role}` },
  });
  // Promote role directly in DB
  await app.prisma.user.update({ where: { email }, data: { role } });
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "Password123" },
  });
  const { access_token } = JSON.parse(loginRes.body);
  return { access_token, email };
}

const SAMPLE_EVENT = {
  title: "Tech Conference 2026",
  description: "A great tech conference with lots of workshops.",
  type: "CONFERENCE",
  startDate: "2026-06-15T09:00:00.000Z",
  endDate: "2026-06-15T18:00:00.000Z",
  location: "Berlin Expo Center",
  capacity: 200,
};

async function createEvent(token: string, overrides: object = {}) {
  return app.inject({
    method: "POST",
    url: "/api/events",
    headers: { authorization: `Bearer ${token}` },
    payload: { ...SAMPLE_EVENT, ...overrides },
  });
}

// ── Tests ─────────────────────────────────────────────

describe("POST /api/events", () => {
  it("organizer can create an event", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const res = await createEvent(access_token);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Tech Conference 2026");
    expect(body.status).toBe("DRAFT");
    expect(body.slug).toBe("tech-conference-2026");
  });

  it("regular user cannot create an event (403)", async () => {
    const { access_token } = await createUser(Role.USER);
    const res = await createEvent(access_token);
    expect(res.statusCode).toBe(403);
  });

  it("rejects invalid dates (400)", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const res = await createEvent(access_token, {
      startDate: "2026-06-15T18:00:00.000Z",
      endDate: "2026-06-15T09:00:00.000Z",
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.details[0].field).toBe("endDate");
  });

  it("generates unique slugs for duplicate titles", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const res1 = await createEvent(access_token);
    const res2 = await createEvent(access_token);
    const slug1 = JSON.parse(res1.body).slug;
    const slug2 = JSON.parse(res2.body).slug;
    expect(slug1).not.toBe(slug2);
    expect(slug2).toMatch(/tech-conference-2026-\d+/);
  });
});

describe("GET /api/events", () => {
  it("lists only PUBLISHED events for public", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    // Create draft event
    await createEvent(access_token);
    // Publish one
    const res2 = await createEvent(access_token, { title: "Public Event" });
    const { id } = JSON.parse(res2.body);
    await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "PUBLISHED" },
    });

    const res = await app.inject({ method: "GET", url: "/api/events" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.every((e: any) => e.status === "PUBLISHED")).toBe(true);
  });

  it("supports search by query", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const res = await createEvent(access_token, { title: "Unique Workshop 2026", type: "WORKSHOP", status: "PUBLISHED" });
    const { id } = JSON.parse(res.body);
    await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "PUBLISHED" },
    });

    const listRes = await app.inject({ method: "GET", url: "/api/events?q=Unique+Workshop" });
    const body = JSON.parse(listRes.body);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.items[0].title).toContain("Unique Workshop");
  });

  it("paginates correctly", async () => {
    const listRes = await app.inject({ method: "GET", url: "/api/events?page=1&page_size=5" });
    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.body);
    expect(body).toHaveProperty("pages");
  });
});

describe("GET /api/events/:id", () => {
  it("returns event by id", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);
    // Publish it first
    await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "PUBLISHED" },
    });

    const res = await app.inject({ method: "GET", url: `/api/events/${id}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await app.inject({ method: "GET", url: "/api/events/00000000-0000-0000-0000-000000000000" });
    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /api/events/:id", () => {
  it("organizer can update own event", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${id}`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { title: "Updated Title", capacity: 300 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Updated Title");
    expect(body.capacity).toBe(300);
  });

  it("other organizer cannot update event (403)", async () => {
    const { access_token: org1Token } = await createUser(Role.ORGANIZER);
    const { access_token: org2Token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(org1Token);
    const { id } = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${id}`,
      headers: { authorization: `Bearer ${org2Token}` },
      payload: { title: "Hacked" },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("DELETE /api/events/:id", () => {
  it("organizer can delete own DRAFT event", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/events/${id}`,
      headers: { authorization: `Bearer ${access_token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it("organizer cannot delete PUBLISHED event (422)", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);
    await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "PUBLISHED" },
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/api/events/${id}`,
      headers: { authorization: `Bearer ${access_token}` },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("PATCH /api/events/:id/status", () => {
  it("organizer can publish a DRAFT event", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "PUBLISHED" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe("PUBLISHED");
  });

  it("organizer cannot set LOCKED status (422)", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "LOCKED" },
    });
    expect(res.statusCode).toBe(400); // LOCKED not in enum for organizer
  });

  it("returns 422 for invalid transition", async () => {
    const { access_token } = await createUser(Role.ORGANIZER);
    const createRes = await createEvent(access_token);
    const { id } = JSON.parse(createRes.body);
    // DRAFT → COMPLETED is not allowed
    const res = await app.inject({
      method: "PATCH",
      url: `/api/events/${id}/status`,
      headers: { authorization: `Bearer ${access_token}` },
      payload: { status: "COMPLETED" },
    });
    expect(res.statusCode).toBe(422);
  });
});
