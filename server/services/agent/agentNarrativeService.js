import aiService from "../ai/index.js";
import logger from "../../utils/logger.js";

// Phase 10 - the only place an LLM is consulted in the whole agentic engine, and only
// for prose: every fact in `context` was already computed deterministically by the
// executor before this runs (see agentContextBuilder.js). If the AI call fails or times
// out (Phase 15's "LLM failure" case), this falls back to a deterministic template
// built from the same context - the workflow never fails because narration failed.
const deterministicSummary = (context) => {
  const parts = [];
  if (context.topMatches?.length) {
    const top = context.topMatches[0];
    parts.push(`Your strongest match is ${top.title} at ${top.company} (${top.matchScore}%).`);
  } else if (context.jobsFound === 0) {
    parts.push("No open jobs currently match your profile.");
  }
  if (context.topSkillGaps?.length) parts.push(`Focus on: ${context.topSkillGaps.slice(0, 3).join(", ")}.`);
  if (context.applications?.needingAttentionCount > 0) {
    parts.push(`${context.applications.needingAttentionCount} application(s) need attention.`);
  }
  if (context.readinessScore !== undefined) parts.push(`Profile readiness is ${context.readinessScore}%.`);
  if (context.interviewTarget) {
    parts.push(`Prepare for ${context.interviewTarget.title} at ${context.interviewTarget.company}.`);
  }
  if (!parts.length) parts.push("Here is your grounded career summary based on your current CareerSync data.");
  return parts.join(" ");
};

const generateNarrative = async (context) => {
  try {
    const { narrative } = await aiService.generateCareerNarrative(context);
    return { narrative, source: "ai" };
  } catch (error) {
    logger.warn("agent_narrative_fallback", { errorName: error.name, message: error.message });
    return { narrative: deterministicSummary(context), source: "deterministic_fallback" };
  }
};

export { generateNarrative, deterministicSummary };
