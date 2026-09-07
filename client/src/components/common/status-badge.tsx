import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/application";
import type { AiProcessingStatus } from "@/types/job";

const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-secondary text-muted-foreground",
  "under review": "bg-warning/10 text-warning",
  shortlisted: "bg-primary-light text-primary",
  interview: "bg-accent-violet/10 text-accent-violet",
  rejected: "bg-error/10 text-error",
  withdrawn: "bg-secondary text-muted-foreground line-through decoration-1",
};

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        APPLICATION_STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const PROCESSING_STATUS_STYLES: Record<AiProcessingStatus, string> = {
  pending: "bg-secondary text-muted-foreground",
  processing: "bg-primary-light text-primary animate-pulse",
  completed: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
};

const PROCESSING_STATUS_LABELS: Record<AiProcessingStatus, string> = {
  pending: "Queued",
  processing: "Processing",
  completed: "Ready",
  failed: "Failed",
};

export function ProcessingStatusBadge({
  status,
  className,
}: {
  status: AiProcessingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        PROCESSING_STATUS_STYLES[status],
        className
      )}
    >
      {PROCESSING_STATUS_LABELS[status]}
    </span>
  );
}
