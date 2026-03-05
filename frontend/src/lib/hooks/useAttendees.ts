"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiRegistration, PaginatedResponse, ApiError, requestBlob } from "@/lib/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useAttendees(eventId: string, search = "") {
  const [data, setData] = useState<ApiRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!eventId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
        // Lazy import to keep mock data out of production bundle
        const { mockRegistrationStore } = await import("@/lib/mockRegistrations");
        await new Promise((r) => setTimeout(r, 200));
        let regs = mockRegistrationStore.filter((r) => r.eventId === eventId);
        if (search) {
          const q = search.toLowerCase();
          regs = regs.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
        }
        setData(
          regs.map((r) => ({
            id: r.id,
            event_id: r.eventId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            company: r.company,
            ticket_token: r.ticketToken,
            checked_in: r.checkedIn,
            checked_in_at: r.checkedInAt,
            created_at: r.createdAt,
          }))
        );
      } else {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        const result = await api.get<PaginatedResponse<ApiRegistration>>(
          `/api/events/${eventId}/attendees${qs}`
        );
        setData(result.items);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Teilnehmerliste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [eventId, search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export async function performCheckin(eventId: string, token: string): Promise<ApiRegistration> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    const { checkInByToken, getRegistrationByToken } = await import("@/lib/mockRegistrations");
    const existing = getRegistrationByToken(token);
    if (!existing) throw Object.assign(new Error("Ticket nicht gefunden"), { status: 404 });
    if (existing.checkedIn) {
      const err = Object.assign(new Error("Bereits eingecheckt"), { status: 409 });
      throw err;
    }
    const reg = checkInByToken(token)!;
    return {
      id: reg.id,
      event_id: reg.eventId,
      name: reg.name,
      email: reg.email,
      ticket_token: reg.ticketToken,
      checked_in: reg.checkedIn,
      checked_in_at: reg.checkedInAt,
      created_at: reg.createdAt,
    };
  }
  return api.post<ApiRegistration>(`/api/events/${eventId}/checkin`, { ticket_token: token });
}

export async function downloadAttendeeCsvById(eventId: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    const { mockRegistrationStore } = await import("@/lib/mockRegistrations");
    const regs = mockRegistrationStore.filter((r) => r.eventId === eventId);
    const header = "Name,E-Mail,Ticket,Status,Registriert am";
    const rows = regs.map((r) =>
      [r.name, r.email, r.ticketToken, r.checkedIn ? "Eingecheckt" : "Ausstehend", r.createdAt].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
