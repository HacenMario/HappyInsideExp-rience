"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Check, Trash2, MailOpen, MessagesSquare } from "lucide-react";

interface Msg {
  _id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function MessagesTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/messages", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setMsgs(data.messages);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(load);
    const iv = setInterval(load, 20000);
    return () => {
      cancelAnimationFrame(id);
      clearInterval(iv);
    };
  }, [load]);

  const markRead = async (id: string) => {
    await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/admin/messages?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.common.success });
      await load();
    }
  };

  return (
    <Card className="card-glow border-0 p-0">
      <CardContent className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-black">
          <MessagesSquare className="h-5 w-5 text-brand" />
          {t.admin.messages.title}
        </h2>

        {msgs === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : msgs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t.common.noData}</p>
        ) : (
          <div className="scroll-area max-h-[60vh] space-y-3 overflow-y-auto pe-1">
            {msgs.map((m) => (
              <div
                key={m._id}
                className={
                  "rounded-2xl border p-4 transition-colors " +
                  (m.read ? "border-border bg-card" : "border-brand/40 bg-brand/5")
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">
                      {m.name}
                      {!m.read ? (
                        <Badge className="ms-2 bg-brand text-[9px] text-white">{t.admin.suggestionsAdmin.statusNew}</Badge>
                      ) : null}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3" /> {m.phone}
                      </span>
                      {m.email ? (
                        <span className="flex items-center gap-1" dir="ltr">
                          <Mail className="h-3 w-3" /> {m.email}
                        </span>
                      ) : null}
                      <span>
                        {new Date(m.createdAt).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={`https://wa.me/${m.phone.replace(/^0/, "213")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-110"
                      title={t.admin.messages.replyWhatsapp}
                    >
                      <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white">
                        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.594 4.466 1.72 6.412L3.2 28.8l6.556-1.686a12.75 12.75 0 0 0 6.246 1.62h.006c7.058 0 12.798-5.74 12.798-12.8 0-3.42-1.332-6.636-3.752-9.054a12.72 12.72 0 0 0-9.05-3.68zm5.838 18.42c-.32-.16-1.892-.934-2.186-1.04-.292-.108-.506-.16-.72.16-.212.32-.826 1.04-1.012 1.254-.186.212-.372.24-.692.08-.32-.16-1.352-.498-2.574-1.588-.952-.848-1.594-1.896-1.782-2.216-.186-.32-.02-.494.14-.652.144-.144.32-.374.48-.56.16-.186.212-.32.32-.532.106-.214.054-.4-.028-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.548l-.614-.012c-.212 0-.56.08-.852.4-.292.32-1.118 1.092-1.118 2.664s1.144 3.09 1.304 3.306c.16.212 2.252 3.44 5.456 4.824.762.33 1.358.526 1.822.674.766.244 1.462.21 2.012.128.614-.092 1.892-.774 2.158-1.52.266-.748.266-1.388.186-1.522-.08-.134-.292-.214-.612-.374z" />
                      </svg>
                    </a>
                    {!m.read ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(m._id)} title={t.admin.messages.markRead}>
                        <MailOpen className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Check className="m-2 h-4 w-4 text-brand-2" />
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(m._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm font-bold text-brand">{m.subject}</p>
                <p className="mt-1 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
