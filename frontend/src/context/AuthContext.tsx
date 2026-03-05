"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, ApiError, storeTokens, clearTokens } from "@/lib/api";

export type UserRole = "attendee" | "organizer" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "eventhub_auth";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── Mock users (only active when NEXT_PUBLIC_USE_MOCK=true) ──────────────────
const MOCK_USERS: Record<string, AuthUser> = {
  "organizer@eventhub.dev": { id: "mock-org-1", name: "Max Muster", email: "organizer@eventhub.dev", role: "organizer", token: "mock-token-organizer" },
  "admin@eventhub.dev":     { id: "mock-adm-1", name: "Admin User",  email: "admin@eventhub.dev",     role: "admin",     token: "mock-token-admin" },
  "user@eventhub.dev":      { id: "mock-usr-1", name: "Anna Schmidt",email: "user@eventhub.dev",      role: "attendee",  token: "mock-token-user" },
};

interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser;
          // In real mode: verify token still valid via /api/auth/me
          if (!USE_MOCK && parsed.token && parsed.token.startsWith("mock-")) {
            clearTokens();
          } else if (!USE_MOCK) {
            try {
              const me = await api.get<{ id: string; name: string; email: string; role: UserRole }>(
                "/api/auth/me"
              );
              setUser({ ...me, token: parsed.token });
            } catch {
              clearTokens();
            }
          } else {
            setUser(parsed);
          }
        }
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      const mockUser = MOCK_USERS[email];
      if (!mockUser || password.length < 6) throw new Error("Ungültige E-Mail oder Passwort");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      return;
    }

    const data = await api.post<BackendAuthResponse>("/api/auth/login", { email, password });
    const authUser: AuthUser = { ...data.user, token: data.access_token };
    storeTokens(data.access_token, data.refresh_token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 800));
        const newUser: AuthUser = {
          id: `mock-${crypto.randomUUID()}`,
          name, email, role,
          token: `mock-token-${Date.now()}`,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
        return;
      }

      const data = await api.post<BackendAuthResponse>("/api/auth/register", {
        name, email, password, role,
      });
      const authUser: AuthUser = { ...data.user, token: data.access_token };
      storeTokens(data.access_token, data.refresh_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
    },
    []
  );

  const logout = useCallback(async () => {
    if (!USE_MOCK) {
      try { await api.post("/api/auth/logout", {}); } catch {}
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
