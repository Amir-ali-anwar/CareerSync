"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/common/error-state";
import { Loading } from "@/components/common/loading";
import { RoleGuard } from "@/components/common/role-guard";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { useTalent } from "@/hooks/use-talents";
import { useDownloadCv, useUpdateApplicationStatus } from "@/hooks/use-applications";
import { usePageHeader } from "@/providers/page-header-provider";
import { formatDate, initials } from "@/lib/utils";
import { MUTABLE_APPLICATION_STATUSES, type ApplicationStatus, type ApplicationTalent } from "@/types/application";
import { ApiError } from "@/types/api";
import { toast } from "sonner";

export default function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role="employer">
      <TalentDetail params={params} />
    </RoleGuard>
  );
}

function TalentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const talentQuery = useTalent(id);
  const updateStatus = useUpdateApplicationStatus();
  const downloadCv = useDownloadCv();

  const previewTalent = talentQuery.data
    ?.map((app) => (typeof app.talent === "string" ? null : (app.talent as ApplicationTalent)))
    .find(Boolean);
  usePageHeader(previewTalent?.name || "Candidate");

  if (talentQuery.isLoading) return <Loading label="Loading candidate…" />;
  if (talentQuery.isError || !talentQuery.data || talentQuery.data.length === 0) {
    return <ErrorState error={talentQuery.error} onRetry={() => talentQuery.refetch()} />;
  }

  const applications = talentQuery.data;
  const talent = applications
    .map((app) => (typeof app.talent === "string" ? null : (app.talent as ApplicationTalent)))
    .find(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to applications
      </Link>

      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary-light text-base font-medium text-primary">
            {talent?.name ? initials(talent.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold text-foreground md:hidden">{talent?.name || "Candidate"}</h1>
          <p className="text-sm text-muted-foreground">
            {talent?.email} {talent?.phone ? `· ${talent.phone}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications to your jobs ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.map((application) => {
            const jobId = typeof application.job === "string" ? application.job : application.job._id;
            return (
              <div
                key={application._id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{application.Jobtitle}</p>
                  <p className="text-xs text-muted-foreground">Applied {formatDate(application.appliedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => downloadCv.mutate(application._id)}
                    aria-label="Download CV"
                  >
                    <Download className="size-4" />
                  </Button>
                  <Select
                    value={application.status}
                    disabled={application.status === "withdrawn"}
                    onValueChange={(status) =>
                      updateStatus.mutate(
                        { jobId, applicantId: talent?._id || "", status: status as ApplicationStatus },
                        {
                          onError: (error) => {
                            if (error instanceof ApiError) toast.error(error.message);
                          },
                        }
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {application.status === "withdrawn" && <SelectItem value="withdrawn">Withdrawn</SelectItem>}
                      {MUTABLE_APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ApplicationStatusBadge status={application.status} className="hidden sm:inline-flex" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
