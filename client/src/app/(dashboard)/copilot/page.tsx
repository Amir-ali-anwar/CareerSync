"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, Sparkles, Target, WandSparkles } from "lucide-react";
import { RoleGuard } from "@/components/common/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/common/error-state";
import { CareerAgentPanel } from "@/components/agent/career-agent-panel";
import { useCareerCopilotQuery, useCareerInsights } from "@/hooks/use-copilot";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Which applications need follow-up?",
  "What are my biggest skill gaps?",
  "Which jobs should I apply to?",
  "How ready is my profile?",
];

function CopilotQAPanel() {
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const insightsQuery = useCareerInsights();
  const copilotQuery = useCareerCopilotQuery();
  const insights = insightsQuery.data;

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || copilotQuery.isPending) return;
    setQuestion(trimmed);
    setMessage("");
    copilotQuery.mutate(trimmed);
  }

  return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-h-[520px]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <WandSparkles className="size-4 text-primary" /> Career Copilot
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ask about applications, job priorities, skill gaps, or profile readiness.</p>
          </CardHeader>
          <CardContent className="flex min-h-[430px] flex-col justify-between gap-6 pt-6">
            <div className="space-y-5">
              {!question && !copilotQuery.data && (
                <div className="rounded-xl bg-surface p-5">
                  <p className="text-sm leading-relaxed text-foreground">
                    I use your CareerSync data to answer career questions. I will tell you when the available data is not enough.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Button key={prompt} type="button" size="sm" variant="outline" onClick={() => setMessage(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {question && (
                <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                  {question}
                </div>
              )}
              {copilotQuery.isPending && (
                <div className="max-w-[85%] space-y-2 rounded-xl border border-border p-4">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              )}
              {copilotQuery.isError && <p className="text-sm text-error">I couldn&apos;t retrieve grounded career guidance right now.</p>}
              {!copilotQuery.isPending && copilotQuery.data && (
                <div className="max-w-[90%] space-y-4 rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm leading-relaxed">{copilotQuery.data.answer}</p>
                  {copilotQuery.data.insights.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      {copilotQuery.data.insights.map((item) => (
                        <p key={`${item.type}-${item.text}`} className="flex gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> {item.text}
                        </p>
                      ))}
                    </div>
                  )}
                  {copilotQuery.data.references.some((reference) => reference.jobId) && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      {copilotQuery.data.references.map((reference) => (
                        <Button
                          key={`${reference.type}-${reference.jobId || reference.applicationId || reference.skill}`}
                          size="sm"
                          variant="outline"
                          render={<Link href={reference.jobId ? `/jobs/${reference.jobId}` : reference.applicationId ? "/applications" : "/profile"} />}
                        >
                          {reference.jobId ? "View related job" : reference.applicationId ? "View applications" : "View profile"} <ArrowUpRight className="size-3.5" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 border-t border-border pt-4">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Ask a grounded career question..."
                aria-label="Career Copilot question"
              />
              <Button type="submit" size="icon" disabled={!message.trim() || copilotQuery.isPending} aria-label="Send question">
                <ArrowUpRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {insightsQuery.isLoading ? (
            <Card><CardContent className="space-y-3 pt-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
          ) : insightsQuery.isError ? (
            <ErrorState error={insightsQuery.error} onRetry={() => insightsQuery.refetch()} />
          ) : insights ? (
            <>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-4 text-primary" /> Career readiness</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2"><span className="font-mono text-4xl font-semibold tabular-nums">{insights.readiness.score}</span><span className="pb-1 text-sm text-muted-foreground">/ 100</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${insights.readiness.score}%` }} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">Profile completeness indicator, not an outcome prediction.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /> Needs attention</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {insights.applications.needingAttention.length === 0 ? <p className="text-sm text-muted-foreground">No applications need attention right now.</p> : insights.applications.needingAttention.slice(0, 3).map((item) => (
                    <Link key={item.applicationId} href={item.jobId ? `/jobs/${item.jobId}` : "/applications"} className="block rounded-lg border border-border p-3 transition-colors hover:bg-surface">
                      <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{item.role || "Application"}</p><span className={cn("text-xs font-medium", item.priority === "high" ? "text-error" : "text-warning")}>{item.priority}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.recommendedAction}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Skill gaps</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {insights.skillGaps.length === 0 ? <p className="text-sm text-muted-foreground">No recurring gaps found in the evaluated applications.</p> : insights.skillGaps.slice(0, 4).map((gap) => <div key={gap.skill} className="flex items-center justify-between gap-3 text-sm"><span>{gap.skill}</span><span className="font-mono text-xs text-muted-foreground">{gap.frequency}%</span></div>)}
                </CardContent>
              </Card>
            </>
          ) : null}
        </aside>
      </div>
  );
}

function CopilotContent() {
  usePageHeader("Career Copilot", "Grounded guidance and an agentic career workflow engine built on your CareerSync data.");
  return (
    <div className="space-y-6">
      <MobilePageHeader />
      <Tabs defaultValue="agent">
        <TabsList>
          <TabsTrigger value="agent">Career Agent</TabsTrigger>
          <TabsTrigger value="ask">Ask Copilot</TabsTrigger>
        </TabsList>
        <TabsContent value="agent" className="mt-4">
          <CareerAgentPanel />
        </TabsContent>
        <TabsContent value="ask" className="mt-4">
          <CopilotQAPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CopilotPage() {
  return <RoleGuard role="talent"><CopilotContent /></RoleGuard>;
}
