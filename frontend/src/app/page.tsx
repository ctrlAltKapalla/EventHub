"use client";

import { useState, useCallback } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { ApiEvent } from "@/lib/api";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import Link from "next/link";
import Button from "@/components/ui/Button";

const CATEGORIES = ["Alle", "Musik", "Tech", "Sport", "Business", "Kunst", "Food"];
const PAGE_SIZE = 6;

function ApiEventCard({ event }: { event: ApiEvent }) {
  const start = new Date(event.start_at);
  const spotsLeft = event.capacity - event.registrations_count;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = !isFull && spotsLeft <= 5;

  return (
    <article className="bg-white rounded-xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col group">
      <div className="aspect-video bg-neutral-200 overflow-hidden relative">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-4xl">🎭</div>
        )}
        {isFull && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm px-3 py-1 bg-black/60 rounded-full">Ausgebucht</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs font-medium text-primary-600 bg-primary-50 rounded-full px-2 py-0.5 w-fit mb-2">{event.category}</span>
        <h3 className="text-base font-semibold text-neutral-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">{event.title}</h3>
        <div className="text-sm text-neutral-600 space-y-1 mb-3">
          <p>📅 {start.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}, {start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
          <p>📍 {event.location}</p>
          <p className="font-medium text-neutral-900">{event.price === 0 ? "Kostenlos" : `€${event.price}`}</p>
        </div>
        {isAlmostFull && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">⚠️ Nur noch {spotsLeft} Plätze!</p>}
        <div className="mt-auto">
          <Link
            href={`/events/${event.slug}`}
            className={`block text-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFull ? "bg-neutral-100 text-neutral-400 pointer-events-none" : "bg-primary-600 hover:bg-primary-700 text-white"
            }`}
            aria-disabled={isFull}
          >
            {isFull ? "Ausgebucht" : "Details ansehen"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [page, setPage] = useState(1);

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  const { data, loading, error } = useEvents({
    search: debouncedSearch,
    category,
    page,
    page_size: PAGE_SIZE,
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Finde Events in deiner Stadt</h1>
          <p className="text-primary-100 mb-8 text-lg">Musik, Tech, Sport, Kunst — was interessiert dich?</p>
          <div className="max-w-lg mx-auto">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600">🔍</span>
              <input
                type="search"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Titel oder Ort suchen…"
                className="w-full pl-9 pr-3 py-3 rounded-lg text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-neutral-600">Kategorie:</span>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat ? "bg-primary-600 border-primary-600 text-white" : "border-neutral-300 text-neutral-600 hover:border-primary-600 hover:text-primary-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="ml-auto hidden sm:block">
            <Select options={[{ value: "date", label: "Datum (aufsteigend)" }, { value: "price_asc", label: "Preis (aufsteigend)" }]} aria-label="Sortierung" />
          </div>
        </div>
      </section>

      {/* Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">⚠️ {error}</p>
            <p className="text-sm text-red-600 mt-1">Bitte versuche es später erneut.</p>
          </div>
        ) : (
          <>
            {!loading && data && (
              <p className="text-sm text-neutral-600 mb-6">{data.total} {data.total === 1 ? "Event" : "Events"} gefunden</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)
                : data?.items.map((event) => <ApiEventCard key={event.id} event={event} />)}
            </div>
            {!loading && data && data.total === 0 && (
              <div className="text-center py-20 text-neutral-600">
                <p className="text-4xl mb-4">🎭</p>
                <p className="text-lg font-medium">Keine Events gefunden</p>
                <p className="text-sm mt-1">Versuche andere Suchbegriffe oder Kategorien.</p>
              </div>
            )}
            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Zurück</Button>
                {Array.from({ length: data.pages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? "bg-primary-600 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>{i + 1}</button>
                ))}
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}>Weiter →</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
