// Phase 9 - CareerActionPlan. Deterministic aggregation over whatever step results the
// executor actually produced (never invents an entity that isn't in `results` - Phase
// 12's guardrail). Every item names Priority/Action/Reason/Expected Impact/Related
// Entity, straight off already-computed evidence: match classification (Module G),
// skill-gap priority (Module H), and application health (Module I) - no new scoring.
const PRIORITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const priorityForMatchLevel = (level) => {
  if (level === "excellent_match" || level === "strong_match") return "HIGH";
  if (level === "moderate_match") return "MEDIUM";
  return "LOW";
};

const impactForPriority = (priority) => (priority === "HIGH" ? "High" : priority === "MEDIUM" ? "Medium" : "Low");

const buildJobActions = (searchJobsResult) => {
  if (!searchJobsResult?.items?.length) return [];
  return searchJobsResult.items.slice(0, 3).map((item) => {
    const priority = priorityForMatchLevel(item.classification?.level);
    return {
      priority,
      action: `Apply to ${item.job.title || "this role"} at ${item.job.company || "this company"}`,
      reason: `${item.matchScore}% match (${item.classification?.label || "match"}).`,
      expectedImpact: impactForPriority(priority),
      relatedEntity: { type: "job", id: item.job.id },
    };
  });
};

const buildSkillActions = (analyzeSkillsResult) => {
  if (!analyzeSkillsResult?.topGaps?.length) return [];
  return analyzeSkillsResult.topGaps.slice(0, 3).map((gap) => ({
    priority: gap.priority === "high" ? "HIGH" : gap.priority === "medium" ? "MEDIUM" : "LOW",
    action: `Build experience with ${gap.item}`,
    reason: `Appears as a ${gap.priority}-priority gap across ${gap.seenInJobs} of your top matched job${gap.seenInJobs === 1 ? "" : "s"}.`,
    expectedImpact: impactForPriority(gap.priority === "high" ? "HIGH" : gap.priority === "medium" ? "MEDIUM" : "LOW"),
    relatedEntity: { type: "skill", id: gap.item },
  }));
};

const buildApplicationActions = (analyzeApplicationsResult) => {
  if (!analyzeApplicationsResult?.needingAttention?.length) return [];
  return analyzeApplicationsResult.needingAttention.slice(0, 3).map((item) => ({
    priority: item.priority === "high" ? "HIGH" : item.priority === "medium" ? "MEDIUM" : "LOW",
    action: item.recommendedAction,
    reason: item.reason,
    expectedImpact: impactForPriority(item.priority === "high" ? "HIGH" : item.priority === "medium" ? "MEDIUM" : "LOW"),
    relatedEntity: { type: "application", id: item.applicationId },
  }));
};

const buildReadinessAction = (careerInsightsResult) => {
  const score = careerInsightsResult?.readiness?.score;
  if (score === undefined || score === null || score >= 80) return [];
  return [
    {
      priority: score < 50 ? "HIGH" : "MEDIUM",
      action: "Complete your CareerSync profile",
      reason: `Your profile completeness score is ${score}/100.`,
      expectedImpact: score < 50 ? "High" : "Medium",
      relatedEntity: { type: "candidate_profile", id: null },
    },
  ];
};

const buildInterviewAction = (prepareInterviewResult) => {
  if (!prepareInterviewResult?.available) return [];
  return [
    {
      priority: "HIGH",
      action: `Prepare for your ${prepareInterviewResult.job.title} interview at ${prepareInterviewResult.job.company}`,
      reason: `${prepareInterviewResult.matchScore}% match; ${prepareInterviewResult.focusAreas.length} focus area(s) identified.`,
      expectedImpact: "High",
      relatedEntity: { type: "job", id: prepareInterviewResult.job.id },
    },
  ];
};

const MAX_ACTION_PLAN_ITEMS = 8;

/**
 * @param {Record<string, any>} results - keyed by CAREER_ACTIONS name, whatever the
 *   executor successfully completed (failed/skipped steps are simply absent).
 */
const buildCareerActionPlan = (results) => {
  const items = [
    ...buildInterviewAction(results.PREPARE_INTERVIEW),
    ...buildApplicationActions(results.ANALYZE_APPLICATIONS),
    ...buildJobActions(results.SEARCH_JOBS),
    ...buildSkillActions(results.ANALYZE_SKILLS),
    ...buildReadinessAction(results.GET_CAREER_INSIGHTS),
  ];

  return items
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
    .slice(0, MAX_ACTION_PLAN_ITEMS);
};

export { buildCareerActionPlan };
