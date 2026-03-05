"use client";

import { useState, useMemo } from "react";
import EventCard from "@/components/events/EventCard";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import { MOCK_EVENTS, CATEGORIES } from "@/lib/mockData";

const ITEMS_PER_PAGE = 6;

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [page, setPage] = useState(1);
  const [loading] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_EVENTS.filter((e) => {
      const matchesSearch =
        search === "" ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "Alle" || e.category === category;
      return matchesSearch && matchesCategory && e.status === "live";
    });
  }, [search, category]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategory = (val: string) => {
    setCategory(val);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Finde Events in deiner Stadt</h1>
          <p className="text-primary-100 mb-8 text-lg">Musik, Tech, Sport, Kunst — was interessiert dich?</p>
          <div className="flex gap-2 max-w-lg mx-auto">
            <div className="relative flex-1">
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
                onClick={() => handleCategory(cat)}
                className={[
                  "text-sm px-3 py-1.5 rounded-full border transition-colors",
                  category === cat
                    ? "bg-primary-600 border-primary-600 text-white"
                    : "border-neutral-300 text-neutral-600 hover:border-primary-600 hover:text-primary-600",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="ml-auto hidden sm:block">
            <Select
              options={[
                { value: "date", label: "Datum (aufsteigend)" },
                { value: "price_asc", label: "Preis (aufsteigend)" },
                { value: "price_desc", label: "Preis (absteigend)" },
              ]}
              aria-label="Sortierung"
            />
          </div>
        </div>
      </section>

      {/* Event Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {filtered.length === 0 && !loading ? (
          <div className="text-center py-20 text-neutral-600">
            <p className="text-4xl mb-4">🎭</p>
            <p className="text-lg font-medium">Keine Events gefunden</p>
            <p className="text-sm mt-1">Versuche andere Suchbegriffe oder Kategorien.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-600 mb-6">
              {filtered.length} {filtered.length === 1 ? "Event" : "Events"} gefunden
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)
                : paginated.map((event) => <EventCard key={event.id} event={event} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Zurück
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={[
                      "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                      page === i + 1
                        ? "bg-primary-600 text-white"
                        : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Weiter →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
