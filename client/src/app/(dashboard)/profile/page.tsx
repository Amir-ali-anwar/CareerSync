"use client";

import { UserCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Loading } from "@/components/common/loading";
import { RoleGuard } from "@/components/common/role-guard";
import { ResumeUploadCard } from "@/components/profile/resume-upload-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { isProfileNotFound, useCandidateProfile } from "@/hooks/use-candidate-profile";

function profileStrength(profile: {
  skills: string[];
  yearsOfExperience?: number;
  education: unknown[];
  certifications: string[];
  processingStatus: string;
} | undefined) {
  if (!profile) return 0;
  const checks = [
    (profile.skills || []).length > 0,
    profile.yearsOfExperience !== undefined,
    (profile.education || []).length > 0,
    (profile.certifications || []).length > 0,
    profile.processingStatus === "completed",
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

function ProfileContent() {
  const profileQuery = useCandidateProfile();
  usePageHeader("Profile", "Your resume and preferences power AI matching and semantic search.");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MobilePageHeader />
      {profileQuery.data && (
        <div className="w-full space-y-1.5 sm:w-64">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profile Completeness</span>
            <span className="font-mono font-medium text-foreground">{profileStrength(profileQuery.data)}%</span>
          </div>
          <Progress value={profileStrength(profileQuery.data)} />
        </div>
      )}

      <ResumeUploadCard />

      {profileQuery.isLoading ? (
        <Loading label="Loading your profile…" />
      ) : profileQuery.isError && !isProfileNotFound(profileQuery.error) ? (
        <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
      ) : isProfileNotFound(profileQuery.error) ? (
        <EmptyState
          icon={UserCircle}
          title="No profile yet"
          description="Upload your resume above, or start filling in your skills and preferences below - either one creates your profile."
        />
      ) : null}

      <ProfileForm />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RoleGuard role="talent">
      <ProfileContent />
    </RoleGuard>
  );
}
