import { AIService } from "./aiService.js";
import openAiProvider from "./providers/openAiProvider.js";
import fakeProvider from "./providers/fakeProvider.js";
import logger from "../../utils/logger.js";

// Extracted as a pure function so provider-selection logic is testable without needing
// to reload this module with a different environment variable set.
const selectProvider = (hasApiKey) => (hasApiKey ? openAiProvider : fakeProvider);

// Provider selection happens once, here, based on whether a real API key is configured -
// callers never choose a provider themselves. No OPENAI_API_KEY means every AI-shaped
// operation in the app runs against deterministic, dependency-free fakes instead of
// silently failing or (worse) crashing the process on missing credentials.
const provider = selectProvider(Boolean(process.env.OPENAI_API_KEY));

if (provider === fakeProvider) {
  logger.warn("ai_service_running_in_fake_mode", {
    reason: "OPENAI_API_KEY is not set - all AI operations return deterministic placeholder results, not real model output.",
  });
}

const aiService = new AIService(provider);

export default aiService;
export { AIService, selectProvider };
