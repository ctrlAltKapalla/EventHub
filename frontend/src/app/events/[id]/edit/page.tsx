"use client";

import { use, useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useEvent } from "@/lib/hooks/useEvents";
import { api, ApiEventInput } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

const CATEGORY_OPTIONS = [
  { value: "Musik", label: "Musik" },
  { value: "Tech", label: "Tech" },
  { value: "Sport", label: "Sport" },
  { value: "Business", label: "Business" },
  { value: "Kunst", label: "Kunst" },
  { value: "Food", label: "Food" },
];

export default function EditEventPage({ params }: Props) {
  const { id } = use(params);
  const { data: event, loading: eventLoading } = useEvent(id);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "18:00",
    location: "",
    category: "Tech",
    capacity: "100",
    price: "0",
  });

  useEffect(() => {
    if (!event) return;
    const start = new Date(event.start_at);
    setForm({
      title: event.title,
      description: event.description,
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      location: event.location,
      category: event.category,
      capacity: String(event.capacity),
      price: String(event.price),
    });
  }, [event]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setLoading(true);
    try {
      const payload: Partial<ApiEventInput> = {
        title: form.title,
        description: form.description,
        start_at: new Date(`${form.date}T${form.time}`).toISOString(),
        location: form.location,
        category: form.category,
        capacity: Number(form.capacity),
        price: Number(form.price),
      };
      await api.patch(`/api/events/${event.id}`, payload);
      toast("Event aktualisiert!", "success");
      router.push("/dashboard");
    } catch {
      toast("Fehler beim Speichern.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (eventLoading) {
    return (
      <ProtectedRoute requiredRoles={["organizer", "admin"]}>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </ProtectedRoute>
    );
  }

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
            <Select label="Kategorie" value={form.category} onChange={(e) => set("category", e.target.value)} options={CATEGORY_OPTIONS} />
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
