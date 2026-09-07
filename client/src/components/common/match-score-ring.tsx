import { cn } from "@/lib/utils";

interface MatchScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

function bandFor(score: number) {
  if (score >= 80) return { color: "var(--success)", label: "Excellent Match" };
  if (score >= 60) return { color: "var(--primary)", label: "Strong Match" };
  if (score >= 40) return { color: "var(--warning)", label: "Fair Match" };
  return { color: "var(--error)", label: "Weak Match" };
}

export function matchScoreLabel(score: number) {
  return bandFor(score).label;
}

export function MatchScoreRing({
  score,
  size = 72,
  strokeWidth = 6,
  className,
  showLabel = false,
}: MatchScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const { color, label } = bandFor(clamped);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-mono font-semibold tabular-nums text-foreground",
              size < 60 ? "text-xs" : "text-lg"
            )}
          >
            {clamped}%
          </span>
        </div>
      </div>
      {showLabel && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}
