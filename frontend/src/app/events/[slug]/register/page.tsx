"use client";

import { use, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvent } from "@/lib/hooks/useEvents";
import { api, ApiError } from "@/lib/api";
import { addMockRegistration } from "@/lib/mockRegistrations";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface Props {
  params: Promise<{ slug: string }>;
}

type Step = "form" | "confirm" | "success";

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  agb: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  agb?: string;
}

export default function RegisterEventPage({ params }: Props) {
  const { slug } = use(params);
  const { data: event, loading: eventLoading } = useEvent(slug);
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [ticketToken, setTicketToken] = useState("");
  const [form, setForm] = useState<FormData>({ name: "", email: "", phone: "", company: "", agb: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();
  const router = useRouter();

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Name ist erforderlich";
    if (!form.email) e.email = "E-Mail ist erforderlich";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Ungültige E-Mail-Adresse";
    if (!form.agb) e.agb = "Bitte AGB akzeptieren";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === "form") {
      if (validate()) setStep("confirm");
      return;
    }
    setSubmitting(true);
    try {
      let token: string;
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 800));
        const reg = addMockRegistration(event!.id, {
          name: form.name, email: form.email,
          phone: form.phone || undefined,
          company: form.company || undefined,
        });
        token = reg.ticketToken;
      } else {
        const result = await api.post<{ ticket_token: string }>(`/api/events/${event!.id}/register`, {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company || undefined,
        });
        token = result.ticket_token;
      }
      setTicketToken(token);
      setStep("success");
      toast("Registrierung erfolgreich!", "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast("Du bist bereits für dieses Event angemeldet.", "warning");
      } else {
        toast(err instanceof ApiError ? err.message : "Registrierung fehlgeschlagen.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"><Skeleton className="h-96 rounded-2xl w-full" /></div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-600 mb-4">Event nicht gefunden.</p>
        <Link href="/"><Button variant="secondary">Zur Startseite</Button></Link>
      </div>
    );
  }

  const start = new Date(event.start_at);
  const formattedDate = start.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Anmeldung bestätigt!</h1>
        <p className="text-neutral-600 mb-8">
          Du wirst zu <strong>{event.title}</strong> am {formattedDate} zugelassen. Dein Ticket-Link wurde an {form.email} gesendet.
        </p>
        <div className="flex flex-col gap-3">
          <Link href={`/tickets/${ticketToken}`}><Button className="w-full">🎟️ Ticket anzeigen</Button></Link>
          <Link href="/"><Button variant="ghost" className="w-full">Weitere Events entdecken</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-neutral-600 mb-6">
        <Link href="/" className="hover:text-primary-600">Events</Link>
        <span className="mx-2">›</span>
        <Link href={`/events/${slug}`} className="hover:text-primary-600">{event.title}</Link>
        <span className="mx-2">›</span>
        <span className="text-neutral-900">Registrierung</span>
      </nav>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 max-w-lg">
        {(["form", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? "bg-primary-600 text-white" : i < ["form","confirm"].indexOf(step) ? "bg-green-500 text-white" : "bg-neutral-200 text-neutral-500"}`}>
              {i < ["form","confirm"].indexOf(step) ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${step === s ? "text-neutral-900 font-medium" : "text-neutral-500"}`}>{s === "form" ? "Angaben" : "Bestätigung"}</span>
            {i < 1 && <span className="text-neutral-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 space-y-5">
            <h1 className="text-xl font-bold text-neutral-900">{step === "form" ? "Deine Angaben" : "Angaben bestätigen"}</h1>
            {step === "form" ? (
              <>
                <Input label="Vollständiger Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Max Muster" required />
                <Input label="E-Mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} error={errors.email} placeholder="max@example.com" required />
                <Input label="Telefon (optional)" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+49 123 456789" />
                <Input label="Firma (optional)" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Muster GmbH" />
                <Checkbox label="Ich akzeptiere die AGB und Datenschutzbestimmungen" checked={form.agb} onChange={(e) => setForm((f) => ({ ...f, agb: e.target.checked }))} error={errors.agb} required />
              </>
            ) : (
              <div className="space-y-3 text-sm">
                {[["Name", form.name], ["E-Mail", form.email], ...(form.phone ? [["Telefon", form.phone]] : []), ...(form.company ? [["Firma", form.company]] : [])].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-neutral-100">
                    <span className="text-neutral-600">{label}</span>
                    <span className="font-medium text-neutral-900">{value}</span>
                  </div>
                ))}
                <p className="text-xs text-neutral-500 pt-2">Bitte prüfe deine Angaben vor der Bestätigung.</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {step === "confirm" && <Button type="button" variant="secondary" onClick={() => setStep("form")}>← Zurück</Button>}
              <Button type="submit" loading={submitting} className="flex-1">{step === "form" ? "Weiter →" : "Jetzt verbindlich anmelden"}</Button>
            </div>
          </form>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Deine Buchung</h2>
          {event.image_url && (
            <div className="aspect-video rounded-xl overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="font-semibold text-neutral-900">{event.title}</p>
            <p className="text-sm text-neutral-600 mt-1">📅 {formattedDate}, {start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
            <p className="text-sm text-neutral-600">📍 {event.location}</p>
          </div>
          <div className="border-t border-neutral-100 pt-4 flex justify-between text-sm">
            <span className="text-neutral-600">Preis</span>
            <span className="font-bold text-neutral-900">{event.price === 0 ? "Kostenlos" : `€${event.price}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
