"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiEvent, PaginatedResponse, EventListParams, ApiError } from "@/lib/api";
import { MOCK_EVENTS } from "@/lib/mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Convert mock to API shape
function mockToApi(m: (typeof MOCK_EVENTS)[0]): ApiEvent {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    start_at: `${m.date}T${m.time}:00.000Z`,
    end_at: null,
    location: m.location,
    category: m.category,
    price: m.price,
    capacity: m.capacity,
    registrations_count: m.registrations,
    image_url: m.imageUrl,
    organizer: { id: "mock-org", name: m.organizer },
    status: m.status === "live" ? "published" : m.status === "draft" ? "draft" : "ended",
  };
}

export function useEvents(params: EventListParams = {}) {
  const [data, setData] = useState<PaginatedResponse<ApiEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        let items = MOCK_EVENTS.filter((e) => e.status === "live").map(mockToApi);
        if (params.search) {
          const q = params.search.toLowerCase();
          items = items.filter((e) => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q));
        }
        if (params.category && params.category !== "Alle") {
          items = items.filter((e) => e.category === params.category);
        }
        const page = params.page ?? 1;
        const page_size = params.page_size ?? 6;
        const start = (page - 1) * page_size;
        setData({ items: items.slice(start, start + page_size), total: items.length, page, page_size, pages: Math.ceil(items.length / page_size) });
      } else {
        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        if (params.page_size) query.set("page_size", String(params.page_size));
        if (params.search) query.set("search", params.search);
        if (params.category && params.category !== "Alle") query.set("category", params.category);
        const qs = query.toString();
        setData(await api.get<PaginatedResponse<ApiEvent>>(`/api/events${qs ? `?${qs}` : ""}`));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Events konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.page_size, params.search, params.category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useEvent(slugOrId: string) {
  const [data, setData] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 200));
          const mock = MOCK_EVENTS.find((e) => e.slug === slugOrId || e.id === slugOrId);
          if (!cancelled) setData(mock ? mockToApi(mock) : null);
        } else {
          const result = await api.get<ApiEvent>(`/api/events/${slugOrId}`);
          if (!cancelled) setData(result);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Event konnte nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slugOrId]);

  return { data, loading, error };
}
