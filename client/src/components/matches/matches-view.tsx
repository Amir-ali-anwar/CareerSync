"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SimplePagination } from "@/components/common/simple-pagination";
import { MatchCard } from "@/components/matches/match-card";
import { useMyMatches } from "@/hooks/use-candidate-profile";
import { useSeedJobCache } from "@/hooks/use-jobs";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";

const MIN_SCORE_OPTIONS = [
  { value: "0", label: "All matches" },
  { value: "40", label: "Fair and above" },
  { value: "60", label: "Strong and above" },
  { value: "80", label: "Excellent only" },
];

export function MatchesView() {
  usePageHeader("AI Matches", "Every open job, ranked by how well it matches your profile.");
  const [page, setPage] = useState(1);
  const [minScore, setMinScore] = useState("0");

  const matchesQuery = useMyMatches({ page, limit: 10, minScore: Number(minScore) });
  useSeedJobCache(matchesQuery.data?.matches.map((m) => m.job));

  const matches = matchesQuery.data?.matches || [];
  const noProfile = matchesQuery.data?.candidateProfileStatus === "not_found";

  return (
    <div className="space-y-6">
      <MobilePageHeader />

      <Select
        value={minScore}
        onValueChange={(v) => {
          setMinScore(v ?? "0");
          setPage(1);
        }}
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MIN_SCORE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {noProfile && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          You haven&apos;t applied to a job yet, so match scores aren&apos;t available. Apply to any job with your
          resume, or fill in your profile, to unlock AI matching.
        </div>
      )}

      {matchesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : matchesQuery.isError ? (
        <ErrorState error={matchesQuery.error} onRetry={() => matchesQuery.refetch()} />
      ) : matches.length === 0 ? (
        <EmptyState icon={Sparkles} title="No matches yet" description="Try lowering the minimum score filter." />
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.job._id} job={match.job} match={match} isLoading={false} />
          ))}
        </div>
      )}

      {matchesQuery.data && (
        <SimplePagination
          page={matchesQuery.data.currentPage}
          numOfPages={matchesQuery.data.numOfPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
