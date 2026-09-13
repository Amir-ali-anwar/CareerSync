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

 /** Compact metric rail for top-level counts and progress indicators. */
 export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
   return <div className={cn("grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export function MetricItem({ label, value, icon: Icon, accent = "primary", className }: MetricItemProps) {
  return (
    <div
      className={cn(
        "bg-card p-4 transition-colors hover:bg-surface",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", ACCENT_STYLES[accent])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
