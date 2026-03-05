"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { api, ApiEventInput } from "@/lib/api";

// Static config — not mock data
const CATEGORY_OPTIONS = [
  { value: "Musik", label: "Musik" },
  { value: "Tech", label: "Tech" },
  { value: "Sport", label: "Sport" },
  { value: "Business", label: "Business" },
  { value: "Kunst", label: "Kunst" },
  { value: "Food", label: "Food" },
];

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  capacity: string;
  price: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  capacity?: string;
}

const initialForm: EventForm = {
  title: "",
  description: "",
  date: "",
  time: "18:00",
  location: "",
  category: "Tech",
  capacity: "100",
  price: "0",
};

export default function NewEventPage() {
  const [form, setForm] = useState<EventForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const set = (key: keyof EventForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.title.trim()) e.title = "Titel ist erforderlich";
    if (!form.description.trim()) e.description = "Beschreibung ist erforderlich";
    if (!form.date) e.date = "Datum ist erforderlich";
    if (!form.location.trim()) e.location = "Ort ist erforderlich";
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) < 1)
      e.capacity = "Gültige Kapazität eingeben";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent, publish = false) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: ApiEventInput = {
        title: form.title,
        description: form.description,
        start_at: new Date(`${form.date}T${form.time}`).toISOString(),
        location: form.location,
        category: form.category,
        capacity: Number(form.capacity),
        price: Number(form.price),
        status: publish ? "published" : "draft",
      };
      await api.post("/api/events", payload);
      const action = publish ? "veröffentlicht" : "als Entwurf gespeichert";
      toast(`Event „${form.title}" ${action}!`, "success");
      router.push("/dashboard");
    } catch {
      toast("Fehler beim Speichern.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={["organizer", "admin"]}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 mb-8">Neues Event erstellen</h1>
        <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 space-y-6">
          <Input label="Titel" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} placeholder="Summer Vibes Festival 2026" required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-900">Beschreibung <span className="text-error ml-1">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Beschreibe dein Event…"
              className={`w-full px-3 py-2 rounded-lg border text-neutral-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-shadow ${errors.description ? "border-error" : "border-neutral-300"}`}
            />
            {errors.description && <p className="text-xs text-error">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Datum" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} error={errors.date} required />
            <Input label="Uhrzeit" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
          <Input label="Ort / Adresse" value={form.location} onChange={(e) => set("location", e.target.value)} error={errors.location} placeholder="Tempelhof, Berlin" required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Kategorie" value={form.category} onChange={(e) => set("category", e.target.value)} options={CATEGORY_OPTIONS} />
            <Input label="Kapazität" type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} error={errors.capacity} required />
            <Input label="Preis (€)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} hint="0 = kostenlos" />
          </div>
          <div className="flex gap-3 pt-2 border-t border-neutral-100">
            <Button type="submit" variant="secondary" loading={loading}>💾 Als Entwurf speichern</Button>
            <Button type="button" loading={loading} onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}>🚀 Veröffentlichen</Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
