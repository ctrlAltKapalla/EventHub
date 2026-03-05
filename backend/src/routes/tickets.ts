import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { sendError } from "../lib/errors.js";

// ── Routes ───────────────────────────────────────────

export async function ticketRoutes(app: FastifyInstance) {
  // ── GET /api/tickets/:token ────────────────────────
  // Public — returns ticket JSON
  app.get<{ Params: { token: string } }>(
    "/api/tickets/:token",
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const prisma = app.prisma;

      const registration = await prisma.registration.findUnique({
        where: { ticketToken: token },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              type: true,
              startDate: true,
              endDate: true,
              location: true,
              slug: true,
            },
          },
          user: { select: { name: true, email: true } },
        },
      });

      if (!registration) return sendError(reply, 404, "ERROR", "Ticket not found");

      return reply.send({
        ticketToken: registration.ticketToken,
        status: registration.status,
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
        registeredAt: registration.createdAt,
        attendee: {
          name: registration.user?.name ?? registration.guestName,
          email: registration.user?.email ?? registration.guestEmail,
          isGuest: !registration.userId,
        },
        event: registration.event,
      });
    }
  );

  // ── GET /api/tickets/:token/qr ─────────────────────
  // Public — returns QR code as PNG image
  app.get<{ Params: { token: string } }>(
    "/api/tickets/:token/qr",
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const prisma = app.prisma;

      const registration = await prisma.registration.findUnique({
        where: { ticketToken: token },
        select: { ticketToken: true, status: true },
      });

      if (!registration) return sendError(reply, 404, "ERROR", "Ticket not found");

      const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
      const ticketUrl = `${baseUrl}/api/tickets/${token}`;

      const pngBuffer = await QRCode.toBuffer(ticketUrl, {
        type: "png",
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      return reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "public, max-age=3600")
        .send(pngBuffer);
    }
  );

  // ── GET /api/tickets/:token/pdf ────────────────────
  // Public — returns ticket as PDF download
  app.get<{ Params: { token: string } }>(
    "/api/tickets/:token/pdf",
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const prisma = app.prisma;

      const registration = await prisma.registration.findUnique({
        where: { ticketToken: token },
        include: {
          event: {
            select: {
              title: true,
              type: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
          user: { select: { name: true, email: true } },
        },
      });

      if (!registration) return sendError(reply, 404, "ERROR", "Ticket not found");

      const attendeeName =
        registration.user?.name ?? registration.guestName ?? "Guest";
      const attendeeEmail =
        registration.user?.email ?? registration.guestEmail ?? "";
      const event = registration.event;

      // Generate QR code as data URL for embedding in PDF
      const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
      const ticketUrl = `${baseUrl}/api/tickets/${token}`;
      const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1]!, "base64");

      // Build PDF
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));

      await new Promise<void>((resolve) => {
        doc.on("end", resolve);

        // Header
        doc
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("🎟 EventHub Ticket", { align: "center" });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Event info
        doc.fontSize(18).font("Helvetica-Bold").text(event.title);
        doc.fontSize(11).font("Helvetica");
        doc.moveDown(0.3);
        doc.text(`📅  ${formatDate(event.startDate)} – ${formatDate(event.endDate)}`);
        doc.text(`📍  ${event.location}`);
        doc.text(`🏷  ${event.type}`);
        doc.moveDown(1);

        // Attendee info
        doc.fontSize(14).font("Helvetica-Bold").text("Teilnehmer");
        doc.fontSize(11).font("Helvetica");
        doc.moveDown(0.3);
        doc.text(`Name:   ${attendeeName}`);
        if (attendeeEmail) doc.text(`E-Mail: ${attendeeEmail}`);
        doc.moveDown(1);

        // Status badge
        const statusColor =
          registration.checkedIn ? "#22c55e" : "#3b82f6";
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor(statusColor)
          .text(registration.checkedIn ? "✓ Eingecheckt" : "● Nicht eingecheckt");
        doc.fillColor("black");
        doc.moveDown(1);

        // QR code
        doc.image(qrBuffer, { fit: [160, 160], align: "center" });
        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#666")
          .text(`Token: ${token}`, { align: "center" });

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `attachment; filename="ticket-${token.slice(0, 8)}.pdf"`
        )
        .send(pdfBuffer);
    }
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}
