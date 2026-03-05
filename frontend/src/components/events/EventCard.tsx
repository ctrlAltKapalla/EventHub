import Link from "next/link";
import { Event } from "@/lib/mockData";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.capacity - event.registrations;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = !isFull && spotsLeft <= 5;

  const formattedDate = new Date(`${event.date}T${event.time}`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="bg-white rounded-xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col group">
      {/* Image */}
      <div className="aspect-video bg-neutral-200 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isFull && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm px-3 py-1 bg-black/60 rounded-full">Ausgebucht</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category badge */}
        <span className="text-xs font-medium text-primary-600 bg-primary-50 rounded-full px-2 py-0.5 w-fit mb-2">
          {event.category}
        </span>

        {/* Title */}
        <h3 className="text-base font-semibold text-neutral-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>

        {/* Meta */}
        <div className="text-sm text-neutral-600 space-y-1 mb-3">
          <p>📅 {formattedDate}, {event.time} Uhr</p>
          <p>📍 {event.location}</p>
          <p className="font-medium text-neutral-900">
            {event.price === 0 ? "Kostenlos" : `€${event.price}`}
          </p>
        </div>

        {/* Spots warning */}
        {isAlmostFull && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">
            ⚠️ Nur noch {spotsLeft} {spotsLeft === 1 ? "Platz" : "Plätze"} verfügbar!
          </p>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <Link
            href={`/events/${event.slug}`}
            className={[
              "block text-center px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isFull
                ? "bg-neutral-100 text-neutral-400 cursor-not-allowed pointer-events-none"
                : "bg-primary-600 hover:bg-primary-700 text-white",
            ].join(" ")}
            aria-disabled={isFull}
          >
            {isFull ? "Ausgebucht" : "Details ansehen"}
          </Link>
        </div>
      </div>
    </article>
  );
}
