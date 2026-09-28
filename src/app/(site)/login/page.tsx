"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/shared/logo";
import { Eye, EyeOff, Lock, LogIn, Phone, CircleAlert } from "lucide-react";

export default function LoginPage() {
  const { t } = useLang();
  const { refresh } = useSession();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        router.push(data.role === "admin" ? "/admin" : "/dashboard");
        router.refresh();
      } else {
        const key =
          { invalid_credentials: "invalidCredentials", banned: "banned" }[data.error || ""] ||
          data.error;
        setError((t.auth.errors as Record<string, string>)[key] || t.common.error);
        setLoading(false);
      }
    } catch {
      setError(t.common.error);
      setLoading(false);
    }
  };

  return (
    <div className="hero-mesh relative flex min-h-[calc(100vh-4rem)] items-center py-10">
      <div className="blob start-[12%] top-24 h-48 w-48 bg-brand-2/35" />
      <div className="relative mx-auto w-full max-w-md px-4">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <LogoMark size={72} className="mx-auto transition-transform hover:scale-105" />
          </Link>
          <h1 className="mt-3 text-2xl font-black">{t.auth.loginTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>

        <Card className="card-glow border-0 shadow-xl">
          <CardContent className="p-6 sm:p-7">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand" /> {t.common.phone}
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05 XX XX XX XX"
                  dir="ltr"
                  inputMode="tel"
                  className="h-11 text-start"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-brand" /> {t.common.password}
                </Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="h-11 pe-10 text-start"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPass ? "Hide" : "Show"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25">
                {loading ? t.common.loading : t.auth.loginBtn}
                <LogIn className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-xs font-bold text-brand-2 hover:underline">
                {t.auth.forgotLink}
              </Link>
              <Link href="/register" className="text-xs font-bold text-brand hover:underline">
                {t.auth.createOne}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
