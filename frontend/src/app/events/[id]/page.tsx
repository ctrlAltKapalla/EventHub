"use client";

import { use } from "react";
import Link from "next/link";
import { useEvent } from "@/lib/hooks/useEvents";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: event, loading, error } = useEvent(id);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="aspect-video rounded-2xl w-full" />
            <Skeleton className="h-8 w-3/4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">Event nicht gefunden</h1>
        <p className="text-neutral-600 mb-6">{error ?? "Dieses Event existiert nicht."}</p>
        <Link href="/"><Button variant="secondary">Zur Startseite</Button></Link>
      </div>
    );
  }

  const spotsLeft = event.capacity - event.registrations_count;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = !isFull && spotsLeft <= 10;
  const start = new Date(event.start_at);
  const formattedDate = start.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formattedTime = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: event.title, url });
    else await navigator.clipboard.writeText(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-neutral-600 mb-6">
        <Link href="/" className="hover:text-primary-600">Events</Link>
        <span className="mx-2">›</span>
        <span className="text-neutral-900">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-200">
            {event.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-6xl">🎭</div>}
          </div>

          <div>
            <span className="text-sm font-medium text-primary-600 bg-primary-50 rounded-full px-3 py-1">{event.category}</span>
            <h1 className="text-3xl font-bold text-neutral-900 mt-3">{event.title}</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "📅", label: "Datum & Zeit", value: formattedDate, sub: `${formattedTime} Uhr` },
              { icon: "📍", label: "Ort", value: event.location, sub: event.address },
              { icon: "👤", label: "Veranstalter", value: event.organizer.name },
              { icon: "🎟️", label: "Kapazität", value: `${event.registrations_count} / ${event.capacity} Plätze`, sub: isAlmostFull ? `⚠️ Nur noch ${spotsLeft} frei!` : undefined },
            ].map(({ icon, label, value, sub }) => (
              <div key={label} className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-neutral-900 mt-0.5">{value}</p>
                  {sub && <p className={`text-xs mt-0.5 ${isAlmostFull && label === "Kapazität" ? "text-amber-700" : "text-neutral-600"}`}>{sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Über dieses Event</h2>
            <p className="text-neutral-600 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          <div className="bg-neutral-100 rounded-2xl h-48 flex items-center justify-center text-neutral-400 text-sm border border-neutral-200">
            🗺️ Kartenansicht — {event.location}
          </div>
        </div>

        <div>
          <div className="sticky top-20 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Eintritt</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">{event.price === 0 ? "Kostenlos" : `€${event.price}`}</p>
            </div>
            {isFull ? (
              <div className="bg-neutral-100 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-neutral-600">😔 Leider ausgebucht</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-600">✅ <strong>{spotsLeft}</strong> Plätze verfügbar</p>
                <Link href={`/events/${event.id}/register`} className="block">
                  <Button className="w-full" size="lg">Jetzt registrieren</Button>
                </Link>
              </>
            )}
            <div className="border-t border-neutral-100 pt-4">
              <button onClick={handleShare} className="w-full text-sm text-neutral-600 hover:text-primary-600 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-primary-50 transition-colors">
                🔗 Event teilen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
