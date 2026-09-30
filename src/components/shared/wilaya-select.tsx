"use client";

import React, { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { WILAYAS, findWilayaByAr, wilayaLabel, type Wilaya } from "@/lib/wilayas";
import { cn } from "@/lib/utils";
import { ChevronDown, MapPin } from "lucide-react";

/* ============================================================
   WilayaSelect — searchable dropdown of the 69 official
   Algerian wilayas. Used at account creation, in the profile
   tab and anywhere a wilaya is picked.
   • Stored value = the Arabic name (canonical, DB-friendly)
   • Search matches Arabic AND French names + the code
   • Legacy free-text values are preserved as an extra option
     so no existing data is ever lost or hidden.
   ============================================================ */

export function WilayaSelect({
  value,
  onValueChange,
  placeholder,
  className,
  disabled,
  id,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => findWilayaByAr(value), [value]);
  const legacy = !!value && !selected;

  const options: Wilaya[] = useMemo(() => {
    // Keep official order (1 → 69)
    return WILAYAS;
  }, []);

  const triggerLabel = selected
    ? wilayaLabel(selected, lang)
    : legacy
      ? value
      : placeholder || t.common.wilayaPlaceholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl border-input bg-transparent px-3 font-semibold text-start",
            !selected && !legacy ? "text-muted-foreground" : "text-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const w = WILAYAS.find((x) => String(x.code) === itemValue);
            if (!w) return 0;
            const s = search.trim().toLowerCase();
            if (!s) return 1;
            const hay = `${w.code} ${w.ar} ${w.fr}`.toLowerCase();
            // subsequence-ish match across Arabic + French + code
            return hay.includes(s) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t.common.wilayaSearch} className="h-10" />
          <CommandList className="max-h-64">
            <CommandEmpty>{t.common.wilayaNotFound}</CommandEmpty>
            <CommandGroup>
              {legacy ? (
                <CommandItem
                  value={`legacy-${value}`}
                  onSelect={() => {
                    onValueChange(value);
                    setOpen(false);
                  }}
                  className="gap-2 text-muted-foreground"
                >
                  <span className="text-xs">•</span> {value}
                  <span className="ms-auto text-[10px] opacity-70">
                    {lang === "ar" ? "قيمة سابقة" : "valeur existante"}
                  </span>
                </CommandItem>
              ) : null}
              {options.map((w) => (
                <CommandItem
                  key={w.code}
                  value={String(w.code)}
                  onSelect={() => {
                    onValueChange(w.ar);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <span className="w-7 shrink-0 text-end text-[11px] font-bold tabular-nums text-muted-foreground">
                    {String(w.code).padStart(2, "0")}
                  </span>
                  <span className={cn("font-bold", "flex-1 truncate")}>
                    {lang === "ar" ? w.ar : w.fr}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {lang === "ar" ? w.fr : w.ar}
                  </span>
                  {selected?.code === w.code ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default WilayaSelect;
