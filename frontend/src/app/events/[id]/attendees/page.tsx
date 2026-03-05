"use client";

import { use, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import { useAttendees } from "@/lib/hooks/useAttendees";
import { downloadAttendeeCsv } from "@/lib/hooks/useTicket";
import { mockRegistrationStore } from "@/lib/mockRegistrations";
import { MOCK_EVENTS } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface Props {
  params: Promise<{ id: string }>;
}

function SubNav({ id, active }: { id: string; active: string }) {
  return (
    <div className="flex gap-1 mt-4 border-b border-neutral-200">
      {[
        { label: "Teilnehmer", href: `/events/${id}/attendees` },
        { label: "Check-in", href: `/events/${id}/checkin` },
        { label: "Bearbeiten", href: `/events/${id}/edit` },
      ].map((tab) => (
        <Link key={tab.label} href={tab.href} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab.label === active ? "border-primary-600 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function AttendeesPage({ params }: Props) {
  const { id } = use(params);
  const event = MOCK_EVENTS.find((e) => e.id === id);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const { data: attendees, loading, error } = useAttendees(id, search);

  const handleCsvExport = async () => {
    setExporting(true);
    try {
      if (USE_MOCK) {
        const regs = mockRegistrationStore.filter((r) => r.eventId === id);
        const header = "Name,E-Mail,Ticket,Status,Registriert am";
        const rows = regs.map((r) => [r.name, r.email, r.ticketToken, r.checkedIn ? "Eingecheckt" : "Ausstehend", r.createdAt].join(","));
        const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `teilnehmer-${id}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast("CSV exportiert.", "success");
      } else {
        await downloadAttendeeCsv(id);
        toast("CSV exportiert.", "success");
      }
    } catch {
      toast("Export fehlgeschlagen.", "error");
    } finally {
      setExporting(false);
    }
  };

  const checkedInCount = attendees.filter((r) => r.checked_in).length;

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-primary-600">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">{event?.title ?? "Event"}</h1>
          <SubNav id={id} active="Teilnehmer" />
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">🔍</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder E-Mail suchen…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
          </div>
          <Button variant="secondary" onClick={handleCsvExport} loading={exporting}>📥 CSV Export</Button>
          <Link href={`/events/${id}/checkin`}><Button>📷 Check-in starten</Button></Link>
        </div>

        {!loading && (
          <div className="flex gap-4 mb-6 flex-wrap text-sm">
            <span className="bg-neutral-100 rounded-full px-3 py-1 text-neutral-700">Gesamt: <strong>{attendees.length}</strong></span>
            <span className="bg-green-100 rounded-full px-3 py-1 text-green-700">Eingecheckt: <strong>{checkedInCount}</strong></span>
            <span className="bg-amber-100 rounded-full px-3 py-1 text-amber-700">Ausstehend: <strong>{attendees.length - checkedInCount}</strong></span>
          </div>
        )}

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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                ) : error ? (
                  <tr><td colSpan={5} className="text-center py-12 text-red-500">{error}</td></tr>
                ) : attendees.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-neutral-400">Keine Teilnehmer gefunden</td></tr>
                ) : (
                  attendees.map((reg) => (
                    <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900">{reg.name}</td>
                      <td className="px-4 py-4 text-neutral-600">{reg.email}</td>
                      <td className="px-4 py-4">
                        <Link href={`/tickets/${reg.ticket_token}`} className="font-mono text-xs text-primary-600 hover:underline">{reg.ticket_token}</Link>
                      </td>
                      <td className="px-4 py-4">
                        {reg.checked_in
                          ? <span className="text-xs font-medium bg-green-100 text-green-700 rounded-full px-2 py-0.5">✅ Eingecheckt</span>
                          : <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">⏳ Ausstehend</span>}
                      </td>
                      <td className="px-4 py-4 text-neutral-500">{new Date(reg.created_at).toLocaleDateString("de-DE")}</td>
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
