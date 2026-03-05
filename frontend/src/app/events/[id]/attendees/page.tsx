"use client";

import { use, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import { mockRegistrationStore, MockRegistration } from "@/lib/mockRegistrations";
import { MOCK_EVENTS } from "@/lib/mockData";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AttendeesPage({ params }: Props) {
  const { id } = use(params);
  const event = MOCK_EVENTS.find((e) => e.id === id);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const registrations = mockRegistrationStore.filter((r) => r.eventId === id);
  const filtered = registrations.filter(
    (r) =>
      search === "" ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCsvExport = () => {
    const header = "Name,E-Mail,Ticket,Status,Registriert am";
    const rows = filtered.map((r) =>
      [r.name, r.email, r.ticketToken, r.checkedIn ? "Eingecheckt" : "Ausstehend", r.createdAt].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teilnehmer-${event?.slug ?? id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-primary-600 transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">{event?.title ?? "Event"}</h1>

          {/* Sub nav */}
          <div className="flex gap-1 mt-4 border-b border-neutral-200">
            {[
              { label: "Teilnehmer", href: `/events/${id}/attendees`, active: true },
              { label: "Check-in", href: `/events/${id}/checkin`, active: false },
              { label: "Bearbeiten", href: `/events/${id}/edit`, active: false },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab.active ? "border-primary-600 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder E-Mail suchen…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
          <Button variant="secondary" onClick={handleCsvExport}>
            {copied ? "✅ Exportiert" : "📥 CSV Export"}
          </Button>
          <Link href={`/events/${id}/checkin`}>
            <Button>📷 Check-in starten</Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mb-6 flex-wrap text-sm">
          <span className="bg-neutral-100 rounded-full px-3 py-1 text-neutral-700">
            Gesamt: <strong>{registrations.length}</strong>
          </span>
          <span className="bg-green-100 rounded-full px-3 py-1 text-green-700">
            Eingecheckt: <strong>{registrations.filter((r) => r.checkedIn).length}</strong>
          </span>
          <span className="bg-amber-100 rounded-full px-3 py-1 text-amber-700">
            Ausstehend: <strong>{registrations.filter((r) => !r.checkedIn).length}</strong>
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-4 py-3">E-Mail</th>
                  <th className="text-left px-4 py-3">Ticket-Nr.</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Registriert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-neutral-400">Keine Teilnehmer gefunden</td>
                  </tr>
                ) : (
                  filtered.map((reg: MockRegistration) => (
                    <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900">{reg.name}</td>
                      <td className="px-4 py-4 text-neutral-600">{reg.email}</td>
                      <td className="px-4 py-4">
                        <Link href={`/tickets/${reg.ticketToken}`} className="font-mono text-xs text-primary-600 hover:underline">
                          {reg.ticketToken}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        {reg.checkedIn ? (
                          <span className="text-xs font-medium bg-green-100 text-green-700 rounded-full px-2 py-0.5">✅ Eingecheckt</span>
                        ) : (
                          <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">⏳ Ausstehend</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-neutral-500">
                        {new Date(reg.createdAt).toLocaleDateString("de-DE")}
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
