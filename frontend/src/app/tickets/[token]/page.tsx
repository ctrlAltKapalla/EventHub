"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getRegistrationByToken, MockRegistration } from "@/lib/mockRegistrations";
import { MOCK_EVENTS, Event } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";

interface Props {
  params: Promise<{ token: string }>;
}

// Simple QR-code placeholder (in production: use `qrcode` or `react-qr-code` package)
function QRCode({ value }: { value: string }) {
  return (
    <div className="w-48 h-48 bg-white border-4 border-neutral-900 rounded-xl flex flex-col items-center justify-center p-3 mx-auto">
      {/* Simplified QR visual */}
      <div className="grid grid-cols-7 gap-px w-full h-full">
        {Array.from({ length: 49 }).map((_, i) => {
          // Deterministic pattern based on value hash
          const seed = value.charCodeAt(i % value.length) + i;
          const filled = (seed * 2654435761) % 7 < 3;
          return (
            <div
              key={i}
              className={`rounded-sm ${filled ? "bg-neutral-900" : "bg-white"}`}
            />
          );
        })}
      </div>
      <p className="text-xs font-mono text-neutral-600 mt-2 text-center leading-tight break-all">{value}</p>
    </div>
  );
}

export default function TicketPage({ params }: Props) {
  const { token } = use(params);
  const [reg, setReg] = useState<MockRegistration | null | undefined>(undefined);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    // Simulate async lookup
    const found = getRegistrationByToken(token);
    setReg(found ?? null);
    if (found) {
      const ev = MOCK_EVENTS.find((e) => e.id === found.eventId) ?? null;
      setEvent(ev);
    }
  }, [token]);

  const handleDownload = () => {
    // In production: call API to get PDF blob, then trigger download
    alert("PDF-Download: In der Produktionsversion wird ein PDF generiert und heruntergeladen.");
  };

  // Loading
  if (reg === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not found
  if (!reg || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">❌</p>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Ticket nicht gefunden</h1>
          <p className="text-neutral-600 mb-6">Dieser Ticket-Link ist ungültig oder abgelaufen.</p>
          <Link href="/"><Button variant="secondary">Zurück zur Startseite</Button></Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(`${event.date}T${event.time}`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      {/* Ticket Card */}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="text-xl font-bold text-primary-600">EventHub</Link>
          <p className="text-sm text-neutral-600 mt-1">Dein Ticket</p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200 shadow-lg overflow-hidden">
          {/* Event Image strip */}
          <div className="h-28 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          </div>

          {/* Tear line */}
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 -ml-3 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-neutral-200" />
            <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 -mr-3 shrink-0" />
          </div>

          <div className="px-6 py-6 space-y-4">
            {/* Status badge */}
            {reg.checkedIn && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                <p className="text-sm font-semibold text-green-700">✅ Eingecheckt</p>
                {reg.checkedInAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {new Date(reg.checkedInAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </p>
                )}
              </div>
            )}

            {/* Event Info */}
            <div className="text-center space-y-1">
              <h1 className="font-bold text-neutral-900 text-lg leading-tight">{event.title}</h1>
              <p className="text-sm text-neutral-600">📅 {formattedDate}</p>
              <p className="text-sm text-neutral-600">⏰ {event.time} Uhr</p>
              <p className="text-sm text-neutral-600">📍 {event.location}</p>
            </div>

            {/* QR Code */}
            <div className="py-2">
              <QRCode value={token} />
            </div>

            {/* Ticket details */}
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Ticket-Nr.</span>
                <span className="font-mono font-bold text-neutral-900 text-xs">{token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Name</span>
                <span className="font-medium text-neutral-900">{reg.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">E-Mail</span>
                <span className="font-medium text-neutral-900 text-xs">{reg.email}</span>
              </div>
            </div>

            {/* Download */}
            <Button variant="secondary" className="w-full" onClick={handleDownload}>
              📥 PDF herunterladen
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Dieses Ticket ist personengebunden und nicht übertragbar.
        </p>
      </div>
    </div>
  );
}
