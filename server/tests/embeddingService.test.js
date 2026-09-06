import { AIService } from "../services/ai/aiService.js";
import fakeProvider from "../services/ai/providers/fakeProvider.js";
import { candidateEmbeddingText, jobEmbeddingText } from "../services/embeddings/embeddingTextBuilders.js";
import { cosineSimilarity } from "../services/embeddings/mongoVectorStore.js";

describe("embedding foundation", () => {
  it("uses deterministic fake embeddings with a stable dimension", async () => {
    const service = new AIService(fakeProvider);
    const first = await service.generateEmbedding("Senior React developer building real-time systems");
    const second = await service.generateEmbedding("Senior React developer building real-time systems");
    expect(first.vector).toEqual(second.vector);
    expect(first.vector).toHaveLength(first.dimensions);
    expect(first.vector.every(Number.isFinite)).toBe(true);
  });

  it("constructs stable, meaningful candidate and job representations", () => {
    const candidate = candidateEmbeddingText({ skills: ["React", "Node.js"], domains: ["Fintech"], yearsOfExperience: 6, education: [], certifications: [], preferredRoles: ["Full Stack Engineer"], resumeText: "Built real-time dashboards." });
    const job = jobEmbeddingText({ title: "Senior Frontend Engineer", requiredSkills: ["React"], preferredSkills: [], jobLocation: { city: "New York", country: "United States" }, description: "Build financial dashboards." }, { normalizedTitle: "frontend engineer", seniority: "senior", requiredSkills: [], preferredSkills: [], yearsOfExperience: 5, domains: ["Fintech"], responsibilities: ["Build real-time interfaces."] });
    expect(candidate).toContain("Skills: React, Node.js");
    expect(job).toContain("Required skills: React");
  });

  it("returns a bounded cosine score and rejects incompatible vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 0])).toBeNull();
  });
});