import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { EventStatus, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";
import { slugify, uniqueSlug } from "../lib/slug.js";

// ── Schemas ──────────────────────────────────────────

const CreateEventBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  type: z.enum(["CONFERENCE", "WORKSHOP", "PARTY"]),
  startDate: z.string().datetime({ message: "Invalid ISO 8601 date" }),
  endDate: z.string().datetime({ message: "Invalid ISO 8601 date" }),
  location: z.string().min(3).max(500),
  capacity: z.number().int().positive(),
});

const UpdateEventBody = CreateEventBody.partial();

const StatusTransitionBody = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
});

const ListEventsQuery = z.object({
  q: z.string().optional(),
  type: z.enum(["CONFERENCE", "WORKSHOP", "PARTY"]).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Allowed status transitions ────────────────────────

const ORGANIZER_TRANSITIONS: Record<string, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
  LOCKED: [],
};

const ADMIN_TRANSITIONS: Record<string, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED", "LOCKED"],
  PUBLISHED: ["CANCELLED", "COMPLETED", "LOCKED"],
  CANCELLED: ["LOCKED"],
  COMPLETED: ["LOCKED"],
  LOCKED: ["CANCELLED"],
};

function canTransition(
  current: EventStatus,
  next: EventStatus,
  role: Role
): boolean {
  const allowed =
    role === Role.ADMIN ? ADMIN_TRANSITIONS[current] : ORGANIZER_TRANSITIONS[current];
  return allowed?.includes(next) ?? false;
}

// ── Slug generation ───────────────────────────────────

async function buildUniqueSlug(
  fastify: FastifyInstance,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const slug = uniqueSlug(base, i);
    const existing = await fastify.prisma.event.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
  }
  return `${base}-${Date.now()}`;
}

// ── Shared select ─────────────────────────────────────

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  type: true,
  status: true,
  startDate: true,
  endDate: true,
  location: true,
  capacity: true,
  organizerId: true,
  organizer: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { registrations: true } },
};

// ── Handlers ─────────────────────────────────────────

async function createEventHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = CreateEventBody.safeParse(request.body);
  if (!result.success) {
    return Errors.badRequest(
      reply,
      result.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
    );
  }

  const data = result.data;
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    return Errors.badRequest(reply, [
      { field: "endDate", message: "endDate must be after startDate" },
    ]);
  }

  const slug = await buildUniqueSlug(this, data.title);
  const event = await this.prisma.event.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      slug,
      organizerId: request.user.sub,
    },
    select: EVENT_SELECT,
  });

  return reply.code(201).send(event);
}

async function listEventsHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = ListEventsQuery.safeParse(request.query);
  if (!result.success) {
    return Errors.badRequest(
      reply,
      result.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
    );
  }

  const { q, type, status, page, page_size } = result.data;
  const userRole = request.user?.role as Role | undefined;

  // Public endpoint: default to PUBLISHED only; authenticated users can see own events
  const statusFilter: EventStatus[] = status
    ? [status.toUpperCase() as EventStatus]
    : [EventStatus.PUBLISHED];

  const where: object = {
    ...(statusFilter.length && { status: { in: statusFilter } }),
    ...(type && { type }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    this.prisma.event.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: { startDate: "asc" },
      skip: (page - 1) * page_size,
      take: page_size,
    }),
    this.prisma.event.count({ where }),
  ]);

  return reply.send({
    items,
    total,
    page,
    page_size,
    pages: Math.ceil(total / page_size),
  });
}

async function getEventHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const event = await this.prisma.event.findUnique({
    where: { id },
    select: EVENT_SELECT,
  });
  if (!event) return Errors.notFound(reply, "Event");

  // Non-admin users can't see locked events
  const role = request.user?.role as Role | undefined;
  if (event.status === EventStatus.LOCKED && role !== Role.ADMIN) {
    return Errors.notFound(reply, "Event");
  }

  return reply.send(event);
}

async function updateEventHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const result = UpdateEventBody.safeParse(request.body);
  if (!result.success) {
    return Errors.badRequest(
      reply,
      result.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
    );
  }

  const event = await this.prisma.event.findUnique({ where: { id } });
  if (!event) return Errors.notFound(reply, "Event");

  const { sub: userId, role } = request.user;
  if (role !== Role.ADMIN && event.organizerId !== userId) {
    return Errors.forbidden(reply);
  }

  const data = result.data;
  if (data.startDate && data.endDate) {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      return Errors.badRequest(reply, [
        { field: "endDate", message: "endDate must be after startDate" },
      ]);
    }
  }

  // Re-slug only if title changed
  let slug = event.slug;
  if (data.title && data.title !== event.title) {
    slug = await buildUniqueSlug(this, data.title, event.id);
  }

  const updated = await this.prisma.event.update({
    where: { id: event.id },
    data: {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
      slug,
    },
    select: EVENT_SELECT,
  });

  return reply.send(updated);
}

async function deleteEventHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const event = await this.prisma.event.findUnique({ where: { id } });
  if (!event) return Errors.notFound(reply, "Event");

  const { sub: userId, role } = request.user;
  if (role !== Role.ADMIN && event.organizerId !== userId) {
    return Errors.forbidden(reply);
  }
  if (role !== Role.ADMIN && event.status !== EventStatus.DRAFT) {
    return Errors.unprocessable(
      reply,
      "INVALID_STATUS_TRANSITION",
      "Only DRAFT events can be deleted by organizers"
    );
  }

  await this.prisma.event.delete({ where: { id: event.id } });
  return reply.code(204).send();
}

async function updateStatusHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const result = StatusTransitionBody.safeParse(request.body);
  if (!result.success) {
    return Errors.badRequest(
      reply,
      result.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
    );
  }

  const event = await this.prisma.event.findUnique({ where: { id } });
  if (!event) return Errors.notFound(reply, "Event");

  const { sub: userId, role } = request.user;
  if (role !== Role.ADMIN && event.organizerId !== userId) {
    return Errors.forbidden(reply);
  }

  const nextStatus = result.data.status as EventStatus;
  if (!canTransition(event.status, nextStatus, role as Role)) {
    return Errors.unprocessable(
      reply,
      "INVALID_STATUS_TRANSITION",
      `Cannot transition from ${event.status} to ${nextStatus}`
    );
  }

  const updated = await this.prisma.event.update({
    where: { id: event.id },
    data: { status: nextStatus },
    select: EVENT_SELECT,
  });

  return reply.send(updated);
}

// ── Plugin registration ───────────────────────────────

export default async function eventsRoutes(fastify: FastifyInstance) {
  // Public: list + get (auth optional — used for role check)
  fastify.get("/", { preHandler: [] }, listEventsHandler.bind(fastify));
  fastify.get("/:id", { preHandler: [] }, getEventHandler.bind(fastify));

  // Protected: create
  fastify.post(
    "/",
    { preHandler: [requireRole(Role.ORGANIZER, Role.ADMIN)] },
    createEventHandler.bind(fastify)
  );

  // Protected: update + delete + status
  fastify.patch(
    "/:id",
    { preHandler: [requireAuth] },
    updateEventHandler.bind(fastify)
  );
  fastify.delete(
    "/:id",
    { preHandler: [requireAuth] },
    deleteEventHandler.bind(fastify)
  );
  fastify.patch(
    "/:id/status",
    { preHandler: [requireAuth] },
    updateStatusHandler.bind(fastify)
  );
}
