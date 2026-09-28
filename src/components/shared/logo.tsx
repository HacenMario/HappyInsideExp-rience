"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCampInfo } from "@/components/shared/camp-info";

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const camp = useCampInfo();
  if (camp.logo) {
    // Custom logo uploaded from camp settings (base64 data URL)
    return (
      <img
        src={camp.logo}
        alt="Happy inside expérience"
        width={size}
        height={size}
        className={cn("rounded-xl object-cover", className)}
      />
    );
  }
  return (
    <Image
      src="/images/logo.png"
      alt="Happy inside expérience"
      width={size}
      height={size}
      className={cn("rounded-xl object-cover", className)}
      priority
    />
  );
}

export function LogoSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="logo-pulse">
          <LogoMark size={92} />
        </div>
        <div className="absolute -inset-6 -z-10 rounded-full bg-brand/15 blur-2xl" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="shimmer h-3 w-36 rounded-full" />
        <div className="shimmer h-2 w-24 rounded-full" />
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LogoSkeleton label={label} />
    </div>
  );
}
