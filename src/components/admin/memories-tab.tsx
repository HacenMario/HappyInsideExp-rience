"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Loader2, Trash2, XCircle, Hourglass, Images } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * ADMIN — MEMORIES TAB (Task 20)
 * Moderation queue for the shared memories album:
 * approve / reject / delete. Pending items first.
 * ============================================================ */

interface AdminMemory {
  id: string;
  author: string;
  caption: string;
  data: string;
  mimeType: string;
  size: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function MemoriesTab() {
  const { t } = useLang();
  const { toast } = useToast();
  const [items, setItems] = useState<AdminMemory[] | null>(null);
  const [busyId, setBusyId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<AdminMemory | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/memories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.memories || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  const act = async (m: AdminMemory, action: "approve" | "reject" | "delete") => {
    setBusyId(m.id);
    try {
      const res = await fetch("/api/admin/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, action }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t.common.success });
      load();
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setBusyId("");
      setConfirmDelete(null);
    }
  };

  const pendingCount = (items || []).filter((m) => m.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Images className="h-5 w-5 text-brand" />
          {t.admin.tabs.memories}
        </h2>
        {items !== null && pendingCount > 0 ? (
          <Badge className="bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
            <Hourglass className="me-1 h-3.5 w-3.5" />
            {pendingCount}
          </Badge>
        ) : null}
      </div>

      {items === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer h-52 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm font-bold text-muted-foreground">
          {t.memories.empty}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...items]
            .sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1))
            .map((m) => (
              <div
                key={m.id}
                className={cn(
                  "memories-card overflow-hidden rounded-3xl border bg-card shadow-sm",
                  m.status === "pending"
                    ? "border-amber-500/50 ring-1 ring-amber-500/25"
                    : m.status === "approved"
                      ? "border-border/70"
                      : "border-border/70 opacity-70"
                )}
              >
                <div className="relative">
                  <img src={m.data} alt={m.caption || ""} className="h-44 w-full object-cover" />
                  <div className="absolute end-2 top-2">
                    <StatusChip status={m.status} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-[12px] font-black">{m.caption || "—"}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                    {t.memories.by} {m.author}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {m.status !== "approved" ? (
                      <Button
                        size="sm"
                        onClick={() => act(m, "approve")}
                        disabled={busyId === m.id}
                        className="h-8 rounded-lg bg-emerald-500 text-[11px] font-black text-white hover:bg-emerald-500/90"
                      >
                        {busyId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {t.memories.approvedChip}
                      </Button>
                    ) : null}
                    {m.status !== "rejected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(m, "reject")}
                        disabled={busyId === m.id}
                        className="h-8 rounded-lg border-amber-500/50 text-[11px] font-black text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {t.memories.rejectedChip}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(m)}
                      disabled={busyId === m.id}
                      className="h-8 rounded-lg border-destructive/40 text-[11px] font-black text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.memories.deleteMine}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.memories.deleteMine}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.caption || confirmDelete?.author}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && act(confirmDelete, "delete")}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusChip({ status }: { status: AdminMemory["status"] }) {
  const { t } = useLang();
  const map = {
    pending: { label: t.memories.pendingChip, cls: "bg-amber-500/90 text-white" },
    approved: { label: t.memories.approvedChip, cls: "bg-emerald-500/90 text-white" },
    rejected: { label: t.memories.rejectedChip, cls: "bg-destructive/90 text-white" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black shadow-md", s.cls)}>
      {s.label}
    </span>
  );
}
