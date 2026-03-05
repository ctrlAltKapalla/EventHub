"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Events", icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📅", requiresAuth: true },
  { href: "/login", label: "Login", icon: "👤", guestOnly: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = navItems.filter((item) => {
    if (item.requiresAuth && !user) return false;
    if (item.guestOnly && user) return false;
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-area-pb">
      <div className="flex">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-primary-600" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
