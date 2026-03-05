const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.eventhub.example.com/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("eventhub_auth");
      if (stored) token = JSON.parse(stored)?.token ?? null;
    } catch {}
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let errorBody: { error?: { code?: string; message?: string; details?: { field: string; message: string }[] } } = {};
    try { errorBody = await res.json(); } catch {}
    throw new ApiError(
      res.status,
      errorBody.error?.code ?? "UNKNOWN_ERROR",
      errorBody.error?.message ?? `HTTP ${res.status}`,
      errorBody.error?.details
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ─── Type definitions (aligned with API_SPEC.md) ────────────────────────────

export interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  location: string;
  address: string;
  category: string;
  price: number;
  capacity: number;
  registrations_count: number;
  image_url: string | null;
  organizer: { id: string; name: string };
  status: "draft" | "published" | "cancelled" | "ended";
}

export interface ApiRegistration {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  ticket_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface ApiTicket {
  token: string;
  event: Pick<ApiEvent, "id" | "slug" | "title" | "start_at" | "location" | "address">;
  registration: { id: string; name: string; email: string };
  checked_in: boolean;
  qr_code_url: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
