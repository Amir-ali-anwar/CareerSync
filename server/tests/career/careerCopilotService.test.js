import { classifyApplicationHealth, detectIntent, buildSkillGapFrequency } from "../../services/career/careerCopilotService.js";

describe("career copilot deterministic services", () => {
  const application = { status: "pending", appliedAt: new Date("2026-01-01") };

  it("prioritizes an old strong application for follow-up", () => {
    const result = classifyApplicationHealth({
      application,
      match: { matchScore: 92 },
      now: new Date("2026-01-16"),
    });
    expect(result.priority).toBe("high");
    expect(result.recommendedAction).toMatch(/follow/i);
    expect(result.reason).toMatch(/15 days/i);
  });

  it("prioritizes interview applications for preparation", () => {
    const result = classifyApplicationHealth({
      application: { ...application, status: "interview" },
      match: { matchScore: 40 },
      now: new Date("2026-01-02"),
    });
    expect(result.priority).toBe("high");
    expect(result.recommendedAction).toMatch(/prepare/i);
  });

  it("does not invent action for rejected or withdrawn applications", () => {
    expect(classifyApplicationHealth({ application: { ...application, status: "rejected" }, match: null }).priority).toBe("low");
    expect(classifyApplicationHealth({ application: { ...application, status: "withdrawn" }, match: null }).recommendedAction).toMatch(/no action/i);
  });

  it.each([
    ["Which jobs should I apply to?", "JOB_RECOMMENDATION"],
    ["What skills should I learn?", "SKILL_GAP"],
    ["Which applications need follow-up?", "FOLLOW_UP"],
    ["What is my profile readiness?", "PROFILE"],
    ["Show my application status", "APPLICATION_STATUS"],
  ])("detects %s as %s", (message, intent) => {
    expect(detectIntent(message)).toBe(intent);
  });

  it("calculates missing-skill frequency from actual job/match evidence", () => {
    const gaps = buildSkillGapFrequency([
      { job: { requiredSkills: ["AWS", "React"] }, match: { missingRequiredSkills: ["AWS"] } },
      { job: { requiredSkills: ["AWS", "Python"] }, match: { missingRequiredSkills: ["AWS", "Python"] } },
    ]);
    expect(gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ skill: "AWS", jobs: 2, missing: 2, frequency: 100 }),
      expect.objectContaining({ skill: "Python", jobs: 1, missing: 1, frequency: 100 }),
    ]));
  });
});
