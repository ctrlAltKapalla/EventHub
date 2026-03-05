"use client";

import { use, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { performCheckin } from "@/lib/hooks/useAttendees";
import { MOCK_EVENTS } from "@/lib/mockData";
import { ApiError } from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}

type ScanResult = "idle" | "success" | "already" | "invalid";

interface ScanState {
  result: ScanResult;
  name?: string;
  token?: string;
  message?: string;
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

export default function CheckInPage({ params }: Props) {
  const { id } = use(params);
  const event = MOCK_EVENTS.find((e) => e.id === id);
  const [manualToken, setManualToken] = useState("");
  const [processing, setProcessing] = useState(false);
  const [scanState, setScanState] = useState<ScanState>({ result: "idle" });

  const processToken = async (token: string) => {
    const trimmed = token.trim().toUpperCase();
    if (!trimmed) return;
    setProcessing(true);
    try {
      const reg = await performCheckin(id, trimmed);
      setScanState({ result: "success", name: reg.name, token: trimmed });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setScanState({ result: "already", token: trimmed, message: err.message });
        } else if (err.status === 404) {
          setScanState({ result: "invalid", token: trimmed });
        } else {
          setScanState({ result: "invalid", token: trimmed, message: err.message });
        }
      } else if (err instanceof Error) {
        setScanState({ result: "invalid", token: trimmed, message: err.message });
      } else {
        setScanState({ result: "invalid", token: trimmed });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processToken(manualToken);
    setManualToken("");
  };

  const resultConfig: Record<Exclude<ScanResult, "idle">, { bg: string; icon: string; title: string }> = {
    success: { bg: "bg-green-50 border-green-300", icon: "✅", title: "Eingecheckt!" },
    already: { bg: "bg-amber-50 border-amber-300", icon: "⚠️", title: "Bereits eingecheckt" },
    invalid: { bg: "bg-red-50 border-red-300", icon: "❌", title: "Ungültiges Ticket" },
  };

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href={`/events/${id}/attendees`} className="text-sm text-neutral-500 hover:text-primary-600">← Teilnehmerliste</Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">Check-in</h1>
          {event && <p className="text-sm text-neutral-600 mt-0.5">{event.title}</p>}
          <SubNav id={id} active="Check-in" />
        </div>

        {/* Camera placeholder */}
        <div className="bg-neutral-900 rounded-2xl aspect-video flex flex-col items-center justify-center mb-6 relative overflow-hidden">
          <div className="text-6xl mb-3">📷</div>
          <p className="text-neutral-400 text-sm">Kamera-Zugriff</p>
          <p className="text-neutral-500 text-xs mt-1">QR-Scanner — In der Produktionsversion via Webcam</p>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/30 rounded-xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-xl" />
            </div>
          </div>
          <div className="absolute bottom-4 flex gap-2">
            <button onClick={() => processToken("TICKET-DEMO-002")} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors">Demo: Gültiges Ticket</button>
            <button onClick={() => processToken("TICKET-DEMO-001")} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors">Demo: Bereits gescannt</button>
          </div>
        </div>

        {/* Scan result */}
        {scanState.result !== "idle" && (() => {
          const cfg = resultConfig[scanState.result];
          const message = scanState.result === "success"
            ? `${scanState.name} wurde erfolgreich eingecheckt.`
            : scanState.result === "already"
            ? (scanState.message ?? `Dieses Ticket wurde bereits gescannt.`)
            : (scanState.message ?? `Token „${scanState.token}" konnte nicht gefunden werden.`);
          return (
            <div className={`rounded-2xl border-2 p-6 mb-6 text-center ${cfg.bg}`}>
              <div className="text-4xl mb-2">{cfg.icon}</div>
              <h2 className="text-lg font-bold text-neutral-900">{cfg.title}</h2>
              <p className="text-sm text-neutral-600 mt-1">{message}</p>
              <button onClick={() => setScanState({ result: "idle" })} className="mt-4 text-sm text-primary-600 hover:underline">Nächstes Ticket</button>
            </div>
          );
        })()}

        {/* Manual input */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Manuelle Eingabe</h2>
          <p className="text-xs text-neutral-500 mb-4">Ticket-Nummer manuell eingeben, falls Kamera nicht verfügbar.</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="TICKET-XXXXXXXX" className="font-mono flex-1" />
            <Button type="submit" loading={processing} disabled={!manualToken.trim()}>✓</Button>
          </form>
          <p className="text-xs text-neutral-400 mt-3">Demo: TICKET-DEMO-001 (eingecheckt), TICKET-DEMO-002 (offen)</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
