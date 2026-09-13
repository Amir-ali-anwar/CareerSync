import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveListCard } from "@/components/common/interactive-list-card";
import { MatchScoreRing, matchScoreLabel } from "@/components/common/match-score-ring";
import { SkillBadgeList } from "@/components/common/skill-badge-list";
import { titleCase } from "@/lib/utils";
import type { Job } from "@/types/job";

interface MatchCardProps {
  job: Job;
  match?: Pick<import("@/types/match").MatchResult, "matchScore" | "matchedSkills" | "missingRequiredSkills">;
  isLoading: boolean;
}

export function MatchCard({ job, match, isLoading }: MatchCardProps) {
  return (
    <Link href={`/jobs/${job._id}`}>
      <InteractiveListCard>
        <CardContent className="flex gap-3.5">
          {isLoading ? (
            <Skeleton className="size-14 shrink-0 rounded-full" />
          ) : match ? (
            <MatchScoreRing score={match.matchScore} size={56} strokeWidth={5} />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
              N/A
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div>
              <p className="truncate text-base font-semibold text-foreground">{job.title || job.position}</p>
              <p className="truncate text-sm text-muted-foreground">{job.company}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {job.jobLocation.city}, {job.jobLocation.country}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="size-3.5" />
                {titleCase(job.jobType)}
              </span>
              {match && <span className="font-medium text-foreground">{matchScoreLabel(match.matchScore)}</span>}
            </div>
            {match && match.matchedSkills.length > 0 && (
              <SkillBadgeList skills={match.matchedSkills} variant="matched" limit={4} />
            )}
            {match && match.missingRequiredSkills.length > 0 && (
              <SkillBadgeList skills={match.missingRequiredSkills} variant="missing" limit={3} />
            )}
          </div>
        </CardContent>
      </InteractiveListCard>
    </Link>
  );
}
