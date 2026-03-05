"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agb?: string;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("attendee");
  const [agb, setAgb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = "Name ist erforderlich";
    if (!email) e.email = "E-Mail ist erforderlich";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Ungültige E-Mail-Adresse";
    if (!password) e.password = "Passwort ist erforderlich";
    else if (password.length < 8) e.password = "Mindestens 8 Zeichen";
    if (password !== confirmPassword) e.confirmPassword = "Passwörter stimmen nicht überein";
    if (!agb) e.agb = "Bitte AGB akzeptieren";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name, email, password, role);
      toast("Konto erstellt! Willkommen bei EventHub.", "success");
      router.push(role === "organizer" ? "/dashboard" : "/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Registrierung fehlgeschlagen", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-neutral-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary-600">EventHub</Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">Konto erstellen</h1>
          <p className="text-sm text-neutral-600 mt-1">Veranstalter werden oder Events entdecken</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Vollständiger Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="Max Muster"
              autoComplete="name"
              required
            />
            <Input
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="deine@email.de"
              autoComplete="email"
              required
            />
            <Input
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Mindestens 8 Zeichen"
              autoComplete="new-password"
              required
            />
            <Input
              label="Passwort bestätigen"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
              required
            />
            <Select
              label="Rolle"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { value: "attendee", label: "Teilnehmer — Events besuchen" },
                { value: "organizer", label: "Veranstalter — Events erstellen" },
              ]}
            />
            <Checkbox
              label="Ich akzeptiere die AGB und Datenschutzbestimmungen"
              checked={agb}
              onChange={(e) => setAgb(e.target.checked)}
              error={errors.agb}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Konto erstellen
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-600 mt-6">
          Bereits ein Konto?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
