"use client";

import { useState, useEffect } from "react";
import { api, ApiTicket, ApiError, requestBlob } from "@/lib/api";
import { getRegistrationByToken } from "@/lib/mockRegistrations";
import { MOCK_EVENTS } from "@/lib/mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useTicket(token: string) {
  const [data, setData] = useState<ApiTicket | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 300));
          const reg = getRegistrationByToken(token);
          if (!reg) {
            if (!cancelled) setData(null);
            return;
          }
          const event = MOCK_EVENTS.find((e) => e.id === reg.eventId);
          if (!event) {
            if (!cancelled) setData(null);
            return;
          }
          if (!cancelled) {
            setData({
              token: reg.ticketToken,
              event: {
                id: event.id,
                slug: event.slug,
                title: event.title,
                start_at: `${event.date}T${event.time}:00.000Z`,
                location: event.location,
              },
              registration: { id: reg.id, name: reg.name, email: reg.email },
              checked_in: reg.checkedIn,
              checked_in_at: reg.checkedInAt,
              qr_code_url: `/api/tickets/${token}/qr`,
            });
          }
        } else {
          const result = await api.get<ApiTicket>(`/api/tickets/${token}`);
          if (!cancelled) setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof ApiError ? err.message : "Ticket konnte nicht geladen werden.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return { data, error };
}

export async function downloadTicketPdf(token: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    alert("PDF-Download: In der Produktionsversion wird ein PDF generiert und heruntergeladen.");
    return;
  }
  const blob = await requestBlob(`/api/tickets/${token}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ticket-${token}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAttendeeCsv(eventId: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    // Handled inline in attendees page
    return;
  }
  const blob = await requestBlob(`/api/events/${eventId}/attendees/csv`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendees-${eventId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
