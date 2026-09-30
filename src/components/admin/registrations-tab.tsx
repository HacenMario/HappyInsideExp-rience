"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  HandCoins,
  Wallet,
  TrendingDown,
  Undo2,
  Info,
} from "lucide-react";

interface Reg {
  id: string;
  fullName: string;
  phone: string;
  gender: string;
  accountType: "student" | "specialist";
  amountDue: number | null;
  wilaya: string;
  status: "pending" | "confirmed" | "cancelled";
  amountPaid: number | null;
  paidAt: string | null;
  motivation: string;
  createdAt: string;
}

interface MoneySummary {
  fee: number;
  studentFee: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  collected: number;
  expected: number;
  remaining: number;
  pendingPotential: number;
}

type Filter = "all" | "pending" | "confirmed" | "cancelled";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function RegistrationsTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [regs, setRegs] = useState<Reg[] | null>(null);
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const R = t.admin.registrations;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/registrations", { cache: "no-store" });
      const data = await res.json();
      if (!data.error) {
        setRegs(data.registrations);
        setSummary(data.summary);
        // Prefill amount inputs with the expected amount for that
        // registration (student/specialist pricing) or the paid amount
        setAmounts((prev) => {
          const next = { ...prev };
          for (const r of data.registrations as Reg[]) {
            if (next[r.id] === undefined) {
              const typePrice =
                r.accountType === "student"
                  ? data.summary?.studentFee ?? data.summary?.fee ?? 0
                  : data.summary?.fee ?? 0;
              next[r.id] = String(
                r.status === "confirmed" && r.amountPaid != null
                  ? r.amountPaid
                  : r.amountDue ?? typePrice
              );
            }
          }
          return next;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(load);
    const iv = setInterval(load, 20000);
    return () => {
      cancelAnimationFrame(id);
      clearInterval(iv);
    };
  }, [load]);

  const confirmPayment = async (r: Reg) => {
    const amount = Math.max(0, Math.round(Number(amounts[r.id]) || 0));
    setBusyId(r.id);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action: r.status === "confirmed" ? "update_amount" : "confirm_payment", amount }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.error === "full") {
          toast({ title: t.common.error, description: t.campReg.full, variant: "destructive" });
        } else {
          toast({ title: R.paymentConfirmed, description: `${fmtMoney(amount)} DA` });
        }
        await load();
      } else if (data.error === "full") {
        toast({ title: t.common.error, description: t.campReg.full, variant: "destructive" });
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusyId(null);
    }
  };

  const unconfirm = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "unconfirm" }),
      });
      if (res.ok) {
        toast({ title: R.backToPending });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    const res = await fetch(`/api/admin/registrations?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.common.success });
      await load();
    } else {
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: R.filterAll, count: regs?.length ?? 0 },
    { key: "pending", label: R.filterPending, count: summary?.pendingCount ?? 0 },
    { key: "confirmed", label: R.filterConfirmed, count: summary?.confirmedCount ?? 0 },
    { key: "cancelled", label: R.filterCancelled, count: summary?.cancelledCount ?? 0 },
  ];

  const shown = (regs ?? []).filter((r) => (filter === "all" ? true : r.status === filter));

  return (
    <div className="space-y-5">
      {/* ===== Money cards (auto-updating) ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <HandCoins className="h-5 w-5 text-brand-2" />
              <Badge className="bg-brand-2/15 text-[10px] text-brand-2">{fmtMoney(summary?.fee ?? 0)} DA</Badge>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums text-brand-2 sm:text-2xl">
              {fmtMoney(summary?.collected ?? 0)}
              <span className="ms-1 text-[10px] font-bold text-muted-foreground">DA</span>
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{R.money.collected}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-brand" />
              <Badge variant="outline" className="gap-1 text-[10px]">
                🎓 {fmtMoney(summary?.studentFee ?? 0)} · 💼 {fmtMoney(summary?.fee ?? 0)}
              </Badge>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums text-brand sm:text-2xl">
              {fmtMoney(summary?.expected ?? 0)}
              <span className="ms-1 text-[10px] font-bold text-muted-foreground">DA</span>
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{R.money.expected}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="mt-2 text-xl font-black tabular-nums text-destructive sm:text-2xl">
              {fmtMoney(summary?.remaining ?? 0)}
              <span className="ms-1 text-[10px] font-bold text-muted-foreground">DA</span>
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{R.money.remaining}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-brand-3" />
              <Badge variant="outline" className="text-[10px]">{summary?.pendingCount ?? 0}</Badge>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums text-brand-3 sm:text-2xl">
              {fmtMoney(summary?.pendingPotential ?? 0)}
              <span className="ms-1 text-[10px] font-bold text-muted-foreground">DA</span>
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{R.money.pendingPotential}</p>
          </CardContent>
        </Card>
      </div>

      {summary && summary.pendingCount > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand-3/30 bg-brand-3/5 px-4 py-2.5 text-xs font-semibold text-brand-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {R.payHint}
        </div>
      ) : null}

      {/* ===== Table with filters ===== */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black">{R.title}</h2>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-bold transition-colors " +
                    (filter === f.key
                      ? "bg-brand text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground")
                  }
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {regs === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-12 rounded-xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.common.noData}</p>
          ) : (
            <div className="scroll-area max-h-[60vh] overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <TableRow>
                    <TableHead className="min-w-36">{t.common.fullName}</TableHead>
                    <TableHead>{t.common.phone}</TableHead>
                    <TableHead className="hidden md:table-cell">{R.category}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.common.wilaya}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t.common.date}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead className="min-w-52">{lang === "ar" ? "السداد" : "Paiement"}</TableHead>
                    <TableHead className="text-end">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => (
                    <TableRow key={r.id} className={r.status === "cancelled" ? "opacity-60" : ""}>
                      <TableCell className="text-sm font-bold">
                        {r.fullName} {r.gender === "female" ? "👩" : "👨"}
                      </TableCell>
                      <TableCell className="text-xs" dir="ltr">
                        <a href={`tel:${r.phone}`} className="font-semibold text-brand hover:underline">
                          {r.phone}
                        </a>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant="outline"
                            className={
                              "w-fit gap-1 text-[10px] font-extrabold " +
                              (r.accountType === "student"
                                ? "border-brand-2/40 text-brand-2"
                                : "border-brand/40 text-brand")
                            }
                          >
                            {r.accountType === "student" ? "🎓" : "💼"}
                            {r.accountType === "student"
                              ? r.gender === "female"
                                ? t.common.studentF
                                : t.common.student
                              : r.gender === "female"
                                ? t.common.specialistF
                                : t.common.specialist}
                          </Badge>
                          {r.amountDue != null && r.amountDue > 0 ? (
                            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                              {R.due}: {fmtMoney(r.amountDue)} DA
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs md:table-cell">{r.wilaya}</TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        {new Date(r.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" ? (
                          <Badge className="bg-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400">
                            <Clock className="me-1 h-3 w-3" /> {t.campReg.pending}
                          </Badge>
                        ) : r.status === "confirmed" ? (
                          <Badge className="bg-brand-2/15 text-[11px] text-brand-2">
                            <CheckCircle2 className="me-1 h-3 w-3" /> {t.campReg.confirmed}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            <XCircle className="me-1 h-3 w-3" /> {t.campReg.cancelledStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status === "cancelled" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              value={amounts[r.id] ?? ""}
                              onChange={(e) => setAmounts((p) => ({ ...p, [r.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && r.status !== "cancelled") confirmPayment(r);
                              }}
                              placeholder={R.amountPlaceholder}
                              className="h-9 w-24 text-xs tabular-nums"
                              dir="ltr"
                              aria-label={R.amount}
                            />
                            <Button
                              size="sm"
                              onClick={() => confirmPayment(r)}
                              disabled={busyId === r.id}
                              className={
                                "h-9 gap-1 whitespace-nowrap px-3 text-xs font-extrabold " +
                                (r.status === "confirmed"
                                  ? "bg-muted text-foreground hover:bg-muted/70"
                                  : "bg-brand-2 text-white shadow-md shadow-brand-2/30 hover:bg-brand-2/90")
                              }
                            >
                              {busyId === r.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Banknote className="h-3.5 w-3.5" />
                              )}
                              {r.status === "confirmed" ? R.updateAmount : R.paidBtn}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "confirmed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unconfirm(r.id)}
                              disabled={busyId === r.id}
                              className="h-8 gap-1 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400"
                              title={R.unconfirm}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">{R.unconfirm}</span>
                            </Button>
                          ) : null}
                          {r.status !== "cancelled" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancel(r.id)}
                              className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">{R.remove}</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
