import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendError, Errors } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendMail, registrationConfirmationMail } from "../lib/mail.js";
import { Role } from "@prisma/client";

// ── Schemas ──────────────────────────────────────────

const RegisterBody = z.object({
  // For guest registrations (no auth token)
  guestEmail: z.string().email().optional(),
  guestName: z.string().min(1).max(100).optional(),
});

const CheckinBody = z.object({
  ticketToken: z.string().uuid("ticketToken must be a UUID"),
});

// ── Routes ───────────────────────────────────────────

export async function registrationRoutes(app: FastifyInstance) {
  // ── POST /api/events/:id/register ─────────────────
  // Auth optional: if token present → use userId; else require guestEmail + guestName
  app.post<{ Params: { id: string } }>(
    "/api/events/:id/register",
    async (request, reply) => {
      const params = request.params as { id: string };
      const prisma = app.prisma;

      // Parse body (may be empty JSON or guest fields)
      const rawBody = request.body ?? {};
      const parsed = RegisterBody.safeParse(rawBody);
      if (!parsed.success) {
        return sendError(reply, 400, "VALIDATION_ERROR", parsed.error.errors[0].message);
      }
      const { guestEmail, guestName } = parsed.data;

      // Determine if authenticated
      let userId: string | null = null;
      let registrantEmail: string;
      let registrantName: string;

      try {
        await request.jwtVerify();
        const payload = request.user as unknown as { sub: string; email: string; name: string; role: string };
        userId = payload.sub;
        registrantEmail = payload.email;
        registrantName = payload.name;
      } catch {
        // Not authenticated — must provide guest info
        if (!guestEmail || !guestName) {
          return sendError(
            reply,
            401,
            "AUTH_REQUIRED",
            "Authentication required or provide guestEmail and guestName"
          );
        }
        registrantEmail = guestEmail;
        registrantName = guestName;
      }

      // Fetch event
      const event = await prisma.event.findUnique({ where: { id: params.id } });
      if (!event) return sendError(reply, 404, "ERROR", "Event not found");
      if (event.status !== "PUBLISHED") {
        return sendError(reply, 422, "ERROR", "Event is not open for registration");
      }

      // Capacity check
      const confirmedCount = await prisma.registration.count({
        where: { eventId: params.id, status: "CONFIRMED" },
      });
      if (confirmedCount >= event.capacity) {
        return sendError(reply, 422, "ERROR", "Event is fully booked");
      }

      // Duplicate check
      try {
        const existing = userId
          ? await prisma.registration.findUnique({
              where: { eventId_userId: { eventId: params.id, userId } },
            })
          : await prisma.registration.findUnique({
              where: {
                eventId_guestEmail: { eventId: params.id, guestEmail: registrantEmail },
              },
            });

        if (existing) {
          if (existing.status === "CANCELLED") {
            // Re-activate cancelled registration
            const reactivated = await prisma.registration.update({
              where: { id: existing.id },
              data: { status: "CONFIRMED", checkedIn: false, checkedInAt: null },
            });
            return reply.status(200).send(reactivated);
          }
          return sendError(reply, 409, "ERROR", "Already registered for this event");
        }
      } catch {
        // findUnique on composite key may throw if fields are null — treat as no duplicate
      }

      // Create registration
      const registration = await prisma.registration.create({
        data: {
          eventId: params.id,
          userId: userId ?? undefined,
          guestEmail: userId ? undefined : registrantEmail,
          guestName: userId ? undefined : registrantName,
        },
        include: { event: { select: { title: true, startDate: true, location: true } } },
      });

      // Send confirmation mail (fire-and-forget, non-blocking)
      const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
      sendMail(
        registrationConfirmationMail({
          to: registrantEmail,
          name: registrantName,
          eventTitle: registration.event.title,
          eventDate: registration.event.startDate.toISOString(),
          location: registration.event.location,
          ticketToken: registration.ticketToken,
          baseUrl,
        })
      ).catch(() => {}); // never block response on mail

      return reply.status(201).send(registration);
    }
  );

  // ── GET /api/events/:id/attendees ─────────────────
  app.get<{ Params: { id: string } }>(
    "/api/events/:id/attendees",
    { preHandler: [requireAuth, requireRole(Role.ORGANIZER, Role.ADMIN)] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const payload = request.user as { sub: string; role: string };
      const prisma = app.prisma;

      const event = await prisma.event.findUnique({ where: { id: params.id } });
      if (!event) return sendError(reply, 404, "ERROR", "Event not found");

      // Organizer can only see their own events
      if (payload.role === "ORGANIZER" && event.organizerId !== payload.sub) {
        return sendError(reply, 403, "ERROR", "Forbidden");
      }

      const registrations = await prisma.registration.findMany({
        where: { eventId: params.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const attendees = registrations.map((r) => ({
        id: r.id,
        name: r.user?.name ?? r.guestName,
        email: r.user?.email ?? r.guestEmail,
        ticketToken: r.ticketToken,
        status: r.status,
        checkedIn: r.checkedIn,
        checkedInAt: r.checkedInAt,
        registeredAt: r.createdAt,
        isGuest: !r.userId,
      }));

      return reply.send({ total: attendees.length, attendees });
    }
  );

  // ── GET /api/events/:id/attendees/csv ─────────────
  app.get<{ Params: { id: string } }>(
    "/api/events/:id/attendees/csv",
    { preHandler: [requireAuth, requireRole(Role.ORGANIZER, Role.ADMIN)] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const payload = request.user as { sub: string; role: string };
      const prisma = app.prisma;

      const event = await prisma.event.findUnique({ where: { id: params.id } });
      if (!event) return sendError(reply, 404, "ERROR", "Event not found");

      if (payload.role === "ORGANIZER" && event.organizerId !== payload.sub) {
        return sendError(reply, 403, "ERROR", "Forbidden");
      }

      const registrations = await prisma.registration.findMany({
        where: { eventId: params.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      });

      const header = "name,email,ticket_token,status,checked_in,checked_in_at,registered_at";
      const rows = registrations.map((r) => {
        const name = (r.user?.name ?? r.guestName ?? "").replace(/,/g, " ");
        const email = (r.user?.email ?? r.guestEmail ?? "").replace(/,/g, " ");
        return [
          `"${name}"`,
          `"${email}"`,
          r.ticketToken,
          r.status,
          r.checkedIn ? "true" : "false",
          r.checkedInAt?.toISOString() ?? "",
          r.createdAt.toISOString(),
        ].join(",");
      });

      const csv = [header, ...rows].join("\n");

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="event-${params.id}-attendees.csv"`)
        .send(csv);
    }
  );

  // ── POST /api/events/:id/checkin ──────────────────
  app.post<{ Params: { id: string } }>(
    "/api/events/:id/checkin",
    { preHandler: [requireAuth, requireRole(Role.ORGANIZER, Role.ADMIN)] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const payload = request.user as { sub: string; role: string };
      const prisma = app.prisma;

      const parsed = CheckinBody.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "VALIDATION_ERROR", parsed.error.errors[0].message);
      }
      const { ticketToken } = parsed.data;

      const event = await prisma.event.findUnique({ where: { id: params.id } });
      if (!event) return sendError(reply, 404, "ERROR", "Event not found");

      if (payload.role === "ORGANIZER" && event.organizerId !== payload.sub) {
        return sendError(reply, 403, "ERROR", "Forbidden");
      }

      const registration = await prisma.registration.findUnique({
        where: { ticketToken },
      });

      if (!registration) return sendError(reply, 404, "ERROR", "Ticket not found");
      if (registration.eventId !== params.id) {
        return sendError(reply, 422, "ERROR", "Ticket does not belong to this event");
      }
      if (registration.status === "CANCELLED") {
        return sendError(reply, 422, "ERROR", "Registration is cancelled");
      }
      if (registration.checkedIn) {
        return sendError(reply, 409, "ERROR", "Already checked in");
      }

      const updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { checkedIn: true, checkedInAt: new Date() },
      });

      return reply.send({
        message: "Check-in successful",
        registration: {
          id: updated.id,
          checkedIn: updated.checkedIn,
          checkedInAt: updated.checkedInAt,
        },
      });
    }
  );
}
