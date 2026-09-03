import logger from "../../utils/logger.js";
import { normalizeSkillKey } from "../../utils/normalization.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 15_000;
const DEFAULT_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES) || 1;

class AITimeoutError extends Error {
  constructor(operation, timeoutMs) {
    super(`AI operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}

class MalformedAIResponseError extends Error {
  constructor(operation, reason) {
    super(`AI operation "${operation}" returned a malformed response: ${reason}`);
    this.name = "MalformedAIResponseError";
  }
}

// extractResumeProfile's contract is a specific structured shape (see Phase 4/5's Job
// and CandidateProfile schemas, which this feeds into) - validating it here, where the
// contract is defined, means every caller can trust the shape rather than re-checking it.
const validateResumeProfileShape = (result) => {
  if (!result || typeof result !== "object") return "response is not an object";
  if (!Array.isArray(result.skills)) return "skills is not an array";
  if (result.yearsOfExperience !== null && typeof result.yearsOfExperience !== "number") {
    return "yearsOfExperience is neither a number nor null";
  }
  if (!Array.isArray(result.education)) return "education is not an array";
  if (!Array.isArray(result.certifications)) return "certifications is not an array";
  if (!Array.isArray(result.domains)) return "domains is not an array";
  return null;
};

// extractJobProfile's contract - see JobProfileModel, which this feeds into.
const validateJobProfileShape = (result) => {
  if (!result || typeof result !== "object") return "response is not an object";
  if (result.normalizedTitle !== null && typeof result.normalizedTitle !== "string") {
    return "normalizedTitle is neither a string nor null";
  }
  if (result.seniority !== null && typeof result.seniority !== "string") {
    return "seniority is neither a string nor null";
  }
  if (!Array.isArray(result.skills)) return "skills is not an array";
  if (!Array.isArray(result.requiredSkills)) return "requiredSkills is not an array";
  if (!Array.isArray(result.preferredSkills)) return "preferredSkills is not an array";
  if (result.yearsOfExperience !== null && typeof result.yearsOfExperience !== "number") {
    return "yearsOfExperience is neither a number nor null";
  }
  if (!Array.isArray(result.education)) return "education is not an array";
  if (!Array.isArray(result.certifications)) return "certifications is not an array";
  if (!Array.isArray(result.domains)) return "domains is not an array";
  if (!Array.isArray(result.responsibilities)) return "responsibilities is not an array";
  return null;
};

const withTimeout = (promise, timeoutMs, operation) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new AITimeoutError(operation, timeoutMs)), timeoutMs)
    ),
  ]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every controller/pipeline call into an AI provider goes through here - never directly
 * through providers/*.js. This is the one place that enforces: a timeout, a bounded
 * number of retries, structured observability logging (operation/model/latency/
 * success/failure/retry count - NEVER the prompt or resume content itself, since that's
 * candidate PII), and a consistent error shape callers can handle uniformly.
 */
class AIService {
  constructor(provider) {
    this.provider = provider;
  }

  async #call(operation, fn, { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {}) {
    const startedAt = Date.now();
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await withTimeout(fn(), timeoutMs, operation);
        logger.info("ai_call_succeeded", {
          operation,
          provider: this.provider.name,
          latencyMs: Date.now() - startedAt,
          retryCount: attempt,
          usage: result?.usage || null,
        });
        return result;
      } catch (error) {
        lastError = error;
        logger.warn("ai_call_attempt_failed", {
          operation,
          provider: this.provider.name,
          attempt,
          errorName: error.name,
          message: error.message,
        });
        if (attempt < maxRetries) await sleep(2 ** attempt * 200);
      }
    }

    logger.error("ai_call_failed", {
      operation,
      provider: this.provider.name,
      latencyMs: Date.now() - startedAt,
      retries: maxRetries,
      errorName: lastError.name,
      message: lastError.message,
    });
    throw lastError;
  }

  generateEmbedding(text, options) {
    return this.#call("generateEmbedding", () => this.provider.generateEmbedding(text), options);
  }

  extractResumeProfile(resumeText, options) {
    return this.#call(
      "extractResumeProfile",
      async () => {
        const result = await this.provider.extractResumeProfile(resumeText);
        const shapeError = validateResumeProfileShape(result);
        if (shapeError) throw new MalformedAIResponseError("extractResumeProfile", shapeError);
        return result;
      },
      options
    );
  }

  explainMatch(evidence, options) {
    return this.#call("explainMatch", () => this.provider.explainMatch(evidence), options);
  }

  /**
   * jobInput: { title, description }. See services/job/jobIntelligenceService.js for
   * the orchestration (staleness detection, versioning, persistence) around this call.
   */
  extractJobProfile(jobInput, options) {
    return this.#call(
      "extractJobProfile",
      async () => {
        const result = await this.provider.extractJobProfile(jobInput);
        const shapeError = validateJobProfileShape(result);
        if (shapeError) throw new MalformedAIResponseError("extractJobProfile", shapeError);
        return result;
      },
      options
    );
  }

  /**
   * The missing-skills computation is deterministic and happens here, NOT inside the
   * provider - only the human-readable suggestion text comes from the AI provider. This
   * keeps "what's true" (which skills are missing) separate from "what the LLM says
   * about it" (see also services/matching, which applies the same rule to scoring).
   */
  async analyzeSkillGap(candidateSkills = [], requiredSkills = [], options) {
    const candidateSet = new Set(candidateSkills.map(normalizeSkillKey));
    const missingSkills = requiredSkills.filter((skill) => !candidateSet.has(normalizeSkillKey(skill)));

    const { suggestions, usage } = await this.#call(
      "analyzeSkillGap",
      () => this.provider.generateSkillGapSuggestions(missingSkills),
      options
    );

    return { missingSkills, suggestions, usage };
  }
}

export { AIService, AITimeoutError, MalformedAIResponseError };
