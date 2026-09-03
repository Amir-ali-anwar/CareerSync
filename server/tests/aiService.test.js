import { AIService, AITimeoutError, MalformedAIResponseError } from "../services/ai/aiService.js";
import { selectProvider } from "../services/ai/index.js";
import openAiProvider from "../services/ai/providers/openAiProvider.js";
import fakeProvider from "../services/ai/providers/fakeProvider.js";

describe("AIService", () => {
  describe("provider selection", () => {
    it("selects the fake provider when no API key is configured", () => {
      expect(selectProvider(false)).toBe(fakeProvider);
    });

    it("selects the real OpenAI provider when an API key is configured", () => {
      expect(selectProvider(true)).toBe(openAiProvider);
    });
  });

  describe("retry and timeout behavior", () => {
    it("retries a failing call and succeeds once the provider recovers", async () => {
      let attempts = 0;
      const flakyProvider = {
        name: "flaky",
        generateEmbedding: jest.fn(async () => {
          attempts += 1;
          if (attempts < 3) throw new Error("transient failure");
          return { vector: [1, 0], model: "flaky", dimensions: 2, usage: null };
        }),
      };
      const service = new AIService(flakyProvider);
      const result = await service.generateEmbedding("hello", { maxRetries: 2 });

      expect(attempts).toBe(3);
      expect(result.vector).toEqual([1, 0]);
    });

    it("throws the underlying error once retries are exhausted", async () => {
      const alwaysFailingProvider = {
        name: "broken",
        generateEmbedding: jest.fn(async () => {
          throw new Error("permanent failure");
        }),
      };
      const service = new AIService(alwaysFailingProvider);
      await expect(service.generateEmbedding("hello")).rejects.toThrow("permanent failure");
      // 1 initial attempt + DEFAULT_MAX_RETRIES(1) retry = 2 calls
      expect(alwaysFailingProvider.generateEmbedding).toHaveBeenCalledTimes(2);
    });

    it("rejects extractResumeProfile with MalformedAIResponseError when the provider returns a bad shape", async () => {
      const badShapeProvider = {
        name: "bad-shape",
        extractResumeProfile: jest.fn(async () => ({ skills: "React" /* should be an array */ })),
      };
      const service = new AIService(badShapeProvider);
      await expect(
        service.extractResumeProfile("some resume text", { maxRetries: 0 })
      ).rejects.toThrow(MalformedAIResponseError);
    });

    it("rejects extractJobProfile with MalformedAIResponseError when the provider returns a bad shape", async () => {
      const badShapeProvider = {
        name: "bad-shape",
        extractJobProfile: jest.fn(async () => ({ skills: [], requiredSkills: [], preferredSkills: [] /* missing education/certifications/domains/responsibilities */ })),
      };
      const service = new AIService(badShapeProvider);
      await expect(
        service.extractJobProfile({ title: "x", description: "y" }, { maxRetries: 0 })
      ).rejects.toThrow(MalformedAIResponseError);
    });

    it("times out a call that never resolves", async () => {
      const hangingProvider = {
        name: "hanging",
        generateEmbedding: () => new Promise(() => {}), // never resolves
      };
      const service = new AIService(hangingProvider);
      await expect(
        service.generateEmbedding("hello", { timeoutMs: 50 })
      ).rejects.toThrow(AITimeoutError);
    });
  });

  describe("analyzeSkillGap - deterministic computation, LLM only for suggestions", () => {
    it("computes missing skills deterministically without calling the provider for that part", async () => {
      const provider = {
        name: "spy",
        generateSkillGapSuggestions: jest.fn(async (missingSkills) => ({
          suggestions: `stub for ${missingSkills.length} skills`,
          usage: null,
        })),
      };
      const service = new AIService(provider);

      const result = await service.analyzeSkillGap(
        ["React", "Node.js"],
        ["react", "TypeScript", " Node.js "]
      );

      expect(result.missingSkills).toEqual(["TypeScript"]);
      expect(provider.generateSkillGapSuggestions).toHaveBeenCalledWith(["TypeScript"]);
      expect(result.suggestions).toBe("stub for 1 skills");
    });

    it("reports no missing skills when the candidate has everything required", async () => {
      const service = new AIService(fakeProvider);
      const result = await service.analyzeSkillGap(["React", "Node.js"], ["react", "node.js"]);
      expect(result.missingSkills).toEqual([]);
      expect(result.suggestions).toMatch(/no skill gaps/i);
    });
  });

  describe("pass-through methods against the fake provider", () => {
    const service = new AIService(fakeProvider);

    it("generateEmbedding returns a usable vector", async () => {
      const result = await service.generateEmbedding("Backend engineer with React experience");
      expect(Array.isArray(result.vector)).toBe(true);
      expect(result.vector.length).toBeGreaterThan(0);
    });

    it("extractResumeProfile returns the expected shape", async () => {
      const result = await service.extractResumeProfile(
        "Experienced React and Node.js developer with 5 years of experience. Bachelor's degree in Computer Science."
      );
      expect(result.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(result.yearsOfExperience).toBe(5);
      expect(result.education[0].degree).toBe("Bachelor's");
    });

    it("extractJobProfile returns the expected shape", async () => {
      const result = await service.extractJobProfile({
        title: "Senior Software Engineer",
        description: "Build APIs with React and Node.js. 5+ years of experience required.",
      });
      expect(result.normalizedTitle).toBe("software engineer");
      expect(result.seniority).toBe("senior");
      expect(result.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(result.yearsOfExperience).toBe(5);
    });

    it("explainMatch returns a non-empty explanation string", async () => {
      const result = await service.explainMatch({
        score: 87,
        matchedSkills: ["React", "TypeScript"],
        missingSkills: ["AWS"],
        experienceMatch: true,
        workModeMatch: true,
      });
      expect(typeof result.explanation).toBe("string");
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });
});
