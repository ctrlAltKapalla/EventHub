"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { MOCK_EVENTS } from "@/lib/mockData";
import { mockRegistrationStore } from "@/lib/mockRegistrations";
import Button from "@/components/ui/Button";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
      <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-neutral-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    live: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    ended: "bg-neutral-100 text-neutral-500",
  };
  const labels: Record<string, string> = { live: "✅ Live", draft: "📝 Entwurf", ended: "🏁 Beendet" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-neutral-100 text-neutral-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const myEvents = MOCK_EVENTS.filter((e) => e.status === "live");
  const totalTickets = mockRegistrationStore.length;
  const checkedIn = mockRegistrationStore.filter((r) => r.checkedIn).length;
  const revenue = myEvents.reduce((sum, e) => sum + e.price * e.registrations, 0);

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-600 mt-0.5">Willkommen, {user?.name}</p>
          </div>
          <Link href="/events/new">
            <Button>➕ Event erstellen</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Aktive Events" value={myEvents.length} />
          <StatCard label="Tickets gesamt" value={totalTickets} />
          <StatCard label="Einnahmen" value={`€${revenue.toLocaleString("de-DE")}`} />
          <StatCard label="Check-ins" value={checkedIn} sub={`von ${totalTickets} Tickets`} />
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Meine Events</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Event</th>
                  <th className="text-left px-4 py-3">Datum</th>
                  <th className="text-left px-4 py-3">Tickets</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {myEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 line-clamp-1">{event.title}</p>
                          <p className="text-xs text-neutral-500">{event.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-neutral-600 whitespace-nowrap">
                      {new Date(`${event.date}T${event.time}`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.registrations}/{event.capacity}</span>
                        <div className="w-16 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-600"
                            style={{ width: `${(event.registrations / event.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{statusBadge(event.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/events/${event.id}/attendees`} className="text-xs text-primary-600 hover:underline">Teilnehmer</Link>
                        <Link href={`/events/${event.id}/checkin`} className="text-xs text-primary-600 hover:underline">Check-in</Link>
                        <Link href={`/events/${event.id}/edit`} className="text-xs text-neutral-500 hover:underline">Bearbeiten</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
