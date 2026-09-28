"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoMark } from "@/components/shared/logo";
import { CircleAlert, KeyRound, Phone, ShieldQuestion } from "lucide-react";

const QUESTIONS = ["q1", "q2", "q3", "q4"] as const;

export default function ForgotPasswordPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchQuestion = async (value: string) => {
    const clean = value.replace(/[\s-]/g, "");
    if (!/^(0)(5|6|7)[0-9]{8}$/.test(clean)) return;
    try {
      const res = await fetch(`/api/auth/forgot-password?phone=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recoveryQuestion) setQuestion(data.recoveryQuestion);
      } else {
        setQuestion("");
      }
    } catch {
      setQuestion("");
    }
  };

  const qLabel = (key: string) =>
    (t.auth.questions as Record<string, string>)[key] || t.auth.recoveryQuestion;

  const mapErr = (e: string) =>
    ({
      phone_not_found: "phoneNotFound",
      wrong_answer: "wrongAnswer",
      password_short: "passwordShort",
      password_mismatch: "passwordMismatch",
      invalid_token: "common",
    }[e] || "common");

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, recoveryAnswer: answer }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetToken(data.resetToken);
        setStep(2);
        setLoading(false);
      } else {
        const key = mapErr(data.error || "");
        setError(key === "common" ? t.common.error : (t.auth.errors as Record<string, string>)[key]);
        setLoading(false);
      }
    } catch {
      setError(t.common.error);
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t.auth.errors.passwordShort);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.errors.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/login");
      } else {
        const key = mapErr(data.error || "");
        setError(key === "common" ? t.common.error : (t.auth.errors as Record<string, string>)[key]);
        setLoading(false);
      }
    } catch {
      setError(t.common.error);
      setLoading(false);
    }
  };

  return (
    <div className="hero-mesh relative flex min-h-[calc(100vh-4rem)] items-center py-10">
      <div className="blob end-[10%] bottom-16 h-48 w-48 bg-brand/30" />
      <div className="relative mx-auto w-full max-w-md px-4">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <LogoMark size={64} className="mx-auto" />
          </Link>
          <h1 className="mt-3 text-2xl font-black">{t.auth.forgotTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.forgotSubtitle}</p>
        </div>

        <Card className="card-glow border-0 shadow-xl">
          <CardContent className="p-6 sm:p-7">
            {step === 1 ? (
              <form onSubmit={verify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand" /> {t.common.phone}
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={(e) => fetchQuestion(e.target.value)}
                    placeholder="05 XX XX XX XX"
                    dir="ltr"
                    className="h-11 text-start"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <ShieldQuestion className="h-3.5 w-3.5 text-brand" /> {t.auth.recoveryAnswer}
                  </Label>
                  {question ? (
                    <p className="rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-semibold">
                      {qLabel(question)}
                    </p>
                  ) : null}
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="h-11"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ar" ? "اكتب نفس الجواب الذي سجلته عند إنشاء الحساب" : "Écrivez la même réponse que lors de la création du compte"}
                  </p>
                </div>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25">
                  {loading ? t.common.loading : t.common.confirm}
                  <KeyRound className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={reset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t.auth.newPassword}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="h-11 text-start"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.auth.confirmPassword}</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    dir="ltr"
                    className="h-11 text-start"
                    required
                  />
                </div>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25">
                  {loading ? t.common.saving : t.auth.resetBtn}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-extrabold text-brand hover:underline">
            ← {t.auth.loginBtn}
          </Link>
        </p>
      </div>
    </div>
  );
}
