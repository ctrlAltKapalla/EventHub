"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "E-Mail ist erforderlich";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Ungültige E-Mail-Adresse";
    if (!password) e.password = "Passwort ist erforderlich";
    else if (password.length < 6) e.password = "Mindestens 6 Zeichen";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      toast("Willkommen zurück!", "success");
      router.push("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Login fehlgeschlagen", "error");
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
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">Willkommen zurück</h1>
          <p className="text-sm text-neutral-600 mt-1">Melde dich mit deinem Konto an</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
            <div className="flex flex-col gap-1">
              <Input
                label="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline self-end">
                Passwort vergessen?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Einloggen
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-neutral-400">oder</span>
            </div>
          </div>

          {/* Demo hint */}
          <div className="bg-primary-50 rounded-lg p-3 text-xs text-primary-700 space-y-1">
            <p className="font-medium">Demo-Zugänge:</p>
            <p>organizer@eventhub.dev · anypassword</p>
            <p>admin@eventhub.dev · anypassword</p>
            <p>user@eventhub.dev · anypassword</p>
          </div>
        </div>

        <p className="text-center text-sm text-neutral-600 mt-6">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
