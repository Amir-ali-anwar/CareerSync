// Phase 11 - AgentContextBuilder. Collects ONLY the fields the narrative step actually
// needs from whatever the executor already computed - never raw database documents,
// resume text, or embeddings (Phase 12's "do not send raw database dumps to the LLM").
// This is the one object AgentNarrativeService is allowed to see.
const buildAgentContext = (analysis, results, recommendedActions) => {
  const context = {
    goal: analysis.goal,
    targetRole: analysis.targetRole,
  };

  if (results.SEARCH_JOBS) {
    context.jobsFound = results.SEARCH_JOBS.total;
    context.topMatches = results.SEARCH_JOBS.items.slice(0, 3).map((item) => ({
      title: item.job.title,
      company: item.job.company,
      matchScore: item.matchScore,
      matchLevel: item.classification?.label,
    }));
  }

  if (results.ANALYZE_SKILLS) {
    context.topSkillGaps = results.ANALYZE_SKILLS.topGaps.map((gap) => gap.item);
  }

  if (results.ANALYZE_APPLICATIONS) {
    context.applications = {
      total: results.ANALYZE_APPLICATIONS.total,
      active: results.ANALYZE_APPLICATIONS.active,
      needingAttentionCount: results.ANALYZE_APPLICATIONS.needingAttention.length,
    };
  }

  if (results.GET_CAREER_INSIGHTS) {
    context.readinessScore = results.GET_CAREER_INSIGHTS.readiness.score;
  }

  if (results.PREPARE_INTERVIEW?.available) {
    context.interviewTarget = {
      title: results.PREPARE_INTERVIEW.job.title,
      company: results.PREPARE_INTERVIEW.job.company,
      matchScore: results.PREPARE_INTERVIEW.matchScore,
      focusAreaCount: results.PREPARE_INTERVIEW.focusAreas.length,
    };
  }

  context.recommendedActionCount = recommendedActions.length;
  context.topActions = recommendedActions.slice(0, 3).map((action) => ({
    priority: action.priority,
    action: action.action,
  }));

  return context;
};

export { buildAgentContext };
