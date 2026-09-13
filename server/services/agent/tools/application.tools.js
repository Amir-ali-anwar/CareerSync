import mongoose from "mongoose";
import { buildCareerInsights } from "../../career/careerCopilotService.js";
import { AgentToolError } from "../agentToolError.js";

// application.tools - Application Agent (Phase 3 #4). Reuses Module I's
// careerCopilotService.buildCareerInsights (the only application-health/priority logic
// in this codebase) rather than re-deriving follow-up rules - see that module's
// classifyApplicationHealth for the actual priority/reason logic this returns.
const analyzeApplications = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("ANALYZE_APPLICATIONS", "invalid userId");
  const insights = await buildCareerInsights(userId);
  return insights.applications;
};

export { analyzeApplications };
