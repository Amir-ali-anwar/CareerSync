import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  size?: number;
  className?: string;
}

export function Logo({ variant = "full", size = 28, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="cs-logo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <path
          d="M29 9.27 14.08 7.31 6 20 14.08 32.69 29 30.73"
          stroke="url(#cs-logo-grad)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx={29} cy={9.27} r={2.6} fill="url(#cs-logo-grad)" />
        <circle cx={14.08} cy={7.31} r={2.2} fill="url(#cs-logo-grad)" />
        <circle cx={6} cy={20} r={2.6} fill="url(#cs-logo-grad)" />
        <circle cx={14.08} cy={32.69} r={2.2} fill="url(#cs-logo-grad)" />
        <circle cx={29} cy={30.73} r={2.6} fill="url(#cs-logo-grad)" />
        <path
          d="M23 26.5V17.3M17.4 18.6 23 11.5l5.6 7.1"
          stroke="url(#cs-logo-grad)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {variant === "full" && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Career<span className="text-indigo-500">Sync</span>
        </span>
      )}
    </span>
  );
}
