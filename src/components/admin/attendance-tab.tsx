"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScanLine,
  Keyboard,
  Award,
  Undo2,
  BadgeCheck,
  Clock,
  UserCheck,
  Hourglass,
  ExternalLink,
  Loader2,
  QrCode,
  Search,
  Sparkles,
} from "lucide-react";

interface AdminReg {
  id: string;
  fullName: string;
  phone: string;
  gender: string;
  accountType: "student" | "specialist";
  amountDue: number | null;
  wilaya: string;
  code: string;
  attended: boolean;
  attendedAt: string | null;
  certificate: { issued: boolean; number: string; issuedAt: string } | null;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

interface Summary {
  confirmedCount: number;
  attendedCount: number;
  certificatesIssued: number;
  waitingCount: number;
}

interface CheckinResult {
  fullName: string;
  phone: string;
  accountType: "student" | "specialist";
  already: boolean;
  attendedAt: string;
}

const fmtTime = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AttendanceTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const A = t.admin.attendance;

  const [regs, setRegs] = useState<AdminReg[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/registrations", { cache: "no-store" });
      const data = await res.json();
      if (!data.error) {
        setRegs(data.registrations);
        setSummary(data.summary);
      }
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  const doCheckin = useCallback(
    async (rawCode: string, silent = false) => {
      const clean = rawCode.trim().toUpperCase();
      if (!clean || busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/admin/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: clean }),
        });
        const data = await res.json();
        if (res.ok) {
          const p = data.participant;
          setLastResult({
            fullName: p.fullName,
            phone: p.phone,
            accountType: p.accountType,
            already: !!data.already,
            attendedAt: data.attendedAt,
          });
          if (!silent) {
            toast({
              title: data.already ? A.alreadyAttendedToast : A.checkedInToast,
              description: p.fullName,
            });
          }
          await load();
          return true;
        }
        if (!silent) {
          const msgs: Record<string, string> = {
            invalid_code: A.invalidCode,
            not_confirmed: A.notConfirmed,
            cancelled_reg: A.cancelledReg,
          };
          toast({
            title: t.common.error,
            description: msgs[data.error] || t.common.error,
            variant: "destructive",
          });
        }
        return false;
      } catch {
        if (!silent) toast({ title: t.common.error, variant: "destructive" });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, load, A, t.common.error]
  );

  /* ---------- QR camera scanner (html5-qrcode, loaded lazily) ---------- */
  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {}
    }
  }, []);

  const startScanner = useCallback(async () => {
    setScannerStarting(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // give the dialog a beat to mount the reader element
      await new Promise((r) => setTimeout(r, 250));
      const scanner = new Html5Qrcode("qr-reader-region", { verbose: false });
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded: string) => {
          const now = Date.now();
          if (decoded === lastScanRef.current.code && now - lastScanRef.current.at < 3500) return;
          lastScanRef.current = { code: decoded, at: now };
          doCheckin(decoded, true).then((ok) => {
            if (ok) toast({ title: A.checkedInToast });
          });
        },
        () => {}
      );
    } catch {
      toast({ title: t.common.error, description: A.cameraError, variant: "destructive" });
      setScannerOpen(false);
    } finally {
      setScannerStarting(false);
    }
  }, [doCheckin, A, t.common.error]);

  const openScanner = () => {
    setLastResult(null);
    setScannerOpen(true);
    startScanner();
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  /* ---------- certificate actions ---------- */
  const issueCert = async (r: AdminReg) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action: "issue" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: A.certIssued, description: data.number });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeCert = async (r: AdminReg) => {
    if (!window.confirm(A.confirmRevoke)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action: "revoke" }),
      });
      if (res.ok) {
        toast({ title: A.certRevoked });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const bulkIssue = async () => {
    const n = (regs ?? []).filter((r) => r.status === "confirmed" && r.attended && !r.certificate?.issued).length;
    if (!window.confirm(A.confirmBulk.replace("{n}", String(n)))) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_all_attended" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: A.bulkDone.replace("{n}", String(data.issued ?? 0)) });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const undoCheckin = async (r: AdminReg) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action: "undo" }),
      });
      if (res.ok) {
        toast({ title: A.checkinUndone });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmed = (regs ?? []).filter((r) => r.status === "confirmed");
  const attended = confirmed.filter((r) => r.attended);
  const pendingCerts = confirmed.filter((r) => r.attended && !r.certificate?.issued).length;
  const shown = confirmed.filter((r) =>
    search
      ? r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.code.includes(search.toUpperCase()) ||
        r.phone.includes(search)
      : true
  );

  return (
    <div className="space-y-5">
      {/* ===== Stats chips ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <UserCheck className="h-5 w-5 text-brand-2" />
            <p className="mt-2 text-xl font-black tabular-nums text-brand-2 sm:text-2xl">{summary?.attendedCount ?? 0}</p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{A.attendedCount}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <Hourglass className="h-5 w-5 text-brand" />
            <p className="mt-2 text-xl font-black tabular-nums text-brand sm:text-2xl">{summary?.confirmedCount ?? 0}</p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{A.confirmedCount}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <Award className="h-5 w-5 text-amber-500" />
            <p className="mt-2 text-xl font-black tabular-nums text-amber-500 sm:text-2xl">{summary?.certificatesIssued ?? 0}</p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{A.certsCount}</p>
          </CardContent>
        </Card>
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-4">
            <Clock className="h-5 w-5 text-brand-3" />
            <p className="mt-2 text-xl font-black tabular-nums text-brand-3 sm:text-2xl">{summary?.waitingCount ?? 0}</p>
            <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{t.admin.waitlist.titleShort}</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Check-in tool ===== */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <h2 className="text-base font-black">{A.checkinTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{A.checkinHint}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Keyboard className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    doCheckin(code).then(() => setCode(""));
                  }
                }}
                placeholder={A.codePlaceholder}
                dir="ltr"
                className="h-11 ps-9 font-mono text-sm font-bold tracking-wider"
              />
            </div>
            <Button
              onClick={() => doCheckin(code).then(() => setCode(""))}
              disabled={busy || !code.trim()}
              className="h-11 rounded-xl font-extrabold shadow-md shadow-brand-2/25"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {A.checkinBtn}
            </Button>
            <Button onClick={openScanner} variant="outline" className="h-11 rounded-xl font-extrabold">
              <ScanLine className="h-4 w-4" />
              {A.scanBtn}
            </Button>
          </div>

          {lastResult ? (
            <div
              className={
                "mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-4 py-3 " +
                (lastResult.already
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-brand-2/35 bg-brand-2/5")
              }
            >
              <BadgeCheck className={"h-5 w-5 " + (lastResult.already ? "text-amber-500" : "text-brand-2")} />
              <div className="min-w-0">
                <p className="text-sm font-black">
                  {lastResult.fullName}
                  {" · "}
                  {lastResult.accountType === "student" ? "🎓 " + t.common.student : "💼 " + t.common.specialist}
                </p>
                <p className="text-[11px] text-muted-foreground" dir="ltr">
                  {lastResult.phone} · {fmtTime(lastResult.attendedAt, lang)}
                </p>
              </div>
              {lastResult.already ? (
                <Badge className="bg-amber-500/15 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  {A.alreadyBadge}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {/* last check-ins */}
          {attended.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-black text-muted-foreground">{A.recentCheckins}</p>
              <div className="scroll-area max-h-40 space-y-1.5 overflow-y-auto pe-1">
                {[...attended]
                  .sort((a, b) => (b.attendedAt || "").localeCompare(a.attendedAt || ""))
                  .slice(0, 6)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                      <span className="font-bold">{r.fullName}</span>
                      <span className="text-muted-foreground">{r.attendedAt ? fmtTime(r.attendedAt, lang) : ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ===== Certificates bulk + table ===== */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">{A.certsTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{A.certsHint}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-52">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.common.search} className="h-10 ps-9" />
              </div>
              <Button
                onClick={bulkIssue}
                disabled={bulkBusy || pendingCerts === 0}
                className="rounded-xl font-extrabold shadow-md shadow-amber-500/20"
                title={A.bulkBtn}
              >
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {A.bulkBtn} ({pendingCerts})
              </Button>
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
            <div className="scroll-area max-h-[55vh] overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <TableRow>
                    <TableHead className="min-w-40">{t.common.fullName}</TableHead>
                    <TableHead className="hidden sm:table-cell">{A.codeCol}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.common.wilaya}</TableHead>
                    <TableHead>{A.presenceCol}</TableHead>
                    <TableHead>{A.certCol}</TableHead>
                    <TableHead className="text-end">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="text-sm font-bold">{r.fullName}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {r.accountType === "student" ? "🎓" : "💼"} {r.phone}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" dir="ltr">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide">
                          {r.code || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-xs md:table-cell">{r.wilaya || "—"}</TableCell>
                      <TableCell>
                        {r.attended ? (
                          <Badge className="gap-1 bg-brand-2/15 text-[11px] font-extrabold text-brand-2">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            {A.present}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            {A.absent}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.certificate?.issued ? (
                          <button
                            onClick={() => {
                              if (window.confirm(A.confirmRevoke)) revokeCert(r);
                            }}
                            className="group flex items-center gap-1"
                            title={A.certCol}
                          >
                            <Badge className="gap-1 bg-amber-500/15 text-[10px] font-extrabold text-amber-600 group-hover:bg-amber-500/25 dark:text-amber-400">
                              <Award className="h-3 w-3" />
                              {r.certificate.number}
                            </Badge>
                          </button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => issueCert(r)}
                            className="h-8 gap-1 rounded-lg px-2.5 text-[11px] font-extrabold"
                          >
                            <Award className="h-3.5 w-3.5 text-amber-500" />
                            {A.issueBtn}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          {r.certificate?.issued ? (
                            <a href={`/certificate?code=${encodeURIComponent(r.code || r.certificate.number)}`} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" title={A.preview}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">{A.preview}</span>
                              </Button>
                            </a>
                          ) : null}
                          {r.attended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => undoCheckin(r)}
                              disabled={busy}
                              className="h-8 gap-1 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400"
                              title={A.undoCheckin}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">{A.undoCheckin}</span>
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

      {/* ===== QR scanner dialog ===== */}
      <Dialog open={scannerOpen} onOpenChange={(o) => (o ? openScanner() : closeScanner())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-brand" />
              {A.scanTitle}
            </DialogTitle>
            <DialogDescription>{A.scanDesc}</DialogDescription>
          </DialogHeader>
          <div id="qr-reader-region" className="overflow-hidden rounded-xl border border-border bg-muted/40" />
          {scannerStarting ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {A.cameraStarting}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
