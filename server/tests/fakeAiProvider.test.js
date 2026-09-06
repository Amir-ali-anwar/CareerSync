import fakeProvider from "../services/ai/providers/fakeProvider.js";

const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
};

describe("fake AI provider (deterministic, no external dependency)", () => {
  describe("generateEmbedding", () => {
    it("is deterministic - the same text always produces the same vector", async () => {
      const a = await fakeProvider.generateEmbedding("React and Node.js developer");
      const b = await fakeProvider.generateEmbedding("React and Node.js developer");
      expect(a.vector).toEqual(b.vector);
    });

    it("produces a unit-length (L2-normalized) vector", async () => {
      const { vector } = await fakeProvider.generateEmbedding("Backend engineer");
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("scores texts sharing vocabulary as more similar than unrelated texts", async () => {
      const jobA = await fakeProvider.generateEmbedding("Senior React and TypeScript engineer, remote");
      const jobB = await fakeProvider.generateEmbedding("React TypeScript developer, remote friendly");
      const jobC = await fakeProvider.generateEmbedding("Warehouse forklift operator, night shift");

      const similarPairScore = cosineSimilarity(jobA.vector, jobB.vector);
      const dissimilarPairScore = cosineSimilarity(jobA.vector, jobC.vector);

      expect(similarPairScore).toBeGreaterThan(dissimilarPairScore);
    });
  });

  describe("extractResumeProfile", () => {
    it("extracts known skills mentioned in the text", async () => {
      const result = await fakeProvider.extractResumeProfile(
        "Built REST APIs with Node.js and Express, deployed on AWS using Docker."
      );
      expect(result.skills).toEqual(expect.arrayContaining(["Node.js", "Express", "AWS", "Docker"]));
    });

    it("extracts years of experience from a common phrasing", async () => {
      const result = await fakeProvider.extractResumeProfile("Software engineer with 7 years of experience.");
      expect(result.yearsOfExperience).toBe(7);
    });

    it("returns null years of experience when none is stated", async () => {
      const result = await fakeProvider.extractResumeProfile("Software engineer skilled in Python.");
      expect(result.yearsOfExperience).toBeNull();
    });

    it("extracts a recognizable degree level", async () => {
      const result = await fakeProvider.extractResumeProfile("Master's degree in Computer Science.");
      expect(result.education).toEqual(expect.arrayContaining([expect.objectContaining({ degree: "Master's" })]));
    });

    it("extracts a recognizable domain", async () => {
      const result = await fakeProvider.extractResumeProfile(
        "Backend engineer with 5 years building fintech payment systems."
      );
      expect(result.domains).toEqual(expect.arrayContaining(["Fintech"]));
    });

    it("returns an empty domains array when none is recognizable", async () => {
      const result = await fakeProvider.extractResumeProfile("Software engineer skilled in Python.");
      expect(result.domains).toEqual([]);
    });
  });

  describe("explainMatch", () => {
    it("mentions the score, matched skills, and missing skills", async () => {
      const { explanation } = await fakeProvider.explainMatch({
        score: 75,
        matchedSkills: ["React"],
        missingSkills: ["AWS"],
        experienceMatch: true,
        workModeMatch: false,
      });
      expect(explanation).toContain("75%");
      expect(explanation).toContain("React");
      expect(explanation).toContain("AWS");
    });
  });

  describe("generateSkillGapSuggestions", () => {
    it("returns a distinct message when there are no missing skills", async () => {
      const { suggestions } = await fakeProvider.generateSkillGapSuggestions([]);
      expect(suggestions).toMatch(/no skill gaps/i);
    });

    it("mentions each missing skill when there are gaps", async () => {
      const { suggestions } = await fakeProvider.generateSkillGapSuggestions(["AWS", "GraphQL"]);
      expect(suggestions).toContain("AWS");
      expect(suggestions).toContain("GraphQL");
    });
  });

  describe("extractJobProfile", () => {
    const JOB_DESCRIPTION =
      "We are looking for someone to build and maintain scalable APIs using React, Node.js, " +
      "and AWS. 5+ years of experience required. Bachelor's degree preferred. " +
      "This role is in the fintech domain.";

    it("normalizes the title and infers seniority", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Senior Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.normalizedTitle).toBe("software engineer");
      expect(result.seniority).toBe("senior");
    });

    it("extracts skills from the description", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.skills).toEqual(expect.arrayContaining(["React", "Node.js", "AWS"]));
      expect(result.requiredSkills).toEqual(result.skills);
    });

    it("extracts years of experience and education", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.yearsOfExperience).toBe(5);
      expect(result.education).toEqual(["Bachelor's"]);
    });

    it("extracts a recognizable domain", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.domains).toEqual(expect.arrayContaining(["Fintech"]));
    });

    it("extracts a responsibility sentence containing an action verb", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.responsibilities.length).toBeGreaterThan(0);
      expect(result.responsibilities[0].toLowerCase()).toMatch(/build|maintain/);
    });

    it("handles a title with no seniority signal without guessing a default", async () => {
      const result = await fakeProvider.extractJobProfile({
        title: "Software Engineer",
        description: JOB_DESCRIPTION,
      });
      expect(result.seniority).toBeNull();
    });

    it("handles a missing title/description gracefully", async () => {
      const result = await fakeProvider.extractJobProfile({});
      expect(result.normalizedTitle).toBeNull();
      expect(result.skills).toEqual([]);
      expect(result.yearsOfExperience).toBeNull();
    });
  });
});
