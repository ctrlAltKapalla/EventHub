"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-primary-600 shrink-0">
          EventHub
        </Link>

        {/* Search (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 text-sm">🔍</span>
            <input
              type="search"
              placeholder="Events suchen…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-neutral-600">{user.name}</span>
              {(user.role === "organizer" || user.role === "admin") && (
                <Link
                  href="/dashboard"
                  className={`hidden sm:inline-flex text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard")
                      ? "bg-primary-50 text-primary-600"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                Veranstalter werden
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
