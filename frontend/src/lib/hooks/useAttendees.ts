"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiRegistration, PaginatedResponse, ApiError } from "@/lib/api";
import { mockRegistrationStore } from "@/lib/mockRegistrations";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useAttendees(eventId: string, search = "") {
  const [data, setData] = useState<ApiRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
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
    const { checkInByToken } = await import("@/lib/mockRegistrations");
    const reg = checkInByToken(token);
    if (!reg) throw new Error("Ticket nicht gefunden");
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
