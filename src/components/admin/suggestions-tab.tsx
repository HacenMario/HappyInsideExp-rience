"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Lightbulb, Flag, CheckCircle2, Clock } from "lucide-react";

interface Suggestion {
  _id: string;
  name: string;
  type: "suggestion" | "report";
  subject: string;
  message: string;
  status: "new" | "in_review" | "resolved";
  createdAt: string;
}

export default function SuggestionsTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [items, setItems] = useState<Suggestion[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/suggestions", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setItems(data.suggestions);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(load);
    return () => cancelAnimationFrame(id);
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/admin/suggestions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.common.success });
      await load();
    }
  };

  const statusBadge = (s: string) => {
    if (s === "new") return <Badge className="bg-brand text-white">{t.admin.suggestionsAdmin.statusNew}</Badge>;
    if (s === "in_review") return <Badge className="bg-brand-3/20 text-brand-3"><Clock className="me-1 h-3 w-3" />{t.admin.suggestionsAdmin.statusReview}</Badge>;
    return <Badge className="bg-brand-2/15 text-brand-2"><CheckCircle2 className="me-1 h-3 w-3" />{t.admin.suggestionsAdmin.statusResolved}</Badge>;
  };

  return (
    <Card className="card-glow border-0 p-0">
      <CardContent className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-black">
          <Lightbulb className="h-5 w-5 text-brand" />
          {t.admin.suggestionsAdmin.title}
        </h2>

        {items === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t.common.noData}</p>
        ) : (
          <div className="scroll-area max-h-[60vh] space-y-3 overflow-y-auto pe-1">
            {items.map((s) => (
              <div key={s._id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white " +
                        (s.type === "suggestion" ? "bg-brand" : "bg-destructive")
                      }
                    >
                      {s.type === "suggestion" ? <Lightbulb className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-black">{s.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.name || "—"} · {new Date(s.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusBadge(s.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(s._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">{s.message}</p>
                <div className="mt-3 flex gap-2">
                  {s.status !== "in_review" ? (
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => setStatus(s._id, "in_review")}>
                      <Clock className="h-3.5 w-3.5" /> {t.admin.suggestionsAdmin.setReview}
                    </Button>
                  ) : null}
                  {s.status !== "resolved" ? (
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-xs text-brand-2" onClick={() => setStatus(s._id, "resolved")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t.admin.suggestionsAdmin.setResolved}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
