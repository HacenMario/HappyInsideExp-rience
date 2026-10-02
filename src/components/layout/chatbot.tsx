"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { LogoMark } from "@/components/shared/logo";
import FloatingBubble from "@/components/layout/floating-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Send, Bot, Sparkles, LayoutGrid } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function Chatbot() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !greeted) {
      setMessages([{ role: "assistant", content: t.bot.greeting }]);
      setGreeted(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, greeted, t.bot.greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || typing) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m.content).slice(-12),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: t.bot.error }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t.bot.error }]);
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const askTopics = () => send(lang === "ar" ? "ما المواضيع التي تساعدني فيها؟" : "Quels sujets peux-tu traiter ?");

  return (
    <>
      <FloatingBubble
        storageKey="hiex_chat_hidden"
        side="start"
        ariaLabel={t.bot.title}
        tooltip={t.bubble.dragHint}
        ringColor="var(--brand)"
        onClick={() => setOpen((o) => !o)}
        className="bg-gradient-to-br from-brand to-brand-2"
      >
        <LogoMark size={34} className="rounded-full drop-shadow" />
      </FloatingBubble>

      {/* Chat window */}
      <div
        className={cn(
          "fixed bottom-24 start-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition-all duration-300 sm:w-96",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        )}
        style={{ height: "min(560px, calc(100vh - 8rem))" }}
        role="dialog"
        aria-label={t.bot.title}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand via-brand-3 to-brand-2 px-4 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-1">
              <LogoMark size={36} className="rounded-full" />
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-extrabold">
                {t.bot.title}
                <Sparkles className="h-3.5 w-3.5" />
              </p>
              <p className="flex items-center gap-1.5 text-[11px] opacity-90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
                {t.bot.subtitle}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/20"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} role="log" aria-live="polite" className="scroll-area flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("bubble-in flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "rounded-ee-md bg-brand text-white"
                    : "rounded-es-md border border-border bg-card text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-es-md border border-border bg-card px-4 py-3 shadow-sm">
                <Bot className="h-4 w-4 text-brand" />
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-[10px] text-muted-foreground">{t.bot.typing}</span>
              </div>
            </div>
          ) : null}
          {messages.length <= 6 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {t.bot.quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="quick-chip rounded-full border border-brand/40 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.bot.placeholder}
              className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
              maxLength={500}
            />
            <button
              type="button"
              onClick={askTopics}
              disabled={typing}
              title={t.bot.topicsTitle}
              aria-label={t.bot.topicsTitle}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/5 text-brand transition-all hover:bg-brand hover:text-white disabled:opacity-50"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || typing}
              className="h-10 w-10 shrink-0 rounded-full bg-brand hover:bg-brand/90"
              aria-label={t.bot.send}
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          </form>
          <p className="mt-1.5 text-center text-[9px] text-muted-foreground/70">
            Happy inside expérience · AI Assistant
          </p>
        </div>
      </div>
    </>
  );
}
