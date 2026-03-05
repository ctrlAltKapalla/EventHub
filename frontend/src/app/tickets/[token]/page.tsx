"use client";

import { use } from "react";
import Link from "next/link";
import { useTicket, downloadTicketPdf } from "@/lib/hooks/useTicket";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useState } from "react";

interface Props {
  params: Promise<{ token: string }>;
}

function QRCode({ value, imageUrl }: { value: string; imageUrl?: string }) {
  if (imageUrl && !process.env.NEXT_PUBLIC_USE_MOCK) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border-4 border-neutral-900" />;
  }
  // Deterministic placeholder
  return (
    <div className="w-48 h-48 bg-white border-4 border-neutral-900 rounded-xl flex flex-col items-center justify-center p-3 mx-auto">
      <div className="grid grid-cols-7 gap-px w-full h-full">
        {Array.from({ length: 49 }).map((_, i) => {
          const seed = value.charCodeAt(i % value.length) + i;
          const filled = (seed * 2654435761) % 7 < 3;
          return <div key={i} className={`rounded-sm ${filled ? "bg-neutral-900" : "bg-white"}`} />;
        })}
      </div>
      <p className="text-xs font-mono text-neutral-600 mt-2 text-center leading-tight break-all">{value}</p>
    </div>
  );
}

export default function TicketPage({ params }: Props) {
  const { token } = use(params);
  const { data: ticket, error } = useTicket(token);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTicketPdf(token);
    } catch {
      toast("PDF-Download fehlgeschlagen.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // Loading
  if (ticket === undefined && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  // Not found / error
  if (!ticket || error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">❌</p>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Ticket nicht gefunden</h1>
          <p className="text-neutral-600 mb-6">{error ?? "Dieser Ticket-Link ist ungültig oder abgelaufen."}</p>
          <Link href="/"><Button variant="secondary">Zur Startseite</Button></Link>
        </div>
      </div>
    );
  }

  const start = new Date(ticket.event.start_at);
  const formattedDate = start.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formattedTime = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="text-xl font-bold text-primary-600">EventHub</Link>
          <p className="text-sm text-neutral-600 mt-1">Dein Ticket</p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200 shadow-lg overflow-hidden">
          {/* Event image strip */}
          {ticket.event.title && (
            <div className="h-28 bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
              <h2 className="text-white font-bold text-lg px-4 text-center line-clamp-2">{ticket.event.title}</h2>
            </div>
          )}

          {/* Tear line */}
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 -ml-3 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-neutral-200" />
            <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 -mr-3 shrink-0" />
          </div>

          <div className="px-6 py-6 space-y-4">
            {ticket.checked_in && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                <p className="text-sm font-semibold text-green-700">✅ Eingecheckt</p>
                {ticket.checked_in_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {new Date(ticket.checked_in_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </p>
                )}
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-sm text-neutral-600">📅 {formattedDate}</p>
              <p className="text-sm text-neutral-600">⏰ {formattedTime} Uhr</p>
              <p className="text-sm text-neutral-600">📍 {ticket.event.location}</p>
            </div>

            <div className="py-2">
              <QRCode value={token} imageUrl={ticket.qr_code_url} />
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Ticket-Nr.</span>
                <span className="font-mono font-bold text-neutral-900 text-xs">{token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Name</span>
                <span className="font-medium text-neutral-900">{ticket.registration.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">E-Mail</span>
                <span className="font-medium text-neutral-900 text-xs">{ticket.registration.email}</span>
              </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={handleDownload} loading={downloading}>
              📥 PDF herunterladen
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">Dieses Ticket ist personengebunden und nicht übertragbar.</p>
      </div>
    </div>
  );
}
