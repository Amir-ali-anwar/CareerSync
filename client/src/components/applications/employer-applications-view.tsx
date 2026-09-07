"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { SimplePagination } from "@/components/common/simple-pagination";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { useUpdateApplicationStatus } from "@/hooks/use-applications";
import { useExportTalentApplications, useTalents } from "@/hooks/use-talents";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { formatDate, initials } from "@/lib/utils";
import { MUTABLE_APPLICATION_STATUSES, type ApplicationStatus, type ApplicationTalent } from "@/types/application";
import { ApiError } from "@/types/api";
import { toast } from "sonner";

export function EmployerApplicationsView() {
  usePageHeader("Applications", "Every candidate who applied to your job postings.");
  const [page, setPage] = useState(1);
  const talentsQuery = useTalents(page, 20);
  const updateStatus = useUpdateApplicationStatus();
  const exportCsv = useExportTalentApplications();

  const applications = talentsQuery.data?.applications || [];

  function handleStatusChange(jobId: string, applicantId: string, status: ApplicationStatus) {
    if (!applicantId) return;
    updateStatus.mutate(
      { jobId, applicantId, status },
      {
        onError: (error) => {
          if (error instanceof ApiError) toast.error(error.message);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <MobilePageHeader />
        <Button
          variant="outline"
          className="md:ml-auto"
          onClick={() => exportCsv.mutate()}
          disabled={exportCsv.isPending || applications.length === 0}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {talentsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : talentsQuery.isError ? (
        <ErrorState error={talentsQuery.error} onRetry={() => talentsQuery.refetch()} />
      ) : applications.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet" description="Applicants across all your jobs will appear here." />
      ) : (
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="w-40">Update status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => {
                    const talent = typeof application.talent === "string" ? null : (application.talent as ApplicationTalent);
                    const jobId = typeof application.job === "string" ? application.job : application.job._id;
                    return (
                      <TableRow key={application._id}>
                        <TableCell>
                          <Link href={talent ? `/talents/${talent._id}` : "#"} className="flex items-center gap-2.5 hover:underline">
                            <Avatar className="size-7 shrink-0">
                              <AvatarFallback className="bg-primary-light text-xs font-medium text-primary">
                                {talent?.name ? initials(talent.name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            {talent?.name || "Applicant"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{application.Jobtitle}</TableCell>
                        <TableCell>
                          <ApplicationStatusBadge status={application.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(application.appliedAt)}</TableCell>
                        <TableCell>
                          <Select
                            value={application.status}
                            disabled={application.status === "withdrawn"}
                            onValueChange={(status) =>
                              handleStatusChange(jobId, talent?._id || "", status as ApplicationStatus)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {application.status === "withdrawn" && (
                                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                              )}
                              {MUTABLE_APPLICATION_STATUSES.map((status) => (
                                <SelectItem key={status} value={status} className="capitalize">
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {talentsQuery.data && (
              <SimplePagination
                page={talentsQuery.data.currentPage}
                numOfPages={talentsQuery.data.numOfPages}
                onPageChange={setPage}
              />
            )}
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanBoard applications={applications} onStatusChange={handleStatusChange} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
