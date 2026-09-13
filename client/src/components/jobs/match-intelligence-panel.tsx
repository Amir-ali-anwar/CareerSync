"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillBadgeList } from "@/components/common/skill-badge-list";
import { useJobMatchExplanation } from "@/hooks/use-matches";
import { useSkillGap } from "@/hooks/use-jobs";

export function MatchIntelligencePanel({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const explanationQuery = useJobMatchExplanation(jobId, open);
  const skillGapQuery = useSkillGap(jobId, open);
  const explanation = explanationQuery.data;
  const gapAnalysis = skillGapQuery.data;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          Why you match
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </Button>

      {open && (
        <div className="space-y-4">
          {explanationQuery.isLoading || skillGapQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : explanationQuery.isError || skillGapQuery.isError ? (
            <p className="text-sm text-muted-foreground">Match insights are temporarily unavailable.</p>
          ) : explanation && gapAnalysis ? (
            <>
              <p className="text-sm leading-relaxed text-foreground">{explanation.summary}</p>

              {explanation.strengths.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                  <ul className="space-y-1.5 text-sm">
                    {explanation.strengths.slice(0, 4).map((strength) => (
                      <li key={`${strength.category}-${strength.message}`} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                        {strength.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {explanation.matchedSkills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Skills you match</p>
                  <SkillBadgeList skills={explanation.matchedSkills.map((item) => item.skill)} variant="matched" />
                </div>
              )}

              {explanation.missingSkills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Skills to improve</p>
                  <SkillBadgeList skills={explanation.missingSkills.map((item) => item.skill)} variant="missing" />
                </div>
              )}

              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <p className="text-sm font-medium">Career roadmap</p>
                  <Badge variant="secondary" className="ml-auto">
                    {gapAnalysis.summary.totalGaps} gap{gapAnalysis.summary.totalGaps === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{gapAnalysis.summary.message}</p>
                {gapAnalysis.prioritizedRoadmap.length > 0 && (
                  <ol className="mt-3 space-y-2">
                    {gapAnalysis.prioritizedRoadmap.slice(0, 4).map((item) => (
                      <li key={`${item.rank}-${item.item}`} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{item.rank}.</span>
                        <span className="flex-1">{item.item}</span>
                        <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>{item.priority}</Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
