"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { MatchScoreRing, matchScoreLabel } from "@/components/common/match-score-ring";
import { SkillBadgeList } from "@/components/common/skill-badge-list";
import { useJobMatch } from "@/hooks/use-matches";
import { titleCase } from "@/lib/utils";

export function JobMatchPanel({ jobId }: { jobId: string }) {
  const { data: match, isLoading, isError } = useJobMatch(jobId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent-violet" /> AI Match Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : isError || !match ? (
          <p className="text-sm text-muted-foreground">We couldn&apos;t load your match score right now.</p>
        ) : match.candidateProfileStatus === "not_found" ? (
          <EmptyState
            icon={Sparkles}
            title="No AI profile yet"
            description="Apply to any job with your resume attached to unlock AI match scores across the platform."
          />
        ) : match.candidateProfileStatus === "pending" || match.candidateProfileStatus === "processing" ? (
          <p className="text-sm text-muted-foreground">
            Your resume is still being analyzed — match scores will appear here shortly.
          </p>
        ) : match.jobProfileStatus === "pending" || match.jobProfileStatus === "processing" ? (
          <p className="text-sm text-muted-foreground">
            This job&apos;s AI profile is still being generated — check back in a moment.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <MatchScoreRing score={match.matchScore} />
              <div>
                <p className="font-semibold text-foreground">{matchScoreLabel(match.matchScore)}</p>
                <p className="text-xs text-muted-foreground">Algorithm {match.matchingAlgorithmVersion}</p>
              </div>
            </div>

            {Object.keys(match.componentScores || {}).length > 0 && (
              <div className="space-y-2">
                {Object.entries(match.componentScores).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{titleCase(key.replace(/([A-Z])/g, " $1"))}</span>
                      <span className="font-medium text-foreground">{Math.round(value)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {match.matchedSkills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Matched skills</p>
                <SkillBadgeList skills={match.matchedSkills} variant="matched" />
              </div>
            )}
            {match.missingRequiredSkills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Missing skills</p>
                <SkillBadgeList skills={match.missingRequiredSkills} variant="missing" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
