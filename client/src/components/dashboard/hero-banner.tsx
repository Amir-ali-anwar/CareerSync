import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  stat?: { label: string; value: string | number };
  action?: React.ReactNode;
  className?: string;
}

/** Gradient hero surface for dashboard landing views - the one "elevated" panel per page. */
export function HeroBanner({ eyebrow, title, description, icon: Icon, stat, action, className }: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent-violet px-6 py-7 text-primary-foreground shadow-lg shadow-primary/20 sm:px-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 size-64 rounded-full bg-black/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="size-6" />
          </div>
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">{eyebrow}</p>
            )}
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            <p className="mt-1 max-w-md text-sm text-white/80">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {stat && (
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="font-mono text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-white/70">{stat.label}</p>
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}
