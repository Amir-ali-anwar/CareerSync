import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillBadgeListProps {
  skills: string[];
  variant?: "default" | "matched" | "missing";
  limit?: number;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<SkillBadgeListProps["variant"]>, string> = {
  default: "bg-secondary text-foreground",
  matched: "bg-success/10 text-success",
  missing: "bg-error/10 text-error",
};

export function SkillBadgeList({ skills, variant = "default", limit, className }: SkillBadgeListProps) {
  if (!skills || skills.length === 0) return null;
  const visible = limit ? skills.slice(0, limit) : skills;
  const remaining = limit && skills.length > limit ? skills.length - limit : 0;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((skill) => (
        <Badge key={skill} variant="outline" className={cn("border-transparent font-normal", VARIANT_STYLES[variant])}>
          {skill}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="border-transparent bg-secondary font-normal text-muted-foreground">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
