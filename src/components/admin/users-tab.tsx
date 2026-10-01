"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, MoreVertical, Ban, CheckCircle2, KeyRound, Trash2, ShieldAlert } from "lucide-react";

interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  gender: "male" | "female";
  accountType: "student" | "specialist";
  wilaya: string;
  workplace: string;
  avatar: string | null;
  role: "admin" | "user";
  status: string;
  createdAt: string;
}

export default function UsersTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState("");
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPass, setNewPass] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.error) setUsers(data.users);
    } catch {}
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const act = async (id: string, action: string, value?: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, value }),
      });
      if (res.ok) {
        toast({ title: t.common.success });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const del = async (id: string) => {
    if (!window.confirm(t.admin.users.confirmDelete)) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.admin.users.deleted });
      await load();
    } else {
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const doReset = async () => {
    if (!resetTarget) return;
    await act(resetTarget.id, "reset_password", newPass);
    setResetTarget(null);
    setNewPass("");
  };

  return (
    <Card className="card-glow border-0 p-0">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-black">{t.admin.users.title}</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.common.search}
              className="h-10 ps-9"
            />
          </div>
        </div>

        {users === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t.common.noData}</p>
        ) : (
          <div className="scroll-area max-h-[60vh] overflow-auto rounded-xl border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-44">{t.common.fullName}</TableHead>
                  <TableHead>{t.common.phone}</TableHead>
                  <TableHead>{t.common.gender}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.common.wilaya}</TableHead>
                  <TableHead>{t.admin.users.role}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.status === "banned" ? "opacity-55" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          <Image src={u.avatar} alt={u.fullName} width={40} height={40} className="h-9 w-9 rounded-full border border-border object-cover" />
                        ) : (
                          <div className={"flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white " + (u.gender === "female" ? "bg-pink-500" : "bg-sky-500")}>
                            {u.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{u.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs" dir="ltr">{u.phone}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold">{u.gender === "female" ? "👩" : "👨"}</span>
                    </TableCell>
                    <TableCell className="hidden text-xs md:table-cell">{u.wilaya}</TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-brand-3/20 text-brand-3">
                          {t.admin.users.admin}
                        </Badge>
                      ) : (
                        /* Account category — students show as طالب/Étudiant, others as أخصائي */
                        <Badge
                          variant="outline"
                          className={
                            u.accountType === "student"
                              ? "gap-1 border-brand-2/40 text-[11px] text-brand-2"
                              : "gap-1 border-brand/40 text-[11px] text-brand"
                          }
                        >
                          {u.accountType === "student" ? "🎓" : "💼"}
                          {u.accountType === "student"
                            ? u.gender === "female"
                              ? t.common.studentF
                              : t.common.student
                            : u.gender === "female"
                              ? t.common.specialistF
                              : t.common.specialist}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={u.status === "active" ? "border-brand-2/50 text-brand-2" : "border-destructive/50 text-destructive"}>
                        {u.status === "active" ? t.common.active : t.common.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {u.role === "admin" ? (
                        <ShieldAlert className="ms-auto h-4 w-4 text-muted-foreground/40" />
                      ) : (
                        <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => act(u.id, u.status === "active" ? "ban" : "unban")}>
                              {u.status === "active" ? (
                                <>
                                  <Ban className="h-4 w-4 text-destructive" /> {t.admin.users.ban}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-brand-2" /> {t.admin.users.unban}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResetTarget(u);
                                setNewPass("");
                              }}
                            >
                              <KeyRound className="h-4 w-4" /> {t.admin.users.resetPassword}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => del(u.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4" /> {t.common.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t.admin.users.resetPassword} — {resetTarget?.fullName}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={t.admin.users.resetTo}
            dir="ltr"
            className="h-11 text-start"
          />
          <Button onClick={doReset} disabled={newPass.length < 8} className="w-full rounded-xl font-bold">
            {t.common.confirm}
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
