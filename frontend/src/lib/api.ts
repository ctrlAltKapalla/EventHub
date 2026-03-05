// ─── API Client ──────────────────────────────────────────────────────────────
// Base URL: NEXT_PUBLIC_API_URL env var (default: http://localhost:4000)
// Auth: JWT Bearer token from localStorage, with automatic 401 refresh-token flow.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

const STORAGE_KEY = "eventhub_auth";
const REFRESH_KEY = "eventhub_refresh";

// ─── Error type ──────────────────────────────────────────────────────────────

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

// ─── Token helpers ───────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored)?.token as string | null) : null;
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function storeTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, token: accessToken }));
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {}
}

function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── Refresh flow ─────────────────────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw new ApiError(401, "NO_REFRESH_TOKEN", "Session abgelaufen. Bitte erneut einloggen.");
    }
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      throw new ApiError(401, "REFRESH_FAILED", "Session abgelaufen. Bitte erneut einloggen.");
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    storeTokens(data.access_token, data.refresh_token);
    return data.access_token;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken();
      return request<T>(path, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        },
      }, false);
    } catch {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "SESSION_EXPIRED", "Session abgelaufen.");
    }
  }

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; details?: { field: string; message: string }[] } } = {};
    try { body = await res.json(); } catch {}
    throw new ApiError(
      res.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? `HTTP ${res.status}`,
      body.error?.details
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Blob variant for file downloads (CSV, PDF, QR)
export async function requestBlob(path: string): Promise<Blob> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "DOWNLOAD_ERROR", `Download fehlgeschlagen (${res.status})`);
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ─── API Types (aligned with backend + API_SPEC.md) ──────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "attendee" | "organizer" | "admin";
}

export interface AuthMeResponse extends AuthUser {
  token: string; // access_token echoed for client convenience
}

export interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  location: string;
  address?: string;
  category: string;
  price: number;
  capacity: number;
  registrations_count: number;
  image_url: string | null;
  organizer: { id: string; name: string };
  status: "draft" | "published" | "cancelled" | "ended";
}

export interface ApiEventInput {
  title: string;
  description: string;
  start_at: string;
  end_at?: string;
  location: string;
  address?: string;
  category: string;
  price: number;
  capacity: number;
  image_url?: string;
  status?: "draft" | "published";
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
  event: Pick<ApiEvent, "id" | "slug" | "title" | "start_at" | "location">;
  registration: { id: string; name: string; email: string };
  checked_in: boolean;
  checked_in_at: string | null;
  qr_code_url: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface EventListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  status?: string;
}

// ─── Utility: storeTokens/clearTokens exported for AuthContext ───────────────
export { storeTokens, clearTokens };
