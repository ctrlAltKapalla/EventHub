"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useEvents } from "@/lib/hooks/useEvents";
import { Skeleton } from "@/components/ui/Skeleton";
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
  const styles: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    ended: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    published: "✅ Live",
    draft: "📝 Entwurf",
    ended: "🏁 Beendet",
    cancelled: "❌ Abgesagt",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-neutral-100 text-neutral-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  // Load all events visible to this organizer (published + draft)
  const { data, loading } = useEvents({ page_size: 50 });

  const events = data?.items ?? [];
  const totalRegistrations = events.reduce((s, e) => s + e.registrations_count, 0);
  const revenue = events.reduce((s, e) => s + e.price * e.registrations_count, 0);
  const liveCount = events.filter((e) => e.status === "published").length;

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-600 mt-0.5">Willkommen, {user?.name}</p>
          </div>
          <Link href="/events/new"><Button>➕ Event erstellen</Button></Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Aktive Events" value={liveCount} />
              <StatCard label="Tickets gesamt" value={totalRegistrations} />
              <StatCard label="Einnahmen" value={`€${revenue.toLocaleString("de-DE")}`} />
              <StatCard label="Events gesamt" value={events.length} />
            </>
          )}
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
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
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                ) : events.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-neutral-400">Noch keine Events — erstelle dein erstes!</td></tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                            {event.image_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-lg">🎭</div>}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 line-clamp-1">{event.title}</p>
                            <p className="text-xs text-neutral-500">{event.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-neutral-600 whitespace-nowrap">
                        {new Date(event.start_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.registrations_count}/{event.capacity}</span>
                          <div className="w-16 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                            <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, (event.registrations_count / event.capacity) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{statusBadge(event.status)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <Link href={`/events/${event.slug}/attendees`} className="text-primary-600 hover:underline">Teilnehmer</Link>
                          <Link href={`/events/${event.slug}/checkin`} className="text-primary-600 hover:underline">Check-in</Link>
                          <Link href={`/events/${event.slug}/edit`} className="text-neutral-500 hover:underline">Bearbeiten</Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
