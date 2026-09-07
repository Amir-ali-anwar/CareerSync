"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MUTABLE_APPLICATION_STATUSES, type ApplicationStatus, type ApplicationTalent, type JobApplication } from "@/types/application";
import { titleCase } from "@/lib/utils";

interface KanbanBoardProps {
  applications: JobApplication[];
  onStatusChange: (jobId: string, applicantId: string, status: ApplicationStatus) => void;
}

const COLUMNS: ApplicationStatus[] = [...MUTABLE_APPLICATION_STATUSES, "withdrawn"];

export function KanbanBoard({ applications, onStatusChange }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {COLUMNS.map((status) => {
        const columnApps = applications.filter((app) => app.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (status === "withdrawn") return;
              e.preventDefault();
              setDragOverColumn(status);
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              if (status === "withdrawn") return;
              const jobId = e.dataTransfer.getData("jobId");
              const applicantId = e.dataTransfer.getData("applicantId");
              if (jobId && applicantId) onStatusChange(jobId, applicantId, status);
            }}
            className={cn(
              "w-64 shrink-0 rounded-xl border border-border bg-surface p-2.5",
              dragOverColumn === status && "border-primary bg-primary-light"
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold tracking-wide text-foreground capitalize">{status}</p>
              <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {columnApps.length}
              </span>
            </div>
            <div className="space-y-2">
              {columnApps.map((app) => {
                const talent = typeof app.talent === "string" ? null : (app.talent as ApplicationTalent);
                const jobId = typeof app.job === "string" ? app.job : app.job._id;
                return (
                  <div
                    key={app._id}
                    draggable={status !== "withdrawn"}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("jobId", jobId);
                      e.dataTransfer.setData("applicantId", talent?._id || "");
                    }}
                    className="cursor-grab space-y-2 rounded-lg border border-border bg-card p-2.5 active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6 shrink-0">
                        <AvatarFallback className="bg-primary-light text-[10px] font-medium text-primary">
                          {talent?.name ? initials(talent.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={talent ? `/talents/${talent._id}` : "#"}
                        className="truncate text-xs font-medium text-foreground hover:underline"
                      >
                        {talent?.name || "Applicant"}
                      </Link>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {app.Jobtitle} · {titleCase(app.experienceLevel)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
