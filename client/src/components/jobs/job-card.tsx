import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InteractiveListCard } from "@/components/common/interactive-list-card";
import { SkillBadgeList } from "@/components/common/skill-badge-list";
import { formatRelativeDate, formatSalary, titleCase } from "@/lib/utils";
import type { Job } from "@/types/job";

export function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salaryRange?.min, job.salaryRange?.max, job.salaryRange?.currency);
  const skills = [...(job.requiredSkills || []), ...(job.preferredSkills || [])];

  return (
    <Link href={`/jobs/${job._id}`}>
      <InteractiveListCard>
        <CardContent className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{job.title || job.position}</p>
              <p className="truncate text-sm text-muted-foreground">{job.company}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeDate(job.createdAt)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {job.jobLocation.city}, {job.jobLocation.country}
              {job.workMode ? ` · ${titleCase(job.workMode)}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="size-3.5" />
              {titleCase(job.jobType)}
            </span>
            {salary && <Badge variant="secondary">{salary}</Badge>}
          </div>

          {skills.length > 0 && <SkillBadgeList skills={skills} limit={5} />}
        </CardContent>
      </InteractiveListCard>
    </Link>
  );
}
