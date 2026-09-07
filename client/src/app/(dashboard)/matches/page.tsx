"use client";

import { RoleGuard } from "@/components/common/role-guard";
import { MatchesView } from "@/components/matches/matches-view";

export default function MatchesPage() {
  return (
    <RoleGuard role="talent">
      <MatchesView />
    </RoleGuard>
  );
}
