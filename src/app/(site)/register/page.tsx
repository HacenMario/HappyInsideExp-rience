"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { useCampInfo } from "@/components/shared/camp-info";
import { notifyNativeDevice } from "@/lib/native-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/shared/logo";
import { WilayaSelect } from "@/components/shared/wilaya-select";
import { cn } from "@/lib/utils";
import {
  UserRound,
  Phone,
  Lock,
  Building,
  MapPin,
  ShieldQuestion,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  CircleAlert,
  GraduationCap,
  Briefcase,
  Banknote,
} from "lucide-react";

const QUESTIONS = ["q1", "q2", "q3", "q4"] as const;

export default function RegisterPage() {
  const { t, lang, dir } = useLang();
  const { refresh } = useSession();
  const camp = useCampInfo();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const Back = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  /* "booking" redirect: after account creation, jump straight to the camp
     registration card (the "احجز مقعدك الآن" entry point). Read from the URL
     at event time — no state, no hydration mismatch. */
  const isBookingRedirect = () =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("redirect") === "booking";

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    password: "",
    gender: "",
    accountType: "",
    wilaya: "",
    workplace: "",
    recoveryQuestion: "",
    recoveryAnswer: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errKey = (e: string) =>
    ({
      phone_exists: "phoneExists",
      invalid_phone: "invalidPhone",
      password_short: "passwordShort",
    }[e] || e);

  const validateStep1 = () => {
    setError("");
    if (!form.fullName.trim()) return false;
    if (!/^(0)(5|6|7)[0-9]{8}$/.test(form.phone.replace(/[\s-]/g, ""))) {
      setError(t.auth.errors.invalidPhone);
      return false;
    }
    if (form.password.length < 8) {
      setError(t.auth.errors.passwordShort);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError("");
    if (!form.gender) return false;
    if (!form.accountType) return false;
    if (!form.wilaya) return false;
    if (!form.recoveryQuestion || !form.recoveryAnswer.trim()) return false;
    return true;
  };

  const next = () => {
    if (validateStep1()) setStep(2);
  };

  const submit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        notifyNativeDevice({ type: "user", phone: form.phone.replace(/[\s-]/g, "") });
        if (isBookingRedirect() && data.role !== "admin") {
          router.push("/dashboard?tab=registration&book=1");
        } else {
          router.push(data.role === "admin" ? "/admin" : "/dashboard");
        }
        router.refresh();
      } else {
        const key = errKey(data.error || "");
        setError(
          (t.auth.errors as Record<string, string>)[key] || t.common.error
        );
        setLoading(false);
      }
    } catch {
      setError(t.common.error);
      setLoading(false);
    }
  };

  return (
    <div className="hero-mesh relative min-h-[calc(100vh-4rem)] py-10">
      <div className="blob end-[15%] top-16 h-52 w-52 bg-brand/35" />
      <div className="relative mx-auto max-w-lg px-4">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <LogoMark size={72} className="mx-auto transition-transform hover:scale-105" />
          </Link>
          <h1 className="mt-3 text-2xl font-black">{t.auth.registerTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
        </div>

        {/* Steps indicator */}
        <div className="mb-5 flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-black transition-all",
                  step >= s ? "bg-brand text-white shadow-md" : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s === 1 ? <div className={cn("h-1 w-14 rounded-full", step > 1 ? "bg-brand" : "bg-muted")} /> : null}
            </React.Fragment>
          ))}
          <span className="ms-2 text-xs font-bold text-muted-foreground">
            {t.auth.steps} {step} {t.auth.of} 2
          </span>
        </div>

        <Card className="card-glow border-0 shadow-xl">
          <CardContent className="p-6 sm:p-7">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-brand" /> {t.common.fullName}
                  </Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder={lang === "ar" ? "مثال: أمينة بن علي" : "Ex : Amina Ben Ali"}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand" /> {t.common.phone}
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="05 XX XX XX XX"
                    dir="ltr"
                    inputMode="tel"
                    className="h-11 text-start"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-brand" /> {t.common.password}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="h-11 pe-10 text-start"
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

                <Button onClick={next} className="h-11 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25">
                  {t.common.next}
                  <Next className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t.common.gender}</Label>
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(v) => set("gender", v)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div>
                      <RadioGroupItem value="female" id="g-f" className="peer sr-only" />
                      <Label
                        htmlFor="g-f"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border p-3 font-bold transition-all peer-data-[state=checked]:border-brand peer-data-[state=checked]:bg-brand/10"
                      >
                        <span className="text-xl">👩</span> {t.common.female}
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="male" id="g-m" className="peer sr-only" />
                      <Label
                        htmlFor="g-m"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border p-3 font-bold transition-all peer-data-[state=checked]:border-brand peer-data-[state=checked]:bg-brand/10"
                      >
                        <span className="text-xl">👨</span> {t.common.male}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.auth.accountTypeTitle}</Label>
                  <RadioGroup
                    value={form.accountType}
                    onValueChange={(v) => set("accountType", v)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div>
                      <RadioGroupItem value="student" id="at-s" className="peer sr-only" />
                      <Label
                        htmlFor="at-s"
                        className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-border p-3 text-center font-bold transition-all peer-data-[state=checked]:border-brand peer-data-[state=checked]:bg-brand/10"
                      >
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-brand-2" /> {t.common.student}
                        </span>
                        {camp.studentFee > 0 ? (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold tabular-nums text-brand-2">
                            <Banknote className="h-3 w-3" />
                            {new Intl.NumberFormat("fr-FR").format(camp.studentFee)} DA
                          </span>
                        ) : null}
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="specialist" id="at-p" className="peer sr-only" />
                      <Label
                        htmlFor="at-p"
                        className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-border p-3 text-center font-bold transition-all peer-data-[state=checked]:border-brand peer-data-[state=checked]:bg-brand/10"
                      >
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-brand" /> {t.common.specialist}
                        </span>
                        {camp.specialistFee > 0 ? (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold tabular-nums text-brand">
                            <Banknote className="h-3 w-3" />
                            {new Intl.NumberFormat("fr-FR").format(camp.specialistFee)} DA
                          </span>
                        ) : null}
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-[11px] text-muted-foreground">{t.auth.accountTypeHint}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-brand" /> {t.common.wilaya}
                    </Label>
                    <WilayaSelect
                      value={form.wilaya}
                      onValueChange={(v) => set("wilaya", v)}
                      placeholder={t.common.wilayaPlaceholder}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-brand" /> {t.common.workplace}
                    </Label>
                    <Input
                      value={form.workplace}
                      onChange={(e) => set("workplace", e.target.value)}
                      placeholder={lang === "ar" ? "مدرسة، مركز..." : "École, centre..."}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <ShieldQuestion className="h-3.5 w-3.5 text-brand" /> {t.auth.recoveryQuestion}
                  </Label>
                  <Select value={form.recoveryQuestion} onValueChange={(v) => set("recoveryQuestion", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t.auth.selectQuestion} />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q}>
                          {t.auth.questions[q]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.auth.recoveryAnswer}</Label>
                  <Input
                    value={form.recoveryAnswer}
                    onChange={(e) => set("recoveryAnswer", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ar"
                      ? "سيُستخدم هذا السؤال لاستعادة كلمة المرور عند نسيانها"
                      : "Cette question servira à récupérer votre mot de passe en cas d'oubli"}
                  </p>
                </div>

                {error ? (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-11 flex-1 rounded-xl font-bold">
                    <Back className="h-4 w-4" /> {t.common.back}
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={loading}
                    className="h-11 flex-[2] rounded-xl font-extrabold shadow-lg shadow-brand/25"
                  >
                    {loading ? t.common.saving : t.auth.registerBtn}
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.auth.haveAccount}{" "}
          <Link
            href="/login"
            onClick={(e) => {
              if (isBookingRedirect()) {
                // keep the booking flow alive through login
                e.preventDefault();
                router.push("/login?redirect=booking");
              }
            }}
            className="font-extrabold text-brand hover:underline"
          >
            {t.auth.loginBtn}
          </Link>
        </p>
      </div>
    </div>
  );
}
