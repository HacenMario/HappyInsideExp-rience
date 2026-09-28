"use client";

import React, { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lightbulb, Flag, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuggestionsPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [type, setType] = useState<"suggestion" | "report">("suggestion");
  const [form, setForm] = useState({ name: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type }),
      });
      if (res.ok) {
        toast({
          title: t.common.success,
          description: t.suggestions.success.replace("{type}", type === "suggestion" ? t.suggestions.typeSuggestion : t.suggestions.typeReport),
        });
        setForm({ name: "", subject: "", message: "" });
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-3 to-brand text-white shadow-xl">
            <Lightbulb className="h-8 w-8" />
          </div>
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.suggestions.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.suggestions.subtitle}</p>
        </div>

        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6 sm:p-8">
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "suggestion" | "report")}
              className="mb-5 grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="type-s"
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-4 font-bold transition-all",
                  type === "suggestion"
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border hover:border-brand/40"
                )}
              >
                <RadioGroupItem value="suggestion" id="type-s" className="sr-only" />
                <Lightbulb className="h-6 w-6" />
                {t.suggestions.typeSuggestion}
              </Label>
              <Label
                htmlFor="type-r"
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-4 font-bold transition-all",
                  type === "report"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border hover:border-destructive/40"
                )}
              >
                <RadioGroupItem value="report" id="type-r" className="sr-only" />
                <Flag className="h-6 w-6" />
                {t.suggestions.typeReport}
              </Label>
            </RadioGroup>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.contact.name}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.suggestions.subject} *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.suggestions.message} *</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              {type === "report" ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-brand-2/30 bg-brand-2/5 p-3.5 text-xs font-semibold text-brand-2">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  {t.suggestions.anonymous}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "h-12 w-full rounded-xl font-extrabold shadow-lg",
                  type === "suggestion" ? "bg-brand shadow-brand/25 hover:bg-brand/90" : "bg-destructive shadow-destructive/25 hover:bg-destructive/90"
                )}
              >
                {loading ? t.common.sending : t.suggestions.send}
                <Send className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
