"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Target,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecuteAgentWorkflow, useAgentWorkflowHistory } from "@/hooks/use-agent";
import { cn } from "@/lib/utils";
import type { AgentWorkflow, CareerActionPriority } from "@/types/agent";

const SUGGESTED_GOALS = [
  "Find the best jobs for me",
  "What should I focus on today?",
  "Analyze my skill gaps",
  "Build my career strategy",
  "Analyze my applications",
  "Help me prepare for an interview",
];

const THREAD_ID = "dashboard-career-agent";

function priorityTone(priority: CareerActionPriority) {
  if (priority === "HIGH") return "text-error";
  if (priority === "MEDIUM") return "text-warning";
  return "text-muted-foreground";
}

function StepRow({ action, status }: { action: string; status: string }) {
  const label = action
    .toLowerCase()
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
  const icon =
    status === "completed" ? (
      <CheckCircle2 className="size-4 shrink-0 text-success" />
    ) : status === "failed" ? (
      <XCircle className="size-4 shrink-0 text-error" />
    ) : (
      <Circle className="size-4 shrink-0 text-muted-foreground" />
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className={cn(status === "failed" && "text-muted-foreground line-through")}>{label}</span>
    </div>
  );
}

function relatedEntityHref(type: string, id: string | null) {
  if (!id) return type === "candidate_profile" ? "/profile" : "/copilot";
  if (type === "job") return `/jobs/${id}`;
  if (type === "application") return "/applications";
  return "/copilot";
}

function WorkflowResult({ workflow }: { workflow: AgentWorkflow }) {
  const { result } = workflow;
  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-xl border border-border p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Workflow steps</p>
        <div className="space-y-1.5">
          {workflow.plan.map((step) => (
            <StepRow key={step.action} action={step.action} status={step.status} />
          ))}
        </div>
        {workflow.status === "PARTIAL" && (
          <p className="pt-1 text-xs text-warning">
            Some steps could not complete. The results below reflect only what succeeded.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm leading-relaxed">{workflow.summary}</p>
      </div>

      {workflow.recommendedActions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Recommended actions</p>
          {workflow.recommendedActions.map((item, index) => (
            <Link
              key={`${item.action}-${index}`}
              href={relatedEntityHref(item.relatedEntity.type, item.relatedEntity.id)}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.action}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
              </div>
              <span className={cn("shrink-0 text-xs font-semibold", priorityTone(item.priority))}>{item.priority}</span>
            </Link>
          ))}
        </div>
      )}

      {result.jobs && result.jobs.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Top matched jobs</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.jobs.items.slice(0, 4).map((item) => (
              <Link
                key={item.job.id}
                href={`/jobs/${item.job.id}`}
                className="rounded-lg border border-border p-3 transition-colors hover:bg-surface"
              >
                <p className="truncate text-sm font-medium">{item.job.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.job.company}</p>
                <p className="mt-1 font-mono text-xs text-primary">{item.matchScore}% match</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {result.skillGaps && result.skillGaps.topGaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Skill gaps to close</p>
          <div className="flex flex-wrap gap-2">
            {result.skillGaps.topGaps.map((gap) => (
              <Badge key={gap.item} variant="outline">
                {gap.item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {result.interviewPrep?.available && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Interview preparation</p>
          <p className="text-sm font-medium">
            {result.interviewPrep.job?.title} at {result.interviewPrep.job?.company}
          </p>
          <p className="text-xs text-muted-foreground">{result.interviewPrep.matchScore}% match</p>
          {result.interviewPrep.focusAreas && result.interviewPrep.focusAreas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Focus areas: {result.interviewPrep.focusAreas.map((gap) => gap.item).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CareerAgentPanel() {
  const [goal, setGoal] = useState("");
  const executeWorkflow = useExecuteAgentWorkflow();
  const historyQuery = useAgentWorkflowHistory();
  const workflow = executeWorkflow.data;

  const history = useMemo(() => historyQuery.data?.slice(0, 5) ?? [], [historyQuery.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = goal.trim();
    if (!trimmed || executeWorkflow.isPending) return;
    executeWorkflow.mutate({ goal: trimmed, threadId: THREAD_ID });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="min-h-[520px]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <WandSparkles className="size-4 text-primary" /> Career Agent
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Give it a career goal - it plans and runs a multi-step workflow across your matches, skill gaps, and
            applications, then returns a prioritized action plan.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!workflow && !executeWorkflow.isPending && (
            <div className="rounded-xl bg-surface p-5">
              <p className="text-sm leading-relaxed text-foreground">
                Try one of these, or describe your own goal below.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTED_GOALS.map((prompt) => (
                  <Button key={prompt} type="button" size="sm" variant="outline" onClick={() => setGoal(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {executeWorkflow.isPending && (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Running your career workflow...
              </div>
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}

          {executeWorkflow.isError && (
            <p className="text-sm text-error">The career agent could not complete that request. Try again.</p>
          )}

          {!executeWorkflow.isPending && workflow && <WorkflowResult workflow={workflow} />}

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-border pt-4">
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Describe a career goal..."
              aria-label="Career goal"
            />
            <Button type="submit" size="icon" disabled={!goal.trim() || executeWorkflow.isPending} aria-label="Run career agent">
              <ArrowUpRight className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" /> Recent workflows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run a workflow to see its history here.</p>
            ) : (
              history.map((item) => (
                <div key={item._id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{item.goal.replaceAll("_", " ")}</p>
                    <Sparkles className="size-3.5 shrink-0 text-primary" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
