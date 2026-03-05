"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_EVENTS } from "@/lib/mockData";
import Button from "@/components/ui/Button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function EventDetailPage({ params }: Props) {
  const { slug } = use(params);
  const event = MOCK_EVENTS.find((e) => e.slug === slug);
  if (!event) notFound();

  const spotsLeft = event.capacity - event.registrations;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = !isFull && spotsLeft <= 10;

  const formattedDate = new Date(`${event.date}T${event.time}`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-600 mb-6">
        <Link href="/" className="hover:text-primary-600 transition-colors">Events</Link>
        <span className="mx-2">›</span>
        <span className="text-neutral-900">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Image + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          </div>

          {/* Category + Title */}
          <div>
            <span className="text-sm font-medium text-primary-600 bg-primary-50 rounded-full px-3 py-1">
              {event.category}
            </span>
            <h1 className="text-3xl font-bold text-neutral-900 mt-3">{event.title}</h1>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Datum & Zeit</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">{formattedDate}</p>
                <p className="text-sm text-neutral-600">{event.time} Uhr</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Ort</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">{event.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4">
              <span className="text-2xl">👤</span>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Veranstalter</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">{event.organizer}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4">
              <span className="text-2xl">🎟️</span>
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Kapazität</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">
                  {event.registrations} / {event.capacity} Plätze belegt
                </p>
                {isAlmostFull && (
                  <p className="text-xs text-amber-700 mt-0.5">⚠️ Nur noch {spotsLeft} Plätze frei!</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Über dieses Event</h2>
            <p className="text-neutral-600 leading-relaxed">{event.description}</p>
          </div>

          {/* Map placeholder */}
          <div className="bg-neutral-100 rounded-2xl h-48 flex items-center justify-center text-neutral-400 text-sm border border-neutral-200">
            🗺️ Kartenansicht — {event.location}
          </div>
        </div>

        {/* Right: Ticket Box */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Eintritt</p>
              <p className="text-3xl font-bold text-neutral-900 mt-1">
                {event.price === 0 ? "Kostenlos" : `€${event.price}`}
              </p>
            </div>

            {isFull ? (
              <div className="bg-neutral-100 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-neutral-600">😔 Leider ausgebucht</p>
                <p className="text-xs text-neutral-500 mt-1">Alle Plätze sind vergeben</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-neutral-600">
                  <p>✅ <strong>{spotsLeft}</strong> Plätze verfügbar</p>
                </div>
                <Link href={`/events/${event.slug}/register`} className="block">
                  <Button className="w-full" size="lg">Jetzt registrieren</Button>
                </Link>
              </>
            )}

            <div className="border-t border-neutral-100 pt-4">
              <button
                onClick={handleShare}
                className="w-full text-sm text-neutral-600 hover:text-primary-600 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                🔗 Event teilen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
