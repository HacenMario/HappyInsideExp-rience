"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import FloatingBubble from "@/components/layout/floating-bubble";

export default function WhatsAppButton() {
  const { t } = useLang();
  const [waNumber, setWaNumber] = useState<string>("213550000000");

  useEffect(() => {
    let alive = true;
    fetch("/api/camp", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.settings?.whatsappNumber) setWaNumber(String(d.settings.whatsappNumber));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(t.whatsapp.message)}`;

  return (
    <FloatingBubble
      storageKey="hiex_wa_hidden"
      side="end"
      ariaLabel="WhatsApp"
      tooltip={t.whatsapp.tooltip}
      ringColor="#25D366"
      onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
      className="bg-[#25D366]"
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8 fill-white" aria-hidden="true">
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.594 4.466 1.72 6.412L3.2 28.8l6.556-1.686a12.75 12.75 0 0 0 6.246 1.62h.006c7.058 0 12.798-5.74 12.798-12.8 0-3.42-1.332-6.636-3.752-9.054a12.72 12.72 0 0 0-9.05-3.68zm0 23.396h-.004c-1.94 0-3.848-.522-5.512-1.508l-.396-.234-4.1 1.054 1.096-4.0-.258-.41a10.63 10.63 0 0 1-1.63-5.66c0-5.868 4.776-10.64 10.65-10.64 2.844 0 5.516 1.108 7.526 3.12a10.58 10.58 0 0 1 3.116 7.528c-.002 5.868-4.78 10.75-10.488 10.75zm5.838-7.976c-.32-.16-1.892-.934-2.186-1.04-.292-.108-.506-.16-.72.16-.212.32-.826 1.04-1.012 1.254-.186.212-.372.24-.692.08-.32-.16-1.352-.498-2.574-1.588-.952-.848-1.594-1.896-1.782-2.216-.186-.32-.02-.494.14-.652.144-.144.32-.374.48-.56.16-.186.212-.32.32-.532.106-.214.054-.4-.028-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.548l-.614-.012c-.212 0-.56.08-.852.4-.292.32-1.118 1.092-1.118 2.664s1.144 3.09 1.304 3.306c.16.212 2.252 3.44 5.456 4.824.762.33 1.358.526 1.822.674.766.244 1.462.21 2.012.128.614-.092 1.892-.774 2.158-1.52.266-.748.266-1.388.186-1.522-.08-.134-.292-.214-.612-.374z" />
      </svg>
    </FloatingBubble>
  );
}
