export type AgentWorkflowStatus = "COMPLETED" | "PARTIAL" | "FAILED";
export type CareerActionPriority = "HIGH" | "MEDIUM" | "LOW";

export interface AgentPlanStep {
  action: string;
  status: "completed" | "failed" | "skipped";
  durationMs: number;
  error?: string | null;
}

export interface AgentReference {
  type: string;
  id: string | null;
}

export interface CareerActionPlanItem {
  priority: CareerActionPriority;
  action: string;
  reason: string;
  expectedImpact: string;
  relatedEntity: { type: string; id: string | null };
}

export interface AgentJobSummary {
  id: string;
  title: string;
  company: string;
  jobType?: string;
  workMode?: string | null;
  location?: string | null;
}

export interface AgentJobMatch {
  job: AgentJobSummary;
  matchScore: number;
  classification?: { level: string; label: string };
  matchedSkills: string[];
  missingRequiredSkills: string[];
}

export interface AgentSkillGap {
  category: string;
  item: string;
  priority: string;
  rank?: number;
  seenInJobs?: number;
}

export interface AgentWorkflowResult {
  candidateProfile?: { exists: boolean; status: string; skills: string[] };
  jobs?: { items: AgentJobMatch[]; total: number; usedSemanticRetrieval?: boolean };
  skillGaps?: {
    analyzed: number;
    gapsByJob: Array<{ jobId: string; jobTitle: string; company: string; matchScore: number; topGaps: AgentSkillGap[] }>;
    topGaps: AgentSkillGap[];
  };
  applications?: {
    total: number;
    active: number;
    needingAttention: Array<{ applicationId: string; jobId?: string; role?: string; priority: string; recommendedAction: string }>;
    averageMatchScore: number | null;
  };
  careerInsights?: { readiness: { score: number }; skillGaps: unknown[]; recommendations: unknown[] };
  interviewPrep?: {
    available: boolean;
    reason?: string;
    job?: { id: string; title: string; company: string };
    matchScore?: number;
    matchLevel?: { level: string; label: string };
    strengths?: string[];
    focusAreas?: AgentSkillGap[];
    responsibilities?: string[];
  };
}

export interface AgentWorkflow {
  workflowId: string;
  status: AgentWorkflowStatus;
  goal: string;
  targetRole: string | null;
  plan: AgentPlanStep[];
  result: AgentWorkflowResult;
  recommendedActions: CareerActionPlanItem[];
  summary: string;
  references: AgentReference[];
  createdAt: string;
}

export interface AgentWorkflowHistoryItem {
  _id: string;
  goal: string;
  targetRole: string | null;
  status: AgentWorkflowStatus;
  summary: string;
  createdAt: string;
}
