"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "eventhub_auth";

// Mock credentials for development (no backend required)
const MOCK_USERS: Record<string, AuthUser> = {
  "organizer@eventhub.dev": {
    id: "mock-org-1",
    name: "Max Muster",
    email: "organizer@eventhub.dev",
    role: "organizer",
    token: "mock-token-organizer",
  },
  "admin@eventhub.dev": {
    id: "mock-admin-1",
    name: "Admin User",
    email: "admin@eventhub.dev",
    role: "admin",
    token: "mock-token-admin",
  },
  "user@eventhub.dev": {
    id: "mock-user-1",
    name: "Anna Schmidt",
    email: "user@eventhub.dev",
    role: "attendee",
    token: "mock-token-user",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Mock auth — replace with real API call when backend is ready
    await new Promise((r) => setTimeout(r, 600));
    const mockUser = MOCK_USERS[email];
    if (!mockUser || password.length < 6) {
      throw new Error("Ungültige E-Mail oder Passwort");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string, role: UserRole) => {
    await new Promise((r) => setTimeout(r, 800));
    const newUser: AuthUser = {
      id: `mock-${crypto.randomUUID()}`,
      name,
      email,
      role,
      token: `mock-token-${Date.now()}`,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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
