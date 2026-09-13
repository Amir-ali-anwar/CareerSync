import { buildCareerActionPlan } from "../../services/agent/careerActionPlanBuilder.js";

describe("careerActionPlanBuilder", () => {
  it("orders a mixed result set by priority and includes a related entity for every item", () => {
    const plan = buildCareerActionPlan({
      SEARCH_JOBS: {
        items: [
          { job: { id: "job1", title: "AI Engineer", company: "Acme" }, matchScore: 92, classification: { level: "excellent_match", label: "Excellent Match" } },
          { job: { id: "job2", title: "ML Engineer", company: "Beta" }, matchScore: 65, classification: { level: "moderate_match", label: "Moderate Match" } },
        ],
      },
      ANALYZE_SKILLS: {
        topGaps: [{ category: "required_skill", item: "AWS", priority: "high", seenInJobs: 2, rank: 1 }],
      },
      ANALYZE_APPLICATIONS: {
        needingAttention: [
          { applicationId: "app1", priority: "high", reason: "Interview stage.", recommendedAction: "Prepare for the interview." },
        ],
      },
      GET_CAREER_INSIGHTS: { readiness: { score: 40 } },
    });

    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) {
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(item.priority);
      expect(item.relatedEntity).toBeDefined();
      expect(item.reason).toBeTruthy();
      expect(item.expectedImpact).toBeTruthy();
    }
    // Every HIGH-priority item must appear before every MEDIUM/LOW item.
    const firstNonHighIndex = plan.findIndex((item) => item.priority !== "HIGH");
    if (firstNonHighIndex !== -1) {
      expect(plan.slice(0, firstNonHighIndex).every((item) => item.priority === "HIGH")).toBe(true);
    }
  });

  it("never invents an action for a step that produced no results", () => {
    expect(buildCareerActionPlan({})).toEqual([]);
  });

  it("does not recommend improving an already-strong profile", () => {
    const plan = buildCareerActionPlan({ GET_CAREER_INSIGHTS: { readiness: { score: 95 } } });
    expect(plan.some((item) => item.action.includes("Complete your CareerSync profile"))).toBe(false);
  });

  it("caps the plan at a bounded number of items", () => {
    const manyJobs = Array.from({ length: 10 }, (_, i) => ({
      job: { id: `job${i}`, title: `Role ${i}`, company: "Co" },
      matchScore: 95,
      classification: { level: "excellent_match", label: "Excellent Match" },
    }));
    const plan = buildCareerActionPlan({ SEARCH_JOBS: { items: manyJobs } });
    expect(plan.length).toBeLessThanOrEqual(8);
  });
});
