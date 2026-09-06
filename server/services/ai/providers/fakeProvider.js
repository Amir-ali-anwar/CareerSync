// Deterministic, dependency-free stand-in for a real AI provider. Used automatically
// whenever OPENAI_API_KEY isn't set (see ../index.js), so the entire resume/matching
// pipeline can be built, exercised, and tested end-to-end without any network call or
// API key - and so CI never depends on a paid external service. Never claims to produce
// real NLP-quality output; every method here is a documented heuristic.
import { KNOWN_SKILL_KEYWORDS, canonicalSkillName, normalizeSkillList, inferTitleAndSeniority } from "../../../utils/normalization.js";

const FAKE_EMBEDDING_DIM = 32;

// FNV-1a-style string hash, seeded so a handful of independent hash functions can spread
// each token's signal across multiple vector dimensions (a simplified "hashing trick").
const hashToken = (token, seed) => {
  let hash = 0x811c9dc5 ^ seed;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

// Bag-of-words embedding hashed into a fixed-size vector, L2-normalized. Texts that
// share more words land closer together under cosine similarity than texts that share
// none - not real semantic understanding, but enough structure to write meaningful
// tests of the matching engine's similarity component without a real embedding model.
const fakeEmbed = (text) => {
  const vector = new Array(FAKE_EMBEDDING_DIM).fill(0);
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  tokens.forEach((token) => {
    for (let seed = 0; seed < 3; seed++) {
      vector[hashToken(token, seed) % FAKE_EMBEDDING_DIM] += 1;
    }
  });

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
};

// Skill vocabulary + alias->canonical mapping now lives in utils/normalization.js,
// shared with JobProfile persistence and AIService.analyzeSkillGap - one alias table,
// not several drifting copies.
const extractSkillsHeuristic = (text) => {
  const lower = text.toLowerCase();
  const matches = KNOWN_SKILL_KEYWORDS.filter((keyword) => lower.includes(keyword)).map(canonicalSkillName);
  return normalizeSkillList(matches);
};

const extractExperienceYearsHeuristic = (text) => {
  const match = text.match(/(\d+)\+?\s*years?/i);
  return match ? Number(match[1]) : null;
};

const DEGREE_PATTERNS = [
  { pattern: /ph\.?d/i, degree: "PhD" },
  { pattern: /master'?s|m\.?sc|mba/i, degree: "Master's" },
  { pattern: /bachelor'?s|b\.?sc|b\.?tech|b\.?e\b/i, degree: "Bachelor's" },
];

const extractEducationHeuristic = (text) => {
  const found = DEGREE_PATTERNS.filter(({ pattern }) => pattern.test(text));
  return found.map(({ degree }) => ({ degree, field: null, institution: null, graduationYear: null }));
};

const DOMAIN_KEYWORDS = [
  ["fintech", "Fintech"], ["healthcare", "Healthcare"], ["health tech", "Healthcare"],
  ["e-commerce", "E-Commerce"], ["ecommerce", "E-Commerce"], ["edtech", "EdTech"],
  ["education", "Education"], ["saas", "SaaS"], ["gaming", "Gaming"],
  ["logistics", "Logistics"], ["insurance", "Insurance"], ["real estate", "Real Estate"],
  ["crypto", "Crypto"], ["blockchain", "Blockchain"], ["machine learning", "AI"], ["ai", "AI"],
  ["cybersecurity", "Cybersecurity"],
];

const extractDomainsHeuristic = (text) => {
  const lower = text.toLowerCase();
  const found = DOMAIN_KEYWORDS.filter(([keyword]) => lower.includes(keyword)).map(([, display]) => display);
  return [...new Set(found)];
};

// Not real NLP - a documented heuristic: lines/sentences containing a verb commonly
// used to phrase job responsibilities, capped so a wall of text doesn't dominate output.
const RESPONSIBILITY_VERBS =
  /\b(build|design|develop|maintain|lead|manage|own|collaborate|implement|architect|mentor|drive|deliver)\b/i;

const extractResponsibilitiesHeuristic = (text) => {
  const lines = text
    .split(/\n|•|- /)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.filter((line) => RESPONSIBILITY_VERBS.test(line) && line.length < 200).slice(0, 5);
};

const fakeProvider = {
  name: "fake",

  async generateEmbedding(text) {
    return { vector: fakeEmbed(text), model: "fake-hashing-embedding-v1", dimensions: FAKE_EMBEDDING_DIM, usage: null };
  },

  async extractResumeProfile(resumeText) {
    return {
      skills: extractSkillsHeuristic(resumeText),
      yearsOfExperience: extractExperienceYearsHeuristic(resumeText),
      education: extractEducationHeuristic(resumeText),
      certifications: [],
      domains: extractDomainsHeuristic(resumeText),
      usage: null,
    };
  },

  async extractJobProfile({ title = "", description = "" } = {}) {
    const { normalizedTitle, seniority } = inferTitleAndSeniority(title);
    const skills = extractSkillsHeuristic(description);
    return {
      normalizedTitle,
      seniority,
      skills,
      // The fake provider can't reliably distinguish "required" from "preferred" skills
      // in free text - both mirror the full extracted set. A real model-backed provider
      // can do better; this is a documented heuristic limitation, not a bug.
      requiredSkills: skills,
      preferredSkills: [],
      yearsOfExperience: extractExperienceYearsHeuristic(description),
      education: extractEducationHeuristic(description).map((entry) => entry.degree),
      certifications: [],
      domains: extractDomainsHeuristic(description),
      responsibilities: extractResponsibilitiesHeuristic(description),
      usage: null,
    };
  },

  async explainMatch(evidence) {
    const { matchedSkills = [], missingSkills = [], experienceMatch, workModeMatch, score } = evidence;
    const parts = [
      `This candidate scores ${score}% on this role.`,
      matchedSkills.length
        ? `They match on: ${matchedSkills.join(", ")}.`
        : "No listed required skills were matched.",
      missingSkills.length ? `Missing: ${missingSkills.join(", ")}.` : "No required skills are missing.",
      `Experience requirement: ${experienceMatch ? "met" : "not met"}.`,
      `Work mode: ${workModeMatch ? "matches the candidate's preference" : "does not match the candidate's preference"}.`,
    ];
    return { explanation: parts.join(" "), usage: null };
  },

  async generateSkillGapSuggestions(missingSkills) {
    if (!missingSkills.length) {
      return { suggestions: "No skill gaps identified for this role.", usage: null };
    }
    return {
      suggestions: `Consider building experience with: ${missingSkills.join(", ")} to strengthen this application.`,
      usage: null,
    };
  },
};

export default fakeProvider;
