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
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  violet: "bg-accent-violet/10 text-accent-violet",
};

const ACCENT_GLOW: Record<NonNullable<MetricItemProps["accent"]>, string> = {
  primary: "from-primary/10",
  success: "from-success/10",
  warning: "from-warning/10",
  violet: "from-accent-violet/10",
};

/** Responsive grid of individually-elevated stat cards - the dashboard's one "showcase" grid. */
export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export function MetricItem({ label, value, icon: Icon, accent = "primary", className }: MetricItemProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-4.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-2xl transition-opacity group-hover:opacity-100",
          ACCENT_GLOW[accent]
        )}
      />
      <div className="relative flex items-center gap-3.5">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", ACCENT_STYLES[accent])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
