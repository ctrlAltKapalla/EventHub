"use client";

import { use, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { MOCK_EVENTS, CATEGORIES } from "@/lib/mockData";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditEventPage({ params }: Props) {
  const { id } = use(params);
  const event = MOCK_EVENTS.find((e) => e.id === id);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ?? "",
    time: event?.time ?? "18:00",
    location: event?.location ?? "",
    category: event?.category ?? "Tech",
    capacity: String(event?.capacity ?? 100),
    price: String(event?.price ?? 0),
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast("Event aktualisiert!", "success");
      router.push("/dashboard");
    } catch {
      toast("Fehler beim Speichern.", "error");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = CATEGORIES.filter((c) => c !== "Alle").map((c) => ({ value: c, label: c }));

  if (!event) {
    return (
      <ProtectedRoute requiredRoles={["organizer", "admin"]}>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-neutral-600">Event nicht gefunden.</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 mb-8">Event bearbeiten</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 space-y-6">
          <Input label="Titel" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-900">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-shadow"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Datum" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            <Input label="Uhrzeit" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
          <Input label="Ort / Adresse" value={form.location} onChange={(e) => set("location", e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Kategorie" value={form.category} onChange={(e) => set("category", e.target.value)} options={categoryOptions} />
            <Input label="Kapazität" type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            <Input label="Preis (€)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-neutral-100">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Abbrechen</Button>
            <Button type="submit" loading={loading}>💾 Änderungen speichern</Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
