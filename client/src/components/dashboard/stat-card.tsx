import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItemProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "violet";
  className?: string;
}

const ACCENT_STYLES: Record<NonNullable<MetricItemProps["accent"]>, string> = {
  primary: "bg-primary-light text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  violet: "bg-accent-violet/10 text-accent-violet",
};

/** Compact horizontal metric strip - replaces the old one-huge-card-per-metric pattern. */
export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid divide-y divide-border rounded-xl border border-border bg-card sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MetricItem({ label, value, icon: Icon, accent = "primary", className }: MetricItemProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", ACCENT_STYLES[accent])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-lg font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}
